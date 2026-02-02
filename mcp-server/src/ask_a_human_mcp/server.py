"""MCP Server for Ask-a-Human.

This module implements the MCP server that exposes ask_human and
check_human_responses tools for use in Cursor, Claude Desktop, etc.
"""

from __future__ import annotations

import os
import sys
from typing import Any

import anyio
import click
import mcp.types as types
from mcp.server.lowlevel import Server

from ask_a_human import AskHumanClient

from .tools import get_tool_definitions, handle_tool_call


def create_server() -> tuple[Server, AskHumanClient]:
    """Create and configure the MCP server.

    Returns:
        Tuple of (Server, AskHumanClient).

    Raises:
        ValueError: If ASK_A_HUMAN_AGENT_ID is not set.
    """
    # Get configuration from environment
    agent_id = os.environ.get("ASK_A_HUMAN_AGENT_ID")
    if not agent_id:
        raise ValueError(
            "ASK_A_HUMAN_AGENT_ID environment variable is required. "
            "Set it to your agent identifier."
        )

    base_url = os.environ.get("ASK_A_HUMAN_BASE_URL", "https://api.ask-a-human.com")

    # Create client
    client = AskHumanClient(base_url=base_url, agent_id=agent_id)

    # Create server
    server = Server("ask-a-human")

    @server.list_tools()
    async def list_tools() -> list[types.Tool]:
        """List available tools."""
        return get_tool_definitions()

    @server.call_tool()
    async def call_tool(name: str, arguments: dict[str, Any]) -> list[types.ContentBlock]:
        """Handle tool calls."""
        return await handle_tool_call(client, name, arguments)

    return server, client


@click.command()
@click.option("--port", default=8000, help="Port to listen on for SSE transport")
@click.option(
    "--transport",
    type=click.Choice(["stdio", "sse"]),
    default="stdio",
    help="Transport type (stdio for CLI, sse for web)",
)
def main(port: int, transport: str) -> int:
    """Run the Ask-a-Human MCP server.

    The server exposes two tools:
    - ask_human: Submit a question for humans to answer
    - check_human_responses: Check status and get responses

    Configure with environment variables:
    - ASK_A_HUMAN_AGENT_ID (required): Your agent identifier
    - ASK_A_HUMAN_BASE_URL (optional): API base URL
    """
    try:
        server, client = create_server()
    except ValueError as e:
        click.echo(f"Error: {e}", err=True)
        return 1

    try:
        if transport == "sse":
            # SSE transport for web-based clients
            try:
                from mcp.server.sse import SseServerTransport
                from starlette.applications import Starlette
                from starlette.requests import Request
                from starlette.responses import Response
                from starlette.routing import Mount, Route
            except ImportError:
                click.echo(
                    "SSE transport requires additional dependencies. "
                    "Install with: pip install ask-a-human-mcp[sse]",
                    err=True,
                )
                return 1

            sse = SseServerTransport("/messages/")

            async def handle_sse(request: Request) -> Response:
                async with sse.connect_sse(
                    request.scope, request.receive, request._send  # type: ignore[reportPrivateUsage]
                ) as streams:
                    await server.run(streams[0], streams[1], server.create_initialization_options())
                return Response()

            starlette_app = Starlette(
                debug=True,
                routes=[
                    Route("/sse", endpoint=handle_sse, methods=["GET"]),
                    Mount("/messages/", app=sse.handle_post_message),
                ],
            )

            import uvicorn

            click.echo(f"Starting SSE server on http://127.0.0.1:{port}")
            uvicorn.run(starlette_app, host="127.0.0.1", port=port)

        else:
            # Stdio transport (default)
            from mcp.server.stdio import stdio_server

            async def arun() -> None:
                async with stdio_server() as streams:
                    await server.run(streams[0], streams[1], server.create_initialization_options())

            anyio.run(arun)

    finally:
        client.close()

    return 0


if __name__ == "__main__":
    sys.exit(main())
