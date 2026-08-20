"""Root ADK Agent implementation for Enterprise HR Agentic Solution (MVP 1)."""
import asyncio
from typing import AsyncGenerator, Optional

from google.adk.agents import Agent
from google.adk.apps import App
from google.adk.models import Gemini
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types

from app.config import LLM_MODEL
from app.prompt import SUPERVISOR_PROMPT
from app.tools.policy_tools import (
    search_policy_docs,
    read_policy_section,
    list_policy_sections,
)
from app.tools.validators import (
    mask_sensitive_pii,
    validate_pto_request,
    check_ticket_deduplication,
    validate_ticket_state_transition,
    check_ingress_safety,
)
from app.tools.mcp_tools import (
    get_workweek_toolset,
    get_serviceimmediately_toolset,
)

# Initialize MCP Toolsets
workweek_toolset = get_workweek_toolset()
serviceimmediately_toolset = get_serviceimmediately_toolset()

# Define Root Supervisor Agent
root_agent = Agent(
    name="enterprise_hr_supervisor",
    model=Gemini(
        model=LLM_MODEL,
        retry_options=types.HttpRetryOptions(attempts=3),
    ),
    instruction=SUPERVISOR_PROMPT,
    tools=[
        workweek_toolset,
        serviceimmediately_toolset,
        search_policy_docs,
        read_policy_section,
        list_policy_sections,
        validate_pto_request,
        check_ticket_deduplication,
        validate_ticket_state_transition,
    ],
)

# Export ADK App
app = App(
    root_agent=root_agent,
    name="app",
)


async def execute_query(
    prompt_text: str,
    user_id: str = "EMP-425",
    session_id: Optional[str] = None,
    session_service: Optional[InMemorySessionService] = None,
) -> str:
    """Helper function to execute an agent query programmatically."""
    # Safety Ingress Check
    is_safe, reason = check_ingress_safety(prompt_text)
    if not is_safe:
        return f"Safety Violation: {reason}"

    masked_prompt = mask_sensitive_pii(prompt_text)

    if session_service is None:
        session_service = InMemorySessionService()

    if session_id is None:
        session = await session_service.create_session(user_id=user_id, app_name="app")
        session_id = session.id

    runner = Runner(agent=root_agent, session_service=session_service, app_name="app")
    content = types.Content(
        role="user",
        parts=[types.Part.from_text(text=masked_prompt)],
    )

    final_response = ""
    async for event in runner.run_async(session_id=session_id, user_id=user_id, new_message=content):
        if hasattr(event, "content") and event.content and event.content.parts:
            for part in event.content.parts:
                if part.text:
                    final_response += part.text

    return final_response


def query_sync(prompt_text: str, user_id: str = "EMP-425") -> str:
    """Synchronous execution wrapper."""
    return asyncio.run(execute_query(prompt_text, user_id=user_id))
