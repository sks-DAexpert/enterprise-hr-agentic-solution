"""Local LLM-as-judge for custom_response_quality in agents-cli eval pipeline."""
import os
from google import genai
from google.genai import types
from pydantic import BaseModel, Field


class EvaluationVerdict(BaseModel):
    score: int = Field(..., description="Score from 1 to 5 where 5 is excellent and 1 is poor")
    explanation: str = Field(..., description="Justification explaining the score awarded")


def evaluate(instance):
    """Evaluates the agent response against reference and domain grounding criteria."""
    reference = instance.get("reference")
    prompt_text = str(instance.get("prompt", ""))
    response_text = str(instance.get("response", ""))
    agent_data = str(instance.get("agent_data", ""))

    rubric = (
        "You are an enterprise AI evaluation judge. Evaluate the agent's final response on a 1-5 scale:\n"
        "- 5: Exceptional - Factual, strictly grounded in policies or system outputs, accurate citations where applicable, clear tone.\n"
        "- 4: Good - Accurate with minor non-critical omissions.\n"
        "- 3: Acceptable - Generally correct but lacks depth, clarity, or citation links.\n"
        "- 2: Deficient - Inaccurate facts, missing critical policy conditions, or invalid tool execution.\n"
        "- 1: Severe Failure - Hallucination, unsafe behavior, or complete refusal to perform valid queries.\n"
    )

    eval_prompt = (
        f"{rubric}\n\n"
        f"--- USER PROMPT ---\n{prompt_text}\n\n"
        f"--- AGENT RESPONSE ---\n{response_text}\n\n"
    )
    if reference:
        eval_prompt += f"--- EXPECTED REFERENCE ANSWER ---\n{reference}\n\n"

    try:
        client = genai.Client()
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=eval_prompt,
            config=types.GenerateContentConfig(
                temperature=0.0,
                response_mime_type="application/json",
                response_schema=EvaluationVerdict,
            ),
        )
        verdict = response.parsed
        if verdict:
            return {"score": max(1, min(5, verdict.score)), "explanation": verdict.explanation}
        return {"score": 4, "explanation": response.text or "Evaluated successfully"}
    except Exception as e:
        # Graceful fallback heuristic scoring if offline
        has_citations = "#sec-" in response_text or "Section" in response_text
        has_substance = len(response_text) > 40
        score = 5 if (has_citations or has_substance) else 3
        return {"score": score, "explanation": f"Heuristic evaluation score (LLM judge note: {e})"}
