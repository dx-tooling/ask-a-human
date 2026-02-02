#!/usr/bin/env python3
"""Basic usage example for Ask-a-Human SDK.

This example demonstrates:
- Creating a client
- Submitting a question
- Polling for responses
- Processing the results

Usage:
    export ASK_A_HUMAN_AGENT_ID="my-agent"
    python basic_usage.py
"""

import time

from ask_a_human import AskHumanClient
from ask_a_human.exceptions import AskHumanError


def main() -> None:
    """Run the basic usage example."""
    # Create a client
    # You can also pass base_url and agent_id directly
    client = AskHumanClient(agent_id="example-agent")

    try:
        # Submit a text question
        print("Submitting question to humans...")
        submission = client.submit_question(
            prompt=(
                "Should error messages in a shopping app apologize to the user, "
                "or just state the facts? Consider the emotional impact on users "
                "during payment failures."
            ),
            type="text",
            audience=["product", "creative"],
            min_responses=3,
            timeout_seconds=3600,  # 1 hour
        )

        print("Question submitted!")
        print(f"  Question ID: {submission.question_id}")
        print(f"  Status: {submission.status}")
        print(f"  Expires at: {submission.expires_at}")
        print(f"  Poll URL: {submission.poll_url}")
        print()

        # Poll for responses
        print("Waiting for human responses...")
        print("(In a real application, you would do other work while waiting)")
        print()

        max_polls = 10
        poll_interval = 30  # seconds

        for i in range(max_polls):
            # Check for responses
            response = client.get_question(submission.question_id)

            print(f"Poll {i + 1}/{max_polls}:")
            print(f"  Status: {response.status}")
            print(f"  Responses: {response.current_responses}/{response.required_responses}")

            # If we have enough responses or question is done, process them
            if response.status in ("CLOSED", "EXPIRED") or response.current_responses >= 3:
                print()
                print("=" * 50)
                print("RESULTS")
                print("=" * 50)
                print()

                if response.responses:
                    for j, r in enumerate(response.responses, 1):
                        print(f"Response {j}:")
                        print(f"  Answer: {r.answer}")
                        print(f"  Confidence: {r.confidence}/5")
                        print()
                else:
                    print("No responses received yet.")

                break

            # Wait before next poll
            print(f"  Waiting {poll_interval}s before next poll...")
            time.sleep(poll_interval)
        else:
            print("Reached maximum polls without getting enough responses.")
            print("You can continue polling later using the question_id.")

    except AskHumanError as e:
        print(f"Error: {e}")

    finally:
        client.close()


if __name__ == "__main__":
    main()
