"""Pre-Invocation Guardrails & Domain Validators for HR Agent.

Enforces SDD Functional Requirements:
- FR-1.3: Prompt injection & jailbreak detection
- FR-1.4: DLP masking for sensitive PII (NRIC/FIN, credit cards, bank accounts)
- FR-3.3 & FR-3.4: Pre-invocation PTO balance checks & date ordering
- FR-4.3: 15-minute duplicate ticket submission window hashing
- State machine transition validation for ServiceImmediately tickets
"""
import datetime
import hashlib
import re
import time
from typing import Any, Dict, List, Optional, Tuple

# Singapore NRIC / FIN Pattern: S/T/F/G/M followed by 7 digits and an alphabet
NRIC_PATTERN = re.compile(r"\b[STFGMstfgm]\d{7}[A-Za-z]\b")

# Credit Card Pattern: 13-16 digits with optional dashes/spaces
CREDIT_CARD_PATTERN = re.compile(r"\b(?:\d{4}[-\s]?){3}\d{4}\b|\b\d{15,16}\b")

# Bank Account Pattern (Generic 9-12 digits)
BANK_ACC_PATTERN = re.compile(r"\b\d{3}-\d{3}-\d{3,4}\b")

# In-memory ticket submission cache for deduplication (FR-4.3)
_TICKET_SUBMISSION_CACHE: Dict[str, float] = {}

# Allowed ServiceImmediately Ticket State Machine Transitions
VALID_TICKET_TRANSITIONS = {
    "New": {"In Progress", "Resolved", "Closed"},
    "In Progress": {"Resolved", "Closed"},
    "Resolved": {"In Progress", "Closed"},
    "Closed": set()  # Terminal state
}

# Injection patterns for ingress safety filter (FR-1.3)
INJECTION_PATTERNS = [
    re.compile(r"ignore\s+(all\s+)?(previous|prior)\s+instructions", re.IGNORECASE),
    re.compile(r"you\s+are\s+now\s+(unfiltered|dan|jailbreak)", re.IGNORECASE),
    re.compile(r"system\s*:\s*override", re.IGNORECASE),
    re.compile(r"disable\s+(all\s+)?(safety|guardrails|filters)", re.IGNORECASE),
]


def mask_sensitive_pii(text: str) -> str:
    """Masks sensitive PII such as Singapore NRIC/FIN and payment details (FR-1.4)."""
    if not text:
        return ""
    masked = NRIC_PATTERN.sub("[MASKED_NRIC_FIN]", text)
    masked = CREDIT_CARD_PATTERN.sub("[MASKED_CREDIT_CARD]", masked)
    masked = BANK_ACC_PATTERN.sub("[MASKED_BANK_ACCOUNT]", masked)
    return masked


def check_ingress_safety(prompt: str) -> Tuple[bool, str]:
    """Inspects incoming user prompt for injection attempts (FR-1.3).

    Returns:
        (is_safe: bool, reason: str)
    """
    for pattern in INJECTION_PATTERNS:
        if pattern.search(prompt):
            return False, "Prompt violates safety policies (Prompt Injection detected)."
    return True, ""


def validate_pto_request(
    start_date_str: str,
    end_date_str: str,
    leave_type: str,
    days: float,
    current_vacation_balance: float = 16.0,
    current_sick_balance: float = 10.0,
) -> Tuple[bool, str]:
    """Validates date ordering, positive duration, and available balance (FR-3.3).

    Returns:
        (is_valid: bool, error_message: str)
    """
    if days <= 0:
        return False, "Requested days must be a positive number greater than 0."

    if leave_type not in ["Vacation", "Sick"]:
        return False, f"Invalid leave type '{leave_type}'. Must be 'Vacation' or 'Sick'."

    try:
        start_date = datetime.date.fromisoformat(start_date_str)
        end_date = datetime.date.fromisoformat(end_date_str)
    except ValueError:
        return False, "Dates must be formatted in ISO format YYYY-MM-DD."

    if end_date < start_date:
        return False, f"End date ({end_date_str}) cannot be before start date ({start_date_str})."

    # Pre-invocation balance validation
    if leave_type == "Vacation" and days > current_vacation_balance:
        return (
            False,
            f"Insufficient Vacation balance: Requested {days} days, but only {current_vacation_balance} days available."
        )

    if leave_type == "Sick" and days > current_sick_balance:
        return (
            False,
            f"Insufficient Sick leave balance: Requested {days} days, but only {current_sick_balance} days available."
        )

    return True, "PTO request parameters are valid."


def check_ticket_deduplication(
    employee_id: str,
    category: str,
    short_description: str,
    window_seconds: int = 900  # 15 minutes window
) -> Tuple[bool, str]:
    """Enforces 15-minute duplicate ticket submission window protection (FR-4.3).

    Returns:
        (is_duplicate: bool, message: str)
    """
    now = time.time()
    # Normalize text for fingerprinting
    clean_desc = re.sub(r"\s+", " ", short_description.strip().lower())
    payload = f"{employee_id}:{category.lower()}:{clean_desc}"
    fingerprint = hashlib.sha256(payload.encode("utf-8")).hexdigest()

    # Clean expired records
    expired_keys = [k for k, ts in _TICKET_SUBMISSION_CACHE.items() if now - ts > window_seconds]
    for k in expired_keys:
        del _TICKET_SUBMISSION_CACHE[k]

    if fingerprint in _TICKET_SUBMISSION_CACHE:
        elapsed_min = int((now - _TICKET_SUBMISSION_CACHE[fingerprint]) / 60)
        return (
            True,
            f"Duplicate Ticket Prevention: An identical ticket in category '{category}' was already submitted "
            f"{elapsed_min} minute(s) ago within the 15-minute anti-duplication window. Please avoid submitting duplicate tickets."
        )

    _TICKET_SUBMISSION_CACHE[fingerprint] = now
    return False, "Ticket submission allowed."


def validate_ticket_state_transition(
    current_status: str,
    new_status: str
) -> Tuple[bool, str]:
    """Validates ServiceImmediately ticket state machine transitions."""
    if current_status not in VALID_TICKET_TRANSITIONS:
        return False, f"Unknown current ticket status: '{current_status}'"

    allowed = VALID_TICKET_TRANSITIONS[current_status]
    if new_status not in allowed:
        return (
            False,
            f"Illegal state transition: Ticket in state '{current_status}' cannot be moved to '{new_status}'. "
            f"Allowed next states: {sorted(list(allowed)) if allowed else 'None (Terminal state)'}."
        )

    return True, f"State transition from '{current_status}' to '{new_status}' is valid."
