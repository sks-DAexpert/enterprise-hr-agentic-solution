"""HR Policy Retrieval Tools for Altostrat Singapore Employee Handbook.

Provides grounded semantic and keyword retrieval over policy documents,
enforcing strict confidence thresholds (FR-5.2) and deep-link citation formatting (FR-5.3).
"""
import json
import math
import os
import re
from typing import Any, Dict, List, Optional
from app.config import POLICY_JSON_PATH

_POLICY_SECTIONS: Optional[List[Dict[str, Any]]] = None

STOPWORDS = {
    "a", "about", "above", "after", "again", "against", "all", "am", "an", "and",
    "any", "are", "aren't", "as", "at", "be", "because", "been", "before", "being",
    "below", "between", "both", "but", "by", "can't", "cannot", "could", "couldn't",
    "did", "didn't", "do", "does", "doesn't", "doing", "don't", "down", "during",
    "each", "few", "for", "from", "further", "had", "hadn't", "has", "hasn't",
    "have", "haven't", "having", "he", "he'd", "he'll", "he's", "her", "here",
    "here's", "hers", "herself", "him", "himself", "his", "how", "how's", "i",
    "i'd", "i'll", "i'm", "i've", "if", "in", "into", "is", "isn't", "it", "it's",
    "its", "itself", "let's", "me", "more", "most", "mustn't", "my", "myself",
    "no", "nor", "not", "of", "off", "on", "once", "only", "or", "other", "ought",
    "our", "ours", "ourselves", "out", "over", "own", "same", "shan't", "she",
    "she'd", "she'll", "she's", "should", "shouldn't", "so", "some", "such",
    "than", "that", "that's", "the", "their", "theirs", "them", "themselves",
    "then", "there", "there's", "these", "they", "they'd", "they'll", "they're",
    "they've", "this", "those", "through", "to", "too", "under", "until", "up",
    "very", "was", "wasn't", "we", "we'd", "we'll", "we're", "we've", "were",
    "weren't", "what", "what's", "when", "when's", "where", "where's", "which",
    "while", "who", "who's", "whom", "why", "why's", "with", "won't", "would",
    "wouldn't", "you", "you'd", "you'll", "you're", "you've", "your", "yours",
    "yourself", "yourselves", "tell", "show", "give", "know", "much", "many"
}

GENERIC_WORDS = {
    "work", "company", "employee", "employees", "policy", "policies", "rules",
    "guidelines", "singapore", "altostrat", "support", "request", "please",
    "can", "take", "bring", "use", "make", "need", "get", "like"
}


def _load_sections() -> List[Dict[str, Any]]:
    global _POLICY_SECTIONS
    if _POLICY_SECTIONS is None:
        if os.path.exists(POLICY_JSON_PATH):
            with open(POLICY_JSON_PATH, "r", encoding="utf-8") as f:
                _POLICY_SECTIONS = json.load(f)
        else:
            _POLICY_SECTIONS = []
    return _POLICY_SECTIONS


def _tokenize(text: str) -> List[str]:
    tokens = re.findall(r"\b[a-zA-Z0-9_\-\.]+\b", text.lower())
    return [t for t in tokens if t not in STOPWORDS and len(t) > 1]


def _compute_relevance(query_tokens: List[str], doc: Dict[str, Any]) -> float:
    """Compute BM25-style lexical relevance with title and section boosting."""
    if not query_tokens:
        return 0.0

    title_tokens = set(_tokenize(doc.get("title", "")))
    content_tokens = _tokenize(doc.get("content", ""))
    sec_id = doc.get("id", "").lower()
    category_tokens = set(_tokenize(doc.get("category", "")))

    content_tf: Dict[str, int] = {}
    for t in content_tokens:
        content_tf[t] = content_tf.get(t, 0) + 1

    doc_len = len(content_tokens) + 1
    avg_len = 120.0
    k1 = 1.2
    b = 0.75

    score = 0.0
    matched_query_terms = 0

    for q in query_tokens:
        matched = False
        term_weight = 0.5 if q in GENERIC_WORDS else 1.0

        if q == sec_id or q == f"sec-{sec_id}" or f"section {sec_id}" in q:
            score += 15.0 * term_weight
            matched = True

        if q in title_tokens:
            score += 5.0 * term_weight
            matched = True

        if q in category_tokens:
            score += 2.0 * term_weight
            matched = True

        tf = content_tf.get(q, 0)
        if tf > 0:
            bm25_tf = (tf * (k1 + 1)) / (tf + k1 * (1 - b + b * (doc_len / avg_len)))
            score += bm25_tf * term_weight
            matched = True

        if matched:
            matched_query_terms += 1

    non_generic_query = [q for q in query_tokens if q not in GENERIC_WORDS]
    if non_generic_query:
        non_generic_matches = sum(1 for q in non_generic_query if q in title_tokens or content_tf.get(q, 0) > 0 or q in category_tokens)
        coverage = non_generic_matches / len(non_generic_query)
    else:
        coverage = matched_query_terms / len(query_tokens)

    if coverage < 0.35 and len(query_tokens) > 2:
        return 0.0

    final_score = score * (coverage ** 1.5)
    return final_score


