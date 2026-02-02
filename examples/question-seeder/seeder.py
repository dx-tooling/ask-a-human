#!/usr/bin/env python3
"""Question Seeder Agent.

Seeds the Ask-a-Human platform with interesting questions at regular intervals.
Monitors responses and incorporates human feedback into question generation.

Usage:
    python seeder.py [--interval 10] [--max-questions 50]
"""

from __future__ import annotations

import argparse
import random
import sys
import time
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any

from rich.console import Console
from rich.live import Live
from rich.panel import Panel
from rich.table import Table
from rich.text import Text

from ask_a_human import AskHumanClient
from ask_a_human.exceptions import AskHumanError

# Question templates organized by category
QUESTION_TEMPLATES = {
    "ux_copy": [
        {
            "prompt": "A user just deleted their account. What should the confirmation message say?",
            "type": "multiple_choice",
            "options": [
                "Account deleted. We're sorry to see you go.",
                "Your account has been permanently deleted.",
                "Goodbye! Your account is now deleted. You can always come back.",
                "Account deletion complete. All your data has been removed.",
            ],
        },
        {
            "prompt": "User's payment failed. How should we tell them?",
            "type": "multiple_choice",
            "options": [
                "Oops! Your payment didn't go through. Please try again.",
                "Payment failed. Please check your card details and retry.",
                "We couldn't process your payment. No charges were made.",
                "There was an issue with your payment method. Please update and try again.",
            ],
        },
        {
            "prompt": "Empty state for a todo app with no tasks. What should it say?",
            "type": "multiple_choice",
            "options": [
                "No tasks yet. Add one to get started!",
                "Your task list is empty. Enjoy the peace!",
                "Nothing here yet. What would you like to accomplish?",
                "All clear! Add a task when you're ready.",
            ],
        },
        {
            "prompt": "User is about to send an email to 10,000 subscribers. Confirmation message?",
            "type": "multiple_choice",
            "options": [
                "Are you sure? This will send to 10,000 people.",
                "Ready to send to 10,000 subscribers? This cannot be undone.",
                "You're about to email 10,000 people. Double-check everything!",
                "Confirm: Send this email to all 10,000 subscribers?",
            ],
        },
    ],
    "design_decisions": [
        {
            "prompt": "Dark mode toggle in settings: icon only, text only, or both?",
            "type": "multiple_choice",
            "options": [
                "Icon only (moon/sun)",
                "Text only ('Dark Mode')",
                "Icon + Text",
                "Toggle switch with labels",
            ],
        },
        {
            "prompt": "Where should the 'Help' button live in a SaaS dashboard?",
            "type": "multiple_choice",
            "options": [
                "Fixed bottom-right corner (floating)",
                "In the main navigation/sidebar",
                "Top-right, near user profile",
                "Footer of every page",
            ],
        },
        {
            "prompt": "Loading state for a data table: skeleton, spinner, or progress bar?",
            "type": "multiple_choice",
            "options": [
                "Skeleton rows (gray placeholders)",
                "Central spinner",
                "Progress bar at top",
                "Skeleton + subtle shimmer animation",
            ],
        },
    ],
    "tone_and_voice": [
        {
            "prompt": "Brand voice for a fintech startup targeting millennials?",
            "type": "multiple_choice",
            "options": [
                "Professional but approachable",
                "Casual and witty",
                "Minimalist and serious",
                "Warm and encouraging",
            ],
        },
        {
            "prompt": "How should a meditation app's notifications sound?",
            "type": "multiple_choice",
            "options": [
                "Gentle reminder: 'Time for your daily calm'",
                "Direct: 'Meditation session available'",
                "Playful: 'Your mind called—it wants a break!'",
                "Minimal: 'Ready when you are'",
            ],
        },
        {
            "prompt": "Error message personality for a developer tools company?",
            "type": "multiple_choice",
            "options": [
                "Technical and precise",
                "Friendly with a hint of humor",
                "Empathetic and helpful",
                "Minimal and factual",
            ],
        },
    ],
    "ethics_and_ux": [
        {
            "prompt": "Should a 'Subscribe to newsletter' checkbox be pre-checked?",
            "type": "multiple_choice",
            "options": [
                "Yes, with clear uncheck option",
                "No, always unchecked by default",
                "No checkbox—separate opt-in flow",
                "Depends on the context/region",
            ],
        },
        {
            "prompt": "User wants to delete all their data. How long should we retain backups?",
            "type": "multiple_choice",
            "options": [
                "Delete immediately, no backups",
                "30 days (grace period)",
                "90 days (recovery window)",
                "Keep anonymized data indefinitely",
            ],
        },
        {
            "prompt": "Dark pattern or acceptable: 'Are you sure you want to miss out on 50% off?'",
            "type": "multiple_choice",
            "options": [
                "Dark pattern—manipulative",
                "Acceptable if offer is genuine",
                "Gray area—depends on context",
                "Fine if there's a clear 'No thanks' option",
            ],
        },
    ],
    "product_decisions": [
        {
            "prompt": "Free trial: 7 days or 14 days?",
            "type": "multiple_choice",
            "options": [
                "7 days—creates urgency",
                "14 days—enough time to evaluate",
                "30 days—builds habit",
                "No trial—freemium model instead",
            ],
        },
        {
            "prompt": "Onboarding flow for a project management tool: wizard or learn-by-doing?",
            "type": "multiple_choice",
            "options": [
                "Step-by-step wizard",
                "Interactive tutorial with sample project",
                "Video walkthrough option",
                "Minimal hints, let users explore",
            ],
        },
        {
            "prompt": "Feature requests: public roadmap or private feedback?",
            "type": "multiple_choice",
            "options": [
                "Public roadmap with voting",
                "Private feedback form",
                "Both—private submissions, public voting",
                "Community forum for discussions",
            ],
        },
    ],
    "open_ended": [
        {
            "prompt": "What's the most annoying thing about most mobile apps' notification settings?",
            "type": "text",
        },
        {
            "prompt": "Describe the perfect 'Settings' page in 3 words.",
            "type": "text",
        },
        {
            "prompt": "What makes you trust a new app with your data?",
            "type": "text",
        },
        {
            "prompt": "When do error messages actually make you feel better vs worse?",
            "type": "text",
        },
    ],
}


