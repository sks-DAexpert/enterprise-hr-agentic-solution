"""FastAPI App Server for Enterprise HR & ITSM Agentic Solution."""
import contextlib
import math
import os
import time
from collections.abc import AsyncIterator
from typing import Any, Dict, List, Optional

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

import google.auth
from google.adk.cli.fast_api import get_fast_api_app
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from app.agent import execute_query, root_agent
from app.app_utils import services
from app.app_utils.reasoning_engine_adapter import attach_reasoning_engine_routes
from app.app_utils.typing import Feedback
from app.tools.policy_tools import _load_sections, read_policy_section

load_dotenv()

otel_to_cloud = os.environ.get(
    "GOOGLE_CLOUD_AGENT_ENGINE_ENABLE_TELEMETRY", ""
).lower() in ("true", "1")

try:
    from google.cloud import logging as google_cloud_logging
    _, project_id = google.auth.default()
    logging_client = google_cloud_logging.Client()
    logger = logging_client.logger(__name__)
except Exception:
    logger = None

allow_origins = (
    os.getenv("ALLOW_ORIGINS", "").split(",") if os.getenv("ALLOW_ORIGINS") else ["*"]
)

AGENT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STATIC_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static")

# Shared Session Service for State Retention
GLOBAL_SESSION_SERVICE = InMemorySessionService()


class ChatRequest(BaseModel):
    prompt: str
    user_id: Optional[str] = "EMP-425"
    session_id: Optional[str] = None


class TicketCreateRequest(BaseModel):
    requested_by: str = "EMP-425"
    category: str
    short_description: str
    priority: str = "3 - Moderate"


@contextlib.asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    from app.agent import app as adk_app

    runner = Runner(
        app=adk_app,
        session_service=GLOBAL_SESSION_SERVICE,
        artifact_service=services.get_artifact_service(),
        auto_create_session=True,
    )
    app.state.runner = runner
    app.state.agent_app_name = adk_app.name
    yield


app: FastAPI = get_fast_api_app(
    agents_dir=AGENT_DIR,
    web=True,
    artifact_service_uri=services.ARTIFACT_SERVICE_URI,
    allow_origins=allow_origins,
    session_service_uri=services.SESSION_SERVICE_URI,
    otel_to_cloud=otel_to_cloud,
    lifespan=lifespan,
)

app.title = "Altostrat Enterprise HR & ITSM Assistant"
app.description = "API & Web Application for Altostrat Singapore Enterprise HR & ITSM Assistant"

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Proxy routes for Reasoning Engine SDK
attach_reasoning_engine_routes(app)

# Mount Static Files
if os.path.exists(STATIC_DIR):
    app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


# Root Web UI Route
@app.get("/")
@app.get("/portal")
async def serve_portal():
    index_file = os.path.join(STATIC_DIR, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    return {"message": "Altostrat Enterprise HR Agent API is running."}


# Health Probe for Cloud Run
@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "enterprise-hr-agent",
        "version": "2.0.0",
        "model": "gemini-2.5-flash",
        "region": "us-central1",
        "mcp_status": "connected"
    }


# Conversational Chat Endpoint
@app.post("/api/chat")
async def chat_endpoint(req: ChatRequest):
    start_t = time.perf_counter()
    prompt = req.prompt.strip()
    if not prompt:
        raise HTTPException(status_code=400, detail="Prompt text cannot be empty.")

    user_id = req.user_id or "EMP-425"
    session_id = req.session_id or f"sess_{int(time.time())}"

    # Ensure session exists in the service
    try:
        session = await GLOBAL_SESSION_SERVICE.get_session(
            session_id=session_id, user_id=user_id, app_name="app"
        )
    except Exception:
        session = None

    if session is None:
        session = await GLOBAL_SESSION_SERVICE.create_session(
            user_id=user_id, app_name="app"
        )
        session_id = session.id

    try:
        response_text = await execute_query(
            prompt_text=prompt,
            user_id=user_id,
            session_id=session_id,
            session_service=GLOBAL_SESSION_SERVICE,
        )
    except Exception as e:
        response_text = f"An error occurred while processing your request: {str(e)}"

    duration = round(time.perf_counter() - start_t, 3)
    in_tokens = max(1, math.ceil(len(prompt) / 4))
    out_tokens = max(1, math.ceil(len(response_text) / 4))

    return {
        "status": "success",
        "session_id": session_id,
        "user_id": user_id,
        "response": response_text,
        "input_tokens": in_tokens,
        "output_tokens": out_tokens,
        "duration_seconds": duration,
    }


# Employee Profile Info
@app.get("/api/profile")
async def get_profile(employee_id: str = "EMP-425"):
    return {
        "employee_id": employee_id,
        "name": "John Doe",
        "title": "Senior Staff Software Engineer",
        "department": "Core Engineering & Cloud Architecture",
        "location": "Singapore HQ (80 Pasir Panjang Rd)",
        "work_arrangement": "Hybrid (Approved)",
        "phone": "+65 9123 4567",
        "email": "john.doe@altostrat.com"
    }


# WorkWeek Live Leave Balances
@app.get("/api/balances")
async def get_balances(employee_id: str = "EMP-425"):
    return {
        "employee_id": employee_id,
        "vacation_days": 12.0,
        "sick_days": 10.0,
        "floating_holidays": 1.0,
        "max_vacation": 20.0,
        "max_sick": 14.0
    }


# ServiceImmediately Active Tickets
@app.get("/api/tickets")
async def get_tickets(requested_by: str = "EMP-425"):
    return [
        {
            "ticket_id": "INC0003218",
            "category": "Hardware",
            "short_description": "Broken laptop screen and display flickering",
            "priority": "2 - High",
            "status": "New",
            "requested_by": requested_by
        },
        {
            "ticket_id": "INC0003201",
            "category": "Software",
            "short_description": "Cloud VPN TLS certificate renewal for Singapore office",
            "priority": "3 - Moderate",
            "status": "Resolved",
            "requested_by": requested_by
        }
    ]


# Policy Handbook Sections Catalog
@app.get("/api/policies")
async def get_policies():
    sections = _load_sections()
    catalog = []
    for s in sections:
        catalog.append({
            "section_id": s.get("id", ""),
            "title": s.get("title", ""),
            "category": s.get("category", "General"),
            "content": s.get("content", ""),
            "page": s.get("page", 1)
        })
    return catalog


# Specific Policy Section Excerpt
@app.get("/api/policy/{section_id}")
async def get_policy_by_id(section_id: str):
    clean_id = section_id.replace("sec-", "").strip()
    sections = _load_sections()
    for s in sections:
        if s["id"] == clean_id:
            return {
                "section_id": s["id"],
                "title": s["title"],
                "category": s["category"],
                "content": s["content"],
                "page": s.get("page", 1)
            }
    raise HTTPException(status_code=404, detail=f"Policy section '{section_id}' not found.")


@app.post("/feedback")
def collect_feedback(feedback: Feedback) -> dict[str, str]:
    """Collect and log feedback."""
    if logger:
        logger.log_struct(feedback.model_dump(), severity="INFO")
    return {"status": "success"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)
