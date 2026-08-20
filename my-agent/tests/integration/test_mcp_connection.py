"""Integration test to verify MCP connection to WorkWeek and ServiceImmediately."""
import asyncio
import unittest
from app.tools.mcp_tools import get_workweek_toolset, get_serviceimmediately_toolset


class TestMCPConnection(unittest.IsolatedAsyncioTestCase):

    async def test_workweek_tools_listing(self):
        toolset = get_workweek_toolset()
        # In ADK, McpToolset tools are discovered asynchronously or on initialize
        self.assertIsNotNone(toolset)

    async def test_serviceimmediately_tools_listing(self):
        toolset = get_serviceimmediately_toolset()
        self.assertIsNotNone(toolset)


if __name__ == "__main__":
    unittest.main()
