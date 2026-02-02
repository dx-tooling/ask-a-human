/**
 * Content Writer Agent implementation.
 *
 * This module contains the main agent logic, including:
 * - OpenAI integration for content analysis and generation
 * - Ask-a-Human integration for human decision points
 * - Progress display using chalk and ora
 */

import chalk from "chalk";
import OpenAI from "openai";
import ora from "ora";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

import {
  AskHumanClient,
  AskHumanOrchestrator,
  AskHumanError,
} from "../../../sdk-typescript/dist/index.js";

import {
  ANALYZE_BRIEF_PROMPT,
  GENERATE_HEADLINES_PROMPT,
  GENERATE_CONTENT_PROMPT,
} from "./prompts.js";

/**
 * Result of analyzing a content brief.
 */
export interface BriefAnalysis {
  contentType: string;
  targetAudience: string;
  keyPoints: string[];
  toneOptions: string[];
}

/**
 * Final generated content with metadata.
 */
export interface ContentResult {
  headline: string;
  tone: string;
  content: string;
  briefAnalysis: BriefAnalysis;
}

/**
 * Agent options for constructor.
 */
export interface ContentWriterAgentOptions {
  openaiApiKey?: string;
  askHumanAgentId?: string;
  askHumanBaseUrl?: string;
}

/**
 * Agent that writes content with human-in-the-loop decisions.
 *
 * This agent demonstrates the async human-in-the-loop pattern:
 * 1. Analyze brief with LLM
 * 2. Ask humans for tone preference
 * 3. Generate headline options with LLM
 * 4. Ask humans for headline preference
 * 5. Generate final content with LLM
 */
export class ContentWriterAgent {
  private openai: OpenAI;
  private askHuman: AskHumanClient;
  private orchestrator: AskHumanOrchestrator;

  /**
   * Initialize the agent.
   */
  constructor(options?: ContentWriterAgentOptions) {
    // Initialize OpenAI client
    const apiKey = options?.openaiApiKey ?? this.getOpenAIKey();
    this.openai = new OpenAI({ apiKey });

    // Initialize Ask-a-Human client
    this.askHuman = new AskHumanClient({
      baseUrl: options?.askHumanBaseUrl,
      agentId: options?.askHumanAgentId ?? "content-writer-agent",
    });

    this.orchestrator = new AskHumanOrchestrator(this.askHuman, {
      pollInterval: 10000, // Check every 10 seconds
      maxBackoff: 60000, // Max 1 minute between checks
    });
  }

  /**
   * Get OpenAI API key from env var or secrets file.
   */
  private getOpenAIKey(): string {
    // Try environment variable first
    const envKey = process.env["OPENAI_API_KEY"];
    if (envKey) {
      return envKey;
    }

    // Try secrets file
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const secretsPath = path.join(__dirname, "..", "..", "..", "..", "secrets", "openai-api-key.txt");

    if (fs.existsSync(secretsPath)) {
      return fs.readFileSync(secretsPath, "utf-8").trim();
    }

    throw new Error(
      "OpenAI API key not found. Set OPENAI_API_KEY env var or create secrets/openai-api-key.txt"
    );
  }

