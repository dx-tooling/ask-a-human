/**
 * Basic usage example for Ask-a-Human SDK.
 *
 * This example demonstrates submitting a question and polling for responses.
 *
 * Run with: npx ts-node examples/basic-usage.ts
 */

import { AskHumanClient } from "../src/index.js";

async function main() {
  // Create a client
  const client = new AskHumanClient({
    agentId: "example-agent",
    // baseUrl: "https://api.ask-a-human.com", // Optional, uses default
  });

  console.log("Submitting a question to Ask-a-Human...\n");

  try {
    // Submit a text question
    const submission = await client.submitQuestion({
      prompt: "Should error messages in software apologize to users, or just state the facts?",
      type: "text",
      audience: ["product", "creative"],
      minResponses: 5,
      timeoutSeconds: 3600, // 1 hour
    });

    console.log(`Question submitted!`);
    console.log(`  ID: ${submission.questionId}`);
    console.log(`  Status: ${submission.status}`);
    console.log(`  Poll URL: ${submission.pollUrl}`);
    console.log(`  Expires: ${submission.expiresAt}`);
    console.log();

    // Poll for responses (simple approach - in production use the Orchestrator)
    console.log("Checking for responses...\n");

    const response = await client.getQuestion(submission.questionId);

    console.log(`Question status: ${response.status}`);
    console.log(`Responses: ${response.currentResponses}/${response.requiredResponses}`);

    if (response.responses.length > 0) {
      console.log("\nHuman responses:");
      for (const r of response.responses) {
        console.log(`  - "${r.answer}" (confidence: ${r.confidence ?? "N/A"})`);
      }
    } else {
      console.log("\nNo responses yet. Check back later!");
    }
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

main();
