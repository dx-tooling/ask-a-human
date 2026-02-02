"""Content Writer Agent implementation.

This module contains the main agent logic, including:
- OpenAI integration for content analysis and generation
- Ask-a-Human integration for human decision points
- Progress display using rich
"""

from __future__ import annotations

import json
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from openai import OpenAI
from rich.console import Console
from rich.live import Live
from rich.panel import Panel
from rich.progress import Progress, SpinnerColumn, TextColumn
from rich.table import Table

from ask_a_human import AskHumanClient, AskHumanOrchestrator
from ask_a_human.exceptions import AskHumanError

from prompts import ANALYZE_BRIEF_PROMPT, GENERATE_CONTENT_PROMPT, GENERATE_HEADLINES_PROMPT


@dataclass
class BriefAnalysis:
    """Result of analyzing a content brief."""

    content_type: str
    target_audience: str
    key_points: list[str]
    tone_options: list[str]


@dataclass
class ContentResult:
    """Final generated content with metadata."""

    headline: str
    tone: str
    content: str
    brief_analysis: BriefAnalysis


class ContentWriterAgent:
    """Agent that writes content with human-in-the-loop decisions.

    This agent demonstrates the async human-in-the-loop pattern:
    1. Analyze brief with LLM
    2. Ask humans for tone preference
    3. Generate headline options with LLM
    4. Ask humans for headline preference
    5. Generate final content with LLM
    """

    def __init__(
        self,
        console: Console | None = None,
        openai_api_key: str | None = None,
        ask_human_agent_id: str | None = None,
        ask_human_base_url: str | None = None,
    ) -> None:
        """Initialize the agent.

        Args:
            console: Rich console for output. Creates one if not provided.
            openai_api_key: OpenAI API key. Falls back to env var or secrets file.
            ask_human_agent_id: Agent ID for Ask-a-Human. Falls back to env var.
            ask_human_base_url: Base URL for Ask-a-Human API. Falls back to env var.
        """
        self.console = console or Console()

        # Initialize OpenAI client
        api_key = openai_api_key or self._get_openai_key()
        self.openai = OpenAI(api_key=api_key)

        # Initialize Ask-a-Human client
        self.ask_human = AskHumanClient(
            base_url=ask_human_base_url,
            agent_id=ask_human_agent_id or "content-writer-agent",
        )
        self.orchestrator = AskHumanOrchestrator(
            self.ask_human,
            poll_interval=10.0,  # Check every 10 seconds
            max_backoff=60.0,  # Max 1 minute between checks
        )

    def _get_openai_key(self) -> str:
        """Get OpenAI API key from env var or secrets file."""
        # Try environment variable first
        if key := os.environ.get("OPENAI_API_KEY"):
            return key

        # Try secrets file
        secrets_path = Path(__file__).parent.parent.parent / "secrets" / "openai-api-key.txt"
        if secrets_path.exists():
            return secrets_path.read_text().strip()

        raise ValueError(
            "OpenAI API key not found. Set OPENAI_API_KEY env var "
            "or create secrets/openai-api-key.txt"
        )

    def _call_llm(self, prompt: str, parse_json: bool = False) -> str | dict[str, Any]:
        """Call OpenAI with a prompt.

        Args:
            prompt: The prompt to send.
            parse_json: Whether to parse the response as JSON.

        Returns:
            The response text, or parsed JSON if parse_json=True.
        """
        response = self.openai.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
        )

        text = response.choices[0].message.content or ""

        if parse_json:
            # Extract JSON from response (handle markdown code blocks)
            if "```json" in text:
                text = text.split("```json")[1].split("```")[0]
            elif "```" in text:
                text = text.split("```")[1].split("```")[0]
            return json.loads(text)

        return text

    def analyze_brief(self, brief: str) -> BriefAnalysis:
        """Analyze a content brief using OpenAI.

        Args:
            brief: The content brief from the user.

        Returns:
            BriefAnalysis with content type, audience, key points, and tone options.
        """
        self.console.print("\n[bold blue]📋 Analyzing your brief...[/bold blue]")

        prompt = ANALYZE_BRIEF_PROMPT.format(brief=brief)
        result = self._call_llm(prompt, parse_json=True)

        if isinstance(result, str):
            raise ValueError(f"Expected JSON response, got: {result}")

        analysis = BriefAnalysis(
            content_type=result.get("content_type", "article"),
            target_audience=result.get("target_audience", "general audience"),
            key_points=result.get("key_points", []),
            tone_options=result.get("tone_options", [
                "Formal and professional",
                "Casual and friendly",
                "Informative and neutral",
                "Engaging and persuasive",
            ]),
        )

        self.console.print(
            f"[green]✓[/green] Brief analyzed: {analysis.content_type} "
            f"for {analysis.target_audience}"
        )

        return analysis

    def ask_humans_for_tone(self, analysis: BriefAnalysis) -> str:
        """Ask humans to choose the tone/style.

        Args:
            analysis: The brief analysis with tone options.

        Returns:
            The selected tone.
        """
        self.console.print("\n[bold blue]🧑 Asking humans about writing tone...[/bold blue]")

        try:
            # Submit the question
            submission = self.orchestrator.submit(
                prompt=(
                    f"We're writing a {analysis.content_type} for {analysis.target_audience}. "
                    f"Which tone/style would be most effective?"
                ),
                type="multiple_choice",
                options=analysis.tone_options,
                audience=["creative", "product"],
                min_responses=3,
                timeout_seconds=600,  # 10 minutes
            )

            self.console.print(f"   Question ID: {submission.question_id}")

            # Wait for responses with progress display
            with Progress(
                SpinnerColumn(),
                TextColumn("[progress.description]{task.description}"),
                console=self.console,
            ) as progress:
                task = progress.add_task("Waiting for human responses...", total=None)

                responses = self.orchestrator.await_responses(
                    [submission.question_id],
                    min_responses=1,  # Accept at least 1 response
                    timeout=300,  # Wait up to 5 minutes
                )

            question = responses[submission.question_id]

            # Count votes for each option
            if question.summary:
                # Find the winning option
                winner = max(question.summary.items(), key=lambda x: x[1])
                selected_tone = winner[0]
            elif question.responses:
                # Fall back to first response
                first_response = question.responses[0]
                if first_response.selected_option is not None:
                    selected_tone = analysis.tone_options[first_response.selected_option]
                else:
                    selected_tone = analysis.tone_options[0]
            else:
                # No responses, use default
                self.console.print(
                    "[yellow]⚠[/yellow] No human responses received, using default tone"
                )
                selected_tone = analysis.tone_options[0]

            self.console.print(f'[green]✓[/green] Tone preference received: "{selected_tone}"')
            return selected_tone

        except AskHumanError as e:
            self.console.print(f"[yellow]⚠[/yellow] Ask-a-Human error: {e}")
            self.console.print("   Using default tone")
            return analysis.tone_options[0]

    def generate_headlines(self, brief: str, analysis: BriefAnalysis, tone: str) -> list[str]:
        """Generate headline options using OpenAI.

        Args:
            brief: The original content brief.
            analysis: The brief analysis.
            tone: The selected tone.

        Returns:
            List of headline options.
        """
        self.console.print("\n[bold blue]💡 Generating headline options...[/bold blue]")

        prompt = GENERATE_HEADLINES_PROMPT.format(
            brief=brief,
            tone=tone,
            content_type=analysis.content_type,
            target_audience=analysis.target_audience,
        )

        result = self._call_llm(prompt, parse_json=True)

        if isinstance(result, str):
            raise ValueError(f"Expected JSON response, got: {result}")

        headlines = result.get("headlines", [
            "Compelling Headline Option 1",
            "Engaging Headline Option 2",
            "Powerful Headline Option 3",
            "Creative Headline Option 4",
        ])

        self.console.print(f"[green]✓[/green] Generated {len(headlines)} headline options")
        return headlines

    def ask_humans_for_headline(self, headlines: list[str]) -> str:
        """Ask humans to choose the headline.

        Args:
            headlines: List of headline options.

        Returns:
            The selected headline.
        """
        self.console.print("\n[bold blue]🧑 Asking humans about headline preference...[/bold blue]")

        try:
            # Submit the question
            submission = self.orchestrator.submit(
                prompt="Which headline is most compelling and would make you want to read more?",
                type="multiple_choice",
                options=headlines,
                audience=["creative", "product"],
                min_responses=3,
                timeout_seconds=600,
            )

            self.console.print(f"   Question ID: {submission.question_id}")

            # Wait for responses
            with Progress(
                SpinnerColumn(),
                TextColumn("[progress.description]{task.description}"),
                console=self.console,
            ) as progress:
                task = progress.add_task("Waiting for human responses...", total=None)

                responses = self.orchestrator.await_responses(
                    [submission.question_id],
                    min_responses=1,
                    timeout=300,
                )

            question = responses[submission.question_id]

            # Count votes
            if question.summary:
                winner = max(question.summary.items(), key=lambda x: x[1])
                selected_headline = winner[0]
            elif question.responses:
                first_response = question.responses[0]
                if first_response.selected_option is not None:
                    selected_headline = headlines[first_response.selected_option]
                else:
                    selected_headline = headlines[0]
            else:
                self.console.print(
                    "[yellow]⚠[/yellow] No human responses received, using first headline"
                )
                selected_headline = headlines[0]

            self.console.print(f'[green]✓[/green] Headline selected: "{selected_headline}"')
            return selected_headline

        except AskHumanError as e:
            self.console.print(f"[yellow]⚠[/yellow] Ask-a-Human error: {e}")
            self.console.print("   Using first headline option")
            return headlines[0]

    def generate_content(
        self, brief: str, analysis: BriefAnalysis, tone: str, headline: str
    ) -> str:
        """Generate the final content using OpenAI.

        Args:
            brief: The original content brief.
            analysis: The brief analysis.
            tone: The selected tone.
            headline: The selected headline.

        Returns:
            The generated content.
        """
        self.console.print("\n[bold blue]📝 Generating final content...[/bold blue]")

        prompt = GENERATE_CONTENT_PROMPT.format(
            brief=brief,
            content_type=analysis.content_type,
            target_audience=analysis.target_audience,
            tone=tone,
            headline=headline,
            key_points="\n".join(f"- {point}" for point in analysis.key_points),
        )

        content = self._call_llm(prompt, parse_json=False)

        if not isinstance(content, str):
            content = str(content)

        self.console.print("[green]✓[/green] Content generated")
        return content

    def run(self, brief: str) -> ContentResult:
        """Run the full content writing workflow.

        Args:
            brief: The content brief from the user.

        Returns:
            ContentResult with the generated content and metadata.
        """
        # Step 1: Analyze the brief
        analysis = self.analyze_brief(brief)

        # Step 2: Ask humans for tone (HUMAN DECISION POINT 1)
        tone = self.ask_humans_for_tone(analysis)

        # Step 3: Generate headline options
        headlines = self.generate_headlines(brief, analysis, tone)

        # Step 4: Ask humans for headline (HUMAN DECISION POINT 2)
        headline = self.ask_humans_for_headline(headlines)

        # Step 5: Generate final content
        content = self.generate_content(brief, analysis, tone, headline)

        return ContentResult(
            headline=headline,
            tone=tone,
            content=content,
            brief_analysis=analysis,
        )

    def close(self) -> None:
        """Clean up resources."""
        self.ask_human.close()