  /**
   * Call OpenAI with a prompt.
   */
  private async callLLM(prompt: string, parseJson: boolean = false): Promise<string | Record<string, unknown>> {
    const response = await this.openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    });

    let text = response.choices[0]?.message?.content ?? "";

    if (parseJson) {
      // Extract JSON from response (handle markdown code blocks)
      if (text.includes("```json")) {
        text = text.split("```json")[1]?.split("```")[0] ?? text;
      } else if (text.includes("```")) {
        text = text.split("```")[1]?.split("```")[0] ?? text;
      }
      return JSON.parse(text) as Record<string, unknown>;
    }

    return text;
  }

  /**
   * Analyze a content brief using OpenAI.
   */
  async analyzeBrief(brief: string): Promise<BriefAnalysis> {
    console.log(chalk.blue("\n📋 Analyzing your brief..."));

    const prompt = ANALYZE_BRIEF_PROMPT.replace("{brief}", brief);
    const result = await this.callLLM(prompt, true);

    if (typeof result === "string") {
      throw new Error(`Expected JSON response, got: ${result}`);
    }

    const analysis: BriefAnalysis = {
      contentType: (result["content_type"] as string) ?? "article",
      targetAudience: (result["target_audience"] as string) ?? "general audience",
      keyPoints: (result["key_points"] as string[]) ?? [],
      toneOptions: (result["tone_options"] as string[]) ?? [
        "Formal and professional",
        "Casual and friendly",
        "Informative and neutral",
        "Engaging and persuasive",
      ],
    };

    console.log(
      chalk.green("✓") + ` Brief analyzed: ${analysis.contentType} for ${analysis.targetAudience}`
    );

    return analysis;
  }

  /**
   * Ask humans to choose the tone/style.
   */
  async askHumansForTone(analysis: BriefAnalysis): Promise<string> {
    console.log(chalk.blue("\n🧑 Asking humans about writing tone..."));

    try {
      // Submit the question
      const submission = await this.orchestrator.submit({
        prompt: `We're writing a ${analysis.contentType} for ${analysis.targetAudience}. Which tone/style would be most effective?`,
        type: "multiple_choice",
        options: analysis.toneOptions,
        audience: ["creative", "product"],
        minResponses: 3,
        timeoutSeconds: 600, // 10 minutes
      });

      console.log(`   Question ID: ${submission.questionId}`);

      // Wait for responses with spinner
      const spinner = ora("Waiting for human responses...").start();

      const responses = await this.orchestrator.awaitResponses([submission.questionId], {
        minResponses: 1, // Accept at least 1 response
        timeout: 300000, // Wait up to 5 minutes
      });

      spinner.stop();

      const question = responses[submission.questionId];
      if (!question) {
        throw new Error("No response received");
      }

      // Count votes for each option
      let selectedTone: string;

      if (question.summary) {
        // Find the winning option
        const entries = Object.entries(question.summary);
        if (entries.length > 0) {
          const winner = entries.reduce((a, b) => (a[1] > b[1] ? a : b));
          selectedTone = winner[0];
        } else {
          selectedTone = analysis.toneOptions[0] ?? "Professional";
        }
      } else if (question.responses.length > 0) {
        // Fall back to first response
        const firstResponse = question.responses[0];
        if (firstResponse?.selectedOption !== undefined) {
          selectedTone = analysis.toneOptions[firstResponse.selectedOption] ?? analysis.toneOptions[0] ?? "Professional";
        } else {
          selectedTone = analysis.toneOptions[0] ?? "Professional";
        }
      } else {
        // No responses, use default
        console.log(chalk.yellow("⚠") + " No human responses received, using default tone");
        selectedTone = analysis.toneOptions[0] ?? "Professional";
      }

      console.log(chalk.green("✓") + ` Tone preference received: "${selectedTone}"`);
      return selectedTone;
    } catch (error) {
      if (error instanceof AskHumanError) {
        console.log(chalk.yellow("⚠") + ` Ask-a-Human error: ${error.message}`);
        console.log("   Using default tone");
        return analysis.toneOptions[0] ?? "Professional";
      }
      throw error;
    }
  }

  /**
   * Generate headline options using OpenAI.
   */
  async generateHeadlines(brief: string, analysis: BriefAnalysis, tone: string): Promise<string[]> {
    console.log(chalk.blue("\n💡 Generating headline options..."));

    const prompt = GENERATE_HEADLINES_PROMPT
      .replace("{brief}", brief)
      .replace("{tone}", tone)
      .replace("{contentType}", analysis.contentType)
      .replace("{targetAudience}", analysis.targetAudience);

    const result = await this.callLLM(prompt, true);

    if (typeof result === "string") {
      throw new Error(`Expected JSON response, got: ${result}`);
    }

    const headlines = (result["headlines"] as string[]) ?? [
      "Compelling Headline Option 1",
      "Engaging Headline Option 2",
      "Powerful Headline Option 3",
      "Creative Headline Option 4",
    ];

    console.log(chalk.green("✓") + ` Generated ${headlines.length} headline options`);
    return headlines;
  }

  /**
   * Ask humans to choose the headline.
   */
  async askHumansForHeadline(headlines: string[]): Promise<string> {
    console.log(chalk.blue("\n🧑 Asking humans about headline preference..."));

    try {
      // Submit the question
      const submission = await this.orchestrator.submit({
        prompt: "Which headline is most compelling and would make you want to read more?",
        type: "multiple_choice",
        options: headlines,
        audience: ["creative", "product"],
        minResponses: 3,
        timeoutSeconds: 600,
      });

      console.log(`   Question ID: ${submission.questionId}`);

      // Wait for responses
      const spinner = ora("Waiting for human responses...").start();

      const responses = await this.orchestrator.awaitResponses([submission.questionId], {
        minResponses: 1,
        timeout: 300000,
      });

      spinner.stop();

      const question = responses[submission.questionId];
      if (!question) {
        throw new Error("No response received");
      }

      // Count votes
      let selectedHeadline: string;

      if (question.summary) {
        const entries = Object.entries(question.summary);
        if (entries.length > 0) {
          const winner = entries.reduce((a, b) => (a[1] > b[1] ? a : b));
          selectedHeadline = winner[0];
        } else {
          selectedHeadline = headlines[0] ?? "Untitled";
        }
      } else if (question.responses.length > 0) {
        const firstResponse = question.responses[0];
        if (firstResponse?.selectedOption !== undefined) {
          selectedHeadline = headlines[firstResponse.selectedOption] ?? headlines[0] ?? "Untitled";
        } else {
          selectedHeadline = headlines[0] ?? "Untitled";
        }
      } else {
        console.log(chalk.yellow("⚠") + " No human responses received, using first headline");
        selectedHeadline = headlines[0] ?? "Untitled";
      }

      console.log(chalk.green("✓") + ` Headline selected: "${selectedHeadline}"`);
      return selectedHeadline;
    } catch (error) {
      if (error instanceof AskHumanError) {
        console.log(chalk.yellow("⚠") + ` Ask-a-Human error: ${error.message}`);
        console.log("   Using first headline option");
        return headlines[0] ?? "Untitled";
      }
      throw error;
    }
  }

  /**
   * Generate the final content using OpenAI.
   */
  async generateContent(
    brief: string,
    analysis: BriefAnalysis,
    tone: string,
    headline: string
  ): Promise<string> {
    console.log(chalk.blue("\n📝 Generating final content..."));

    const keyPointsFormatted = analysis.keyPoints.map((point) => `- ${point}`).join("\n");

    const prompt = GENERATE_CONTENT_PROMPT
      .replace("{brief}", brief)
      .replace("{contentType}", analysis.contentType)
      .replace("{targetAudience}", analysis.targetAudience)
      .replace("{tone}", tone)
      .replace("{headline}", headline)
      .replace("{keyPoints}", keyPointsFormatted);

    const content = await this.callLLM(prompt, false);

    if (typeof content !== "string") {
      throw new Error("Expected string response");
    }

    console.log(chalk.green("✓") + " Content generated");
    return content;
  }

  /**
   * Run the full content writing workflow.
   */
  async run(brief: string): Promise<ContentResult> {
    // Step 1: Analyze the brief
    const analysis = await this.analyzeBrief(brief);

    // Step 2: Ask humans for tone (HUMAN DECISION POINT 1)
    const tone = await this.askHumansForTone(analysis);

    // Step 3: Generate headline options
    const headlines = await this.generateHeadlines(brief, analysis, tone);

    // Step 4: Ask humans for headline (HUMAN DECISION POINT 2)
    const headline = await this.askHumansForHeadline(headlines);

    // Step 5: Generate final content
    const content = await this.generateContent(brief, analysis, tone, headline);

    return {
      headline,
      tone,
      content,
      briefAnalysis: analysis,
    };
  }
}