def search_policy_docs(query: str, max_results: int = 3) -> str:
    """Searches the official Altostrat Singapore Employee Policy Handbook.

    Use this tool whenever an employee asks questions regarding company policies,
    such as PTO, sick leave, medical certificates, maternity/paternity leave,
    work hours, remote work, code of conduct, probation, benefits, or termination.

    Args:
        query: The natural language policy question or keywords to search for.
        max_results: Maximum number of relevant policy sections to return (default 3).

    Returns:
        A grounded markdown string containing relevant policy excerpts and citations,
        or a standard message if no matching policy is found.
    """
    sections = _load_sections()
    if not sections:
        return "Policy database is currently unavailable. Please contact People Operations."

    query_tokens = _tokenize(query)
    if not query_tokens:
        return "Please provide specific policy terms or questions to search the Employee Handbook."

    scored_sections = []
    for s in sections:
        rel = _compute_relevance(query_tokens, s)
        if rel > 0:
            scored_sections.append((rel, s))

    scored_sections.sort(key=lambda x: x[0], reverse=True)

    if not scored_sections:
        return (
            "I could not find any official policy in the Altostrat Singapore Employee Handbook "
            f"addressing '{query}'. This appears to be outside our documented HR policies. "
            "Please contact People Operations (hr-singapore@altostrat.com) for assistance."
        )

    top_score = scored_sections[0][0]
    if top_score < 0.25:
        return (
            "I could not find a sufficiently confident policy match in the Altostrat Singapore Handbook. "
            "Please reach out directly to People Operations for guidance."
        )

    results = []
    for score, doc in scored_sections[:max_results]:
        results.append(
            f"### [{doc['category']} - Section {doc['id']}: {doc['title']}](#sec-{doc['id']})\n"
            f"*Citation: `[Section {doc['id']}: {doc['title']}](#sec-{doc['id']})` | Page: {doc.get('page', 'N/A')}*\n\n"
            f"{doc['content']}\n"
        )

    return "\n---\n".join(results)


def read_policy_section(section_id: str) -> str:
    """Retrieves the complete text for a specific section of the Employee Policy Handbook.

    Args:
        section_id: The section number (e.g. '12.2', '34.4', or 'sec-12.2').

    Returns:
        The full text of the section with citation metadata.
    """
    clean_id = section_id.replace("sec-", "").strip()
    sections = _load_sections()

    for s in sections:
        if s["id"] == clean_id:
            return (
                f"### [{s['category']} - Section {s['id']}: {s['title']}](#sec-{s['id']})\n"
                f"*Citation: `[Section {s['id']}: {s['title']}](#sec-{s['id']})` | Page: {s.get('page', 'N/A')}*\n\n"
                f"{s['content']}"
            )

    return f"Section '{section_id}' was not found in the Altostrat Singapore Employee Handbook."


def list_policy_sections() -> str:
    """Lists all available policy sections and categories in the Employee Handbook."""
    sections = _load_sections()
    if not sections:
        return "No policy sections loaded."

    categories: Dict[str, List[str]] = {}
    for s in sections:
        cat = s["category"]
        if cat not in categories:
            categories[cat] = []
        categories[cat].append(f"Section {s['id']}: {s['title']}")

    lines = ["# Altostrat Singapore Employee Policy Handbook Table of Contents\n"]
    for cat, items in categories.items():
        lines.append(f"## {cat}")
        for item in items:
            lines.append(f"- {item}")
        lines.append("")

    return "\n".join(lines)
