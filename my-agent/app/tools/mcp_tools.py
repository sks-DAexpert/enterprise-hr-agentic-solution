"""FastMCP Toolset Initializer & Connectors for WorkWeek and ServiceImmediately.

Connects to enterprise mock SaaS backend via Streamable HTTP with X-MCP-Token authentication.
"""
from typing import Dict, Any, Optional
from google.adk.tools.mcp_tool.mcp_toolset import McpToolset, StreamableHTTPConnectionParams

from app.config import WORKWEEK_MCP_URL, SERVICEIMMEDIATELY_MCP_URL, MCP_AUTH_TOKEN

_WORKWEEK_TOOLSET: Optional[McpToolset] = None
_SERVICEIMMEDIATELY_TOOLSET: Optional[McpToolset] = None


def get_workweek_toolset() -> McpToolset:
    """Returns the MCP Toolset configured for WorkWeek HCM."""
    global _WORKWEEK_TOOLSET
    if _WORKWEEK_TOOLSET is None:
        params = StreamableHTTPConnectionParams(
            url=WORKWEEK_MCP_URL,
            headers={"X-MCP-Token": MCP_AUTH_TOKEN}
        )
        _WORKWEEK_TOOLSET = McpToolset(connection_params=params)
    return _WORKWEEK_TOOLSET


def get_serviceimmediately_toolset() -> McpToolset:
    """Returns the MCP Toolset configured for ServiceImmediately ITSM."""
    global _SERVICEIMMEDIATELY_TOOLSET
    if _SERVICEIMMEDIATELY_TOOLSET is None:
        params = StreamableHTTPConnectionParams(
            url=SERVICEIMMEDIATELY_MCP_URL,
            headers={"X-MCP-Token": MCP_AUTH_TOKEN}
        )
        _SERVICEIMMEDIATELY_TOOLSET = McpToolset(connection_params=params)
    return _SERVICEIMMEDIATELY_TOOLSET
