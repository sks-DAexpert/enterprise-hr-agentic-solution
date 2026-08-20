"""Enterprise HR Agent Configuration."""
import os
from pathlib import Path

# Base Paths
APP_DIR = Path(__file__).resolve().parent
PROJECT_DIR = APP_DIR.parent
KNOWLEDGE_DIR = APP_DIR / "knowledge"
POLICY_JSON_PATH = KNOWLEDGE_DIR / "policy_sections.json"

# MCP Server Endpoints & Authentication
WORKWEEK_MCP_URL = os.getenv(
    "WORKWEEK_MCP_URL",
    "https://mock-saas.aishprabhat.demo.altostrat.com/work-week/mcp/",
)
SERVICEIMMEDIATELY_MCP_URL = os.getenv(
    "SERVICEIMMEDIATELY_MCP_URL",
    "https://mock-saas.aishprabhat.demo.altostrat.com/service-immediately/mcp/",
)
MCP_AUTH_TOKEN = os.getenv(
    "MCP_AUTH_TOKEN",
    "mcp_HB5laIVgmXjfFK7zBfDPQWixOs3QG0IdUm_goLxRwPY",
)

# Default Authenticated Employee
DEFAULT_EMPLOYEE_ID = os.getenv("DEFAULT_EMPLOYEE_ID", "EMP-425")

# Model Configuration
LLM_MODEL = os.getenv("LLM_MODEL", "gemini-2.5-flash")
