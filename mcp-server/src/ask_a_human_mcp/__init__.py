"""Ask-a-Human MCP Server.

MCP tool server for integrating Ask-a-Human into Cursor, Claude Desktop,
and other MCP-compatible clients.

Usage:
    python -m ask_a_human_mcp
    # or
    ask-a-human-mcp
"""

from ask_a_human_mcp.server import main

__version__ = "0.1.0"

__all__ = ["main"]
