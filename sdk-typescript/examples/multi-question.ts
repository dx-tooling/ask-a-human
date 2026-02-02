/**
 * Multi-question example for Ask-a-Human SDK.
 *
 * This example demonstrates using the Orchestrator to manage multiple
 * questions with polling and timeouts.
 *
 * Run with: npx ts-node examples/multi-question.ts
 */

import { AskHumanClient, AskHumanOrchestrator } from "../src/index.js";

async function main() {
  // Create client and orchestrator
  const client = new AskHumanClient({
    agentId: "example-agent",
  });

  const orchestrator = new AskHumanOrchestrator(client, {
    pollInterval: 30000, // 30 seconds between polls
    maxBackoff: 300000, // Max 5 minutes between polls
    backoffMultiplier: 1.5,
  });

  console.log("Submitting multiple questions to Ask-a-Human...\n");

  try {
    // Submit multiple questions
    const question1 = await orchestrator.submit({
      prompt: "Which tone works better for a welcome email?",
      type: "multiple_choice",
      options: ["Formal and professional", "Casual and friendly", "Warm but concise"],
      audience: ["product", "creative"],
      minResponses: 5,
    });

    const question2 = await orchestrator.submit({
      prompt: "What color scheme feels most trustworthy for a financial app?",
      type: "multiple_choice",
      options: ["Blue and white", "Green and gold", "Navy and silver", "Teal and gray"],
      audience: ["creative", "product"],
      minResponses: 5,
    });

    console.log(`Submitted questions:`);
    console.log(`  1. ${question1.questionId}`);
    console.log(`  2. ${question2.questionId}`);
    console.log();

    // Wait for responses with a timeout
    console.log("Waiting for responses (timeout: 5 minutes)...\n");

    const responses = await orchestrator.awaitResponses(
      [question1.questionId, question2.questionId],
      {
        minResponses: 3, // Accept when we have at least 3 responses
        timeout: 300000, // 5 minutes
      }
    );

    // Display results
    for (const [questionId, response] of Object.entries(responses)) {
      console.log(`\n--- Question ${questionId} ---`);
      console.log(`Status: ${response.status}`);
      console.log(`Prompt: ${response.prompt}`);
      console.log(`Responses: ${response.currentResponses}/${response.requiredResponses}`);

      if (response.type === "multiple_choice" && response.summary) {
        console.log("\nVote distribution:");
        for (const [option, count] of Object.entries(response.summary)) {
          const percentage = Math.round((count / response.currentResponses) * 100);
          console.log(`  ${option}: ${count} votes (${percentage}%)`);
        }
      }

      if (response.responses.length > 0) {
        console.log("\nIndividual responses:");
        for (const r of response.responses) {
          if (r.answer) {
            console.log(`  - "${r.answer}"`);
          } else if (r.selectedOption !== undefined && response.options) {
            console.log(`  - ${response.options[r.selectedOption]}`);
          }
        }
      }
    }
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

main();
