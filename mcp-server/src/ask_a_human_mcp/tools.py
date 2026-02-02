"""MCP tool definitions for Ask-a-Human.

This module defines the JSON schemas and implementations for the
ask_human and check_human_responses tools.
"""

from typing import Any

import mcp.types as types

from ask_a_human import AskHumanClient
from ask_a_human.exceptions import AskHumanError
from ask_a_human.types import AudienceTag, QuestionType

# Tool names
ASK_HUMAN_TOOL = "ask_human"
CHECK_RESPONSES_TOOL = "check_human_responses"


def get_tool_definitions() -> list[types.Tool]:
    """Get the list of available tools.

    Returns:
        List of MCP Tool definitions.
    """
    return [
        types.Tool(
            name=ASK_HUMAN_TOOL,
            description=(
                "Request human input when you're uncertain, the decision involves subjective judgment, "
                "or you need a reality check on your assumptions. Humans will provide their opinions "
                "asynchronously - this tool returns immediately and you should poll for responses "
                "using check_human_responses."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "question": {
                        "type": "string",
                        "description": "The question to ask humans. Be specific and provide context.",
                    },
                    "type": {
                        "type": "string",
                        "enum": ["text", "multiple_choice"],
                        "default": "text",
                        "description": "Type of response: 'text' for open-ended, 'multiple_choice' for predefined options",
                    },
                    "options": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Options for multiple choice questions (2-10 items). Required if type is 'multiple_choice'.",
                    },
                    "audience": {
                        "type": "array",
                        "items": {
                            "type": "string",
                            "enum": ["technical", "product", "ethics", "creative", "general"],
                        },
                        "default": ["general"],
                        "description": "Target audience for the question",
                    },
                    "min_responses": {
                        "type": "number",
                        "minimum": 1,
                        "maximum": 50,
                        "default": 5,
                        "description": "Minimum number of human responses needed",
                    },
                    "timeout_seconds": {
                        "type": "number",
                        "minimum": 60,
                        "maximum": 86400,
                        "default": 3600,
                        "description": "How long to wait for responses (in seconds)",
                    },
                },
                "required": ["question"],
            },
        ),
        types.Tool(
            name=CHECK_RESPONSES_TOOL,
            description="Check the status and responses for a previously submitted human question.",
            inputSchema={
                "type": "object",
                "properties": {
                    "question_id": {
                        "type": "string",
                        "description": "The question_id returned from ask_human",
                    },
                },
                "required": ["question_id"],
            },
        ),
    ]


async def handle_ask_human(client: AskHumanClient, arguments: dict[str, Any]) -> list[types.ContentBlock]:
    """Handle the ask_human tool call.

    Args:
        client: The AskHumanClient to use.
        arguments: Tool arguments from MCP.

    Returns:
        List of content blocks with the result.
    """
    # Extract and validate arguments
    question = arguments.get("question")
    if not question:
        return [types.TextContent(type="text", text="Error: 'question' is required")]

    question_type: QuestionType = arguments.get("type", "text")
    options: list[str] | None = arguments.get("options")
    audience: list[AudienceTag] | None = arguments.get("audience")
    min_responses: int = arguments.get("min_responses", 5)
    timeout_seconds: int = arguments.get("timeout_seconds", 3600)

    # Validate multiple choice
    if question_type == "multiple_choice" and not options:
        return [types.TextContent(type="text", text="Error: 'options' is required for multiple_choice questions")]

    try:
        # Submit the question
        result = client.submit_question(
            prompt=question,
            type=question_type,
            options=options,
            audience=audience,
            min_responses=min_responses,
            timeout_seconds=timeout_seconds,
        )

        # Format response
        response_text = f"""Question submitted successfully!

**Question ID:** {result.question_id}
**Status:** {result.status}
**Expires at:** {result.expires_at}

To check for responses, use the `check_human_responses` tool with question_id: {result.question_id}

Note: Humans will respond asynchronously. Check back in a few minutes to see responses."""

        return [types.TextContent(type="text", text=response_text)]

    except AskHumanError as e:
        return [types.TextContent(type="text", text=f"Error: {e}")]


async def handle_check_responses(client: AskHumanClient, arguments: dict[str, Any]) -> list[types.ContentBlock]:
    """Handle the check_human_responses tool call.

    Args:
        client: The AskHumanClient to use.
        arguments: Tool arguments from MCP.

    Returns:
        List of content blocks with the result.
    """
    question_id = arguments.get("question_id")
    if not question_id:
        return [types.TextContent(type="text", text="Error: 'question_id' is required")]

    try:
        # Get question status
        response = client.get_question(question_id)

        # Format response based on question type
        lines = [
            f"**Question ID:** {response.question_id}",
            f"**Status:** {response.status}",
            f"**Question:** {response.prompt}",
            f"**Type:** {response.type}",
            f"**Responses:** {response.current_responses}/{response.required_responses}",
            "",
        ]

        if response.options:
            lines.append("**Options:**")
            for i, opt in enumerate(response.options):
                lines.append(f"  {i}. {opt}")
            lines.append("")

        if response.responses:
            lines.append("**Human Responses:**")
            for i, r in enumerate(response.responses, 1):
                if r.answer:
                    lines.append(f"  {i}. {r.answer}")
                    if r.confidence:
                        lines.append(f"     (Confidence: {r.confidence}/5)")
                elif r.selected_option is not None and response.options:
                    option_text = response.options[r.selected_option]
                    lines.append(f"  {i}. Selected: {option_text}")
                    if r.confidence:
                        lines.append(f"     (Confidence: {r.confidence}/5)")
            lines.append("")

        if response.summary:
            lines.append("**Vote Summary:**")
            for option, count in response.summary.items():
                lines.append(f"  {option}: {count} votes")
            lines.append("")

        # Add status-specific message
        if response.status == "OPEN":
            lines.append("_Waiting for responses. Check again later._")
        elif response.status == "PARTIAL":
            lines.append("_Some responses received. More may come. You can proceed with partial results or wait._")
        elif response.status == "CLOSED":
            lines.append("_All responses received. Question is complete._")
        elif response.status == "EXPIRED":
            lines.append("_Question expired before receiving enough responses._")

        return [types.TextContent(type="text", text="\n".join(lines))]

    except AskHumanError as e:
        return [types.TextContent(type="text", text=f"Error: {e}")]


async def handle_tool_call(
    client: AskHumanClient, name: str, arguments: dict[str, Any]
) -> list[types.ContentBlock]:
    """Route a tool call to the appropriate handler.

    Args:
        client: The AskHumanClient to use.
        name: The tool name.
        arguments: Tool arguments.

    Returns:
        List of content blocks with the result.

    Raises:
        ValueError: If the tool name is unknown.
    """
    if name == ASK_HUMAN_TOOL:
        return await handle_ask_human(client, arguments)
    elif name == CHECK_RESPONSES_TOOL:
        return await handle_check_responses(client, arguments)
    else:
        raise ValueError(f"Unknown tool: {name}")