@dataclass
class TrackedQuestion:
    """A question being tracked for responses."""

    question_id: str
    prompt: str
    category: str
    submitted_at: datetime
    responses: list[dict[str, Any]] = field(default_factory=list)
    status: str = "OPEN"


class QuestionSeeder:
    """Seeds questions and tracks responses."""

    def __init__(
        self,
        console: Console | None = None,
        agent_id: str | None = None,
        base_url: str | None = None,
    ) -> None:
        self.console = console or Console()
        self.client = AskHumanClient(
            agent_id=agent_id or "question-seeder",
            base_url=base_url,
        )
        self.tracked_questions: list[TrackedQuestion] = []
        self.total_submitted = 0
        self.total_responses = 0
        self.insights: list[str] = []

    def pick_question(self) -> tuple[str, dict[str, Any]]:
        """Pick a random question from the templates."""
        category = random.choice(list(QUESTION_TEMPLATES.keys()))
        question = random.choice(QUESTION_TEMPLATES[category])
        return category, question

    def submit_question(self) -> TrackedQuestion | None:
        """Submit a new question and track it."""
        category, template = self.pick_question()

        try:
            result = self.client.submit_question(
                prompt=template["prompt"],
                type=template["type"],
                options=template.get("options"),
                audience=["general", "product", "creative"],
                min_responses=3,
                timeout_seconds=3600,
            )

            tracked = TrackedQuestion(
                question_id=result.question_id,
                prompt=template["prompt"],
                category=category,
                submitted_at=datetime.now(),
            )
            self.tracked_questions.append(tracked)
            self.total_submitted += 1

            return tracked

        except AskHumanError as e:
            self.console.print(f"[red]Error submitting question:[/red] {e}")
            return None

    def check_responses(self) -> list[tuple[TrackedQuestion, int]]:
        """Check for new responses on all tracked questions."""
        updates = []

        for tracked in self.tracked_questions:
            if tracked.status == "CLOSED":
                continue

            try:
                response = self.client.get_question(tracked.question_id)
                new_count = len(response.responses) - len(tracked.responses)

                if new_count > 0:
                    # Store new responses
                    tracked.responses = [
                        {
                            "answer": r.answer,
                            "selected_option": r.selected_option,
                        }
                        for r in response.responses
                    ]
                    self.total_responses += new_count
                    updates.append((tracked, new_count))

                    # Extract insights from text responses
                    for r in response.responses[-new_count:]:
                        if r.answer and len(r.answer) > 20:
                            self.insights.append(f"[{tracked.category}] {r.answer[:100]}...")

                tracked.status = response.status

            except AskHumanError:
                pass  # Silently continue on errors

        return updates

    def build_status_display(self) -> Table:
        """Build a rich table showing current status."""
        table = Table(title="Question Seeder Status", expand=True)

        table.add_column("Metric", style="cyan")
        table.add_column("Value", style="green")

        table.add_row("Questions Submitted", str(self.total_submitted))
        table.add_row("Total Responses", str(self.total_responses))
        table.add_row("Active Questions", str(sum(1 for q in self.tracked_questions if q.status == "OPEN")))
        table.add_row("Insights Collected", str(len(self.insights)))

        return table

    def build_recent_activity(self, updates: list[tuple[TrackedQuestion, int]]) -> Panel | None:
        """Build a panel showing recent activity."""
        if not updates:
            return None

        lines = []
        for tracked, count in updates[-5:]:
            lines.append(f"[green]+{count}[/green] response(s): {tracked.prompt[:50]}...")

        return Panel("\n".join(lines), title="Recent Responses", border_style="green")

    def build_insights_panel(self) -> Panel | None:
        """Build a panel showing recent insights."""
        if not self.insights:
            return None

        recent = self.insights[-3:]
        return Panel("\n".join(recent), title="Recent Human Insights", border_style="blue")

    def run(self, interval: float = 10.0, max_questions: int | None = None) -> None:
        """Run the seeder loop.

        Args:
            interval: Seconds between submitting new questions.
            max_questions: Maximum questions to submit (None for unlimited).
        """
        self.console.print(
            Panel(
                "[bold]Question Seeder Agent[/bold]\n\n"
                f"Interval: {interval}s | Max questions: {max_questions or 'unlimited'}\n\n"
                "Seeding the human inference network with questions...",
                title="Starting",
                border_style="blue",
            )
        )

        try:
            while True:
                # Check if we've hit the limit
                if max_questions and self.total_submitted >= max_questions:
                    self.console.print("\n[yellow]Reached maximum questions. Monitoring only...[/yellow]")
                    # Continue monitoring but don't submit new questions
                    while any(q.status == "OPEN" for q in self.tracked_questions):
                        updates = self.check_responses()
                        self._print_update(updates)
                        time.sleep(interval)
                    break

                # Submit a new question
                tracked = self.submit_question()
                if tracked:
                    self.console.print(
                        f"\n[cyan]📤 Submitted [{tracked.category}]:[/cyan] {tracked.prompt[:60]}..."
                    )

                # Check for responses on existing questions
                updates = self.check_responses()
                self._print_update(updates)

                # Print status summary
                self.console.print(self.build_status_display())

                if self.insights:
                    panel = self.build_insights_panel()
                    if panel:
                        self.console.print(panel)

                # Wait for next iteration
                self.console.print(f"\n[dim]Waiting {interval}s...[/dim]")
                time.sleep(interval)

        except KeyboardInterrupt:
            self.console.print("\n[yellow]Interrupted by user[/yellow]")
        finally:
            self._print_summary()
            self.client.close()

    def _print_update(self, updates: list[tuple[TrackedQuestion, int]]) -> None:
        """Print response updates."""
        for tracked, count in updates:
            self.console.print(
                f"[green]📥 +{count} response(s)[/green] on: {tracked.prompt[:50]}..."
            )

            # Show the responses
            for resp in tracked.responses[-count:]:
                if resp.get("answer"):
                    self.console.print(f"   💬 \"{resp['answer'][:80]}...\"")
                elif resp.get("selected_option") is not None:
                    self.console.print(f"   ✓ Selected option {resp['selected_option']}")

    def _print_summary(self) -> None:
        """Print final summary."""
        self.console.print("\n")
        self.console.print(
            Panel(
                f"[bold]Session Complete[/bold]\n\n"
                f"Questions submitted: {self.total_submitted}\n"
                f"Responses received: {self.total_responses}\n"
                f"Insights collected: {len(self.insights)}",
                title="Summary",
                border_style="green",
            )
        )

        if self.insights:
            self.console.print("\n[bold]Sample Insights from Humans:[/bold]")
            for insight in self.insights[:5]:
                self.console.print(f"  • {insight}")


def main() -> None:
    """Run the question seeder."""
    parser = argparse.ArgumentParser(description="Seed Ask-a-Human with questions")
    parser.add_argument(
        "--interval",
        type=float,
        default=10.0,
        help="Seconds between questions (default: 10)",
    )
    parser.add_argument(
        "--max-questions",
        type=int,
        default=None,
        help="Maximum questions to submit (default: unlimited)",
    )
    parser.add_argument(
        "--agent-id",
        type=str,
        default="question-seeder",
        help="Agent ID (default: question-seeder)",
    )

    args = parser.parse_args()

    seeder = QuestionSeeder(agent_id=args.agent_id)
    seeder.run(interval=args.interval, max_questions=args.max_questions)


if __name__ == "__main__":
    main()
