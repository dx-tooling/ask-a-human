#!/usr/bin/env python3
"""Content Writer Agent - CLI Entry Point.

This is a reference implementation demonstrating the human-in-the-loop
pattern with Ask-a-Human.

Usage:
    python main.py
"""

from rich.console import Console
from rich.panel import Panel
from rich.text import Text

from agent import ContentWriterAgent


def main() -> None:
    """Run the Content Writer Agent CLI."""
    console = Console()

    # Display welcome banner
    welcome_text = Text()
    welcome_text.append("Content Writer Agent", style="bold cyan")
    welcome_text.append(" - Demo\n\n", style="cyan")
    welcome_text.append(
        "This agent demonstrates the human-in-the-loop pattern\n"
        "with Ask-a-Human. It will ask humans for subjective\n"
        "decisions while generating your content.",
        style="dim",
    )

    console.print(Panel(welcome_text, border_style="cyan"))
    console.print()

    # Create agent
    try:
        agent = ContentWriterAgent(console=console)
    except ValueError as e:
        console.print(f"[red]Error:[/red] {e}")
        return

    try:
        while True:
            # Get content brief from user
            console.print("[bold]Enter your content brief[/bold] (or 'quit' to exit):")
            brief = console.input("[green]> [/green]").strip()

            if brief.lower() in ("quit", "exit", "q"):
                console.print("\n[dim]Goodbye![/dim]")
                break

            if not brief:
                console.print("[yellow]Please enter a content brief.[/yellow]")
                continue

            if len(brief) < 20:
                console.print(
                    "[yellow]Please provide a more detailed brief "
                    "(at least 20 characters).[/yellow]"
                )
                continue

            # Run the agent
            try:
                result = agent.run(brief)

                # Display the result
                console.print()
                console.print("=" * 65)
                console.print(
                    "[bold green]FINAL CONTENT[/bold green]".center(65),
                )
                console.print("=" * 65)
                console.print()
                console.print(f"[dim]Tone:[/dim] {result.tone}")
                console.print()
                console.print(result.content)
                console.print()
                console.print("=" * 65)
                console.print()

            except Exception as e:
                console.print(f"\n[red]Error during content generation:[/red] {e}")
                console.print("[dim]Please try again with a different brief.[/dim]\n")

    except KeyboardInterrupt:
        console.print("\n\n[dim]Interrupted. Goodbye![/dim]")

    finally:
        agent.close()


if __name__ == "__main__":
    main()
