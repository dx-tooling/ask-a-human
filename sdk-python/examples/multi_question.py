#!/usr/bin/env python3
"""Multi-question example for Ask-a-Human SDK.

This example demonstrates:
- Submitting multiple questions at once
- Using the orchestrator for async workflows
- Handling partial results
- Processing multiple choice questions

Usage:
    export ASK_A_HUMAN_AGENT_ID="my-agent"
    python multi_question.py
"""

from ask_a_human import AskHumanClient, AskHumanOrchestrator
from ask_a_human.exceptions import AskHumanError


def main() -> None:
    """Run the multi-question example."""
    # Create client and orchestrator
    client = AskHumanClient(agent_id="example-agent")
    orchestrator = AskHumanOrchestrator(
        client,
        poll_interval=30.0,  # Check every 30 seconds
        max_backoff=120.0,  # Max 2 minutes between checks
    )

    try:
        print("Submitting multiple questions to humans...")
        print()

        # Submit multiple questions
        questions = []

        # Question 1: Text question about tone
        q1 = orchestrator.submit(
            prompt="What tone should a payment failure notification use? Consider the user just had their credit card declined.",
            type="text",
            audience=["product", "creative"],
            min_responses=3,
            timeout_seconds=1800,
        )
        questions.append(("Tone question", q1))
        print(f"  Submitted tone question: {q1.question_id}")

        # Question 2: Multiple choice about button label
        q2 = orchestrator.submit(
            prompt="Which button label is clearer for retrying a failed payment?",
            type="multiple_choice",
            options=["Try Again", "Retry Payment", "Retry", "Submit Again"],
            audience=["product"],
            min_responses=5,
            timeout_seconds=1800,
        )
        questions.append(("Button label question", q2))
        print(f"  Submitted button question: {q2.question_id}")

        # Question 3: Multiple choice about icon usage
        q3 = orchestrator.submit(
            prompt="Should payment error messages include a warning icon or just text?",
            type="multiple_choice",
            options=[
                "Warning icon with text",
                "Text only, no icon",
                "Subtle icon, text is primary",
            ],
            audience=["product", "creative"],
            min_responses=5,
            timeout_seconds=1800,
        )
        questions.append(("Icon question", q3))
        print(f"  Submitted icon question: {q3.question_id}")

        print()
        print("Waiting for responses (timeout: 5 minutes)...")
        print()

        # Wait for all questions to get at least some responses
        question_ids = [q.question_id for _, q in questions]
        results = orchestrator.await_responses(
            question_ids=question_ids,
            min_responses=1,  # Wait for at least 1 response per question
            timeout=300,  # 5 minute timeout
        )

        # Process results
        print("=" * 60)
        print("RESULTS")
        print("=" * 60)
        print()

        for name, submission in questions:
            response = results[submission.question_id]

            print(f"📋 {name}")
            print(f"   Status: {response.status}")
            print(f"   Responses: {response.current_responses}/{response.required_responses}")
            print()

            if response.type == "text":
                # Text question: show answers
                if response.responses:
                    for i, r in enumerate(response.responses, 1):
                        print(f"   Response {i}:")
                        print(f"   {r.answer}")
                        print(f"   (Confidence: {r.confidence}/5)")
                        print()
                else:
                    print("   No responses yet.")
                    print()

            elif response.type == "multiple_choice":
                # Multiple choice: show summary
                if response.summary:
                    print("   Vote distribution:")
                    for option, count in response.summary.items():
                        bar = "█" * count
                        print(f"   {option}: {bar} ({count})")
                    print()

                    # Find winner
                    winner = max(response.summary.items(), key=lambda x: x[1])
                    print(f"   → Winner: {winner[0]} ({winner[1]} votes)")
                    print()
                elif response.responses:
                    print("   Individual responses:")
                    for r in response.responses:
                        if r.selected_option is not None and response.options:
                            option_text = response.options[r.selected_option]
                            print(f"   - {option_text} (confidence: {r.confidence})")
                    print()
                else:
                    print("   No responses yet.")
                    print()

            print("-" * 60)
            print()

    except AskHumanError as e:
        print(f"Error: {e}")

    finally:
        client.close()


if __name__ == "__main__":
    main()
