#!/usr/bin/env node
/**
 * Content Writer Agent - CLI Entry Point.
 *
 * This is a reference implementation demonstrating the human-in-the-loop
 * pattern with Ask-a-Human.
 *
 * Usage:
 *   npm start
 *   # or
 *   npx tsx src/main.ts
 */

import chalk from "chalk";
import * as readline from "readline";

import { ContentWriterAgent } from "./agent.js";

/**
 * Display the welcome banner.
 */
function displayWelcome(): void {
  console.log();
  console.log(chalk.cyan("╔════════════════════════════════════════════════════════╗"));
  console.log(chalk.cyan("║") + chalk.bold.cyan("           Content Writer Agent - Demo           ") + chalk.cyan("║"));
  console.log(chalk.cyan("╠════════════════════════════════════════════════════════╣"));
  console.log(chalk.cyan("║") + chalk.dim("  This agent demonstrates the human-in-the-loop     ") + chalk.cyan("║"));
  console.log(chalk.cyan("║") + chalk.dim("  pattern with Ask-a-Human. It will ask humans for  ") + chalk.cyan("║"));
  console.log(chalk.cyan("║") + chalk.dim("  subjective decisions while generating content.    ") + chalk.cyan("║"));
  console.log(chalk.cyan("╚════════════════════════════════════════════════════════╝"));
  console.log();
}

/**
 * Display the final content result.
 */
function displayResult(result: { tone: string; content: string }): void {
  console.log();
  console.log(chalk.green("═".repeat(65)));
  console.log(chalk.bold.green("                        FINAL CONTENT"));
  console.log(chalk.green("═".repeat(65)));
  console.log();
  console.log(chalk.dim("Tone:") + ` ${result.tone}`);
  console.log();
  console.log(result.content);
  console.log();
  console.log(chalk.green("═".repeat(65)));
  console.log();
}

/**
 * Create a readline interface for user input.
 */
function createReadline(): readline.Interface {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

/**
 * Prompt the user for input.
 */
async function promptUser(rl: readline.Interface, prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer);
    });
  });
}

/**
 * Main entry point.
 */
async function main(): Promise<void> {
  displayWelcome();

  // Create agent
  let agent: ContentWriterAgent;
  try {
    agent = new ContentWriterAgent();
  } catch (error) {
    console.log(chalk.red("Error:") + ` ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }

  const rl = createReadline();

  try {
    // Main loop
    while (true) {
      console.log(chalk.bold("Enter your content brief") + chalk.dim(" (or 'quit' to exit):"));
      const brief = await promptUser(rl, chalk.green("> "));

      // Handle exit
      if (brief.toLowerCase() === "quit" || brief.toLowerCase() === "exit" || brief.toLowerCase() === "q") {
        console.log(chalk.dim("\nGoodbye!"));
        break;
      }

      // Validate input
      if (!brief.trim()) {
        console.log(chalk.yellow("Please enter a content brief.\n"));
        continue;
      }

      if (brief.length < 20) {
        console.log(chalk.yellow("Please provide a more detailed brief (at least 20 characters).\n"));
        continue;
      }

      // Run the agent
      try {
        const result = await agent.run(brief);
        displayResult(result);
      } catch (error) {
        console.log(chalk.red("\nError during content generation:") + ` ${error instanceof Error ? error.message : error}`);
        console.log(chalk.dim("Please try again with a different brief.\n"));
      }
    }
  } finally {
    rl.close();
  }
}

// Run the main function
main().catch((error) => {
  console.error(chalk.red("Fatal error:"), error);
  process.exit(1);
});
