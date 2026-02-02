/**
 * Ask-a-Human TypeScript SDK
 *
 * Get human input for your AI agents when they're uncertain
 * or need subjective judgment.
 *
 * @example
 * ```typescript
 * import { AskHumanClient, AskHumanOrchestrator } from "@ask-a-human/sdk";
 *
 * // Create a client
 * const client = new AskHumanClient({ agentId: "my-agent" });
 *
 * // Submit a question
 * const result = await client.submitQuestion({
 *   prompt: "Should this error message apologize to the user?",
 *   type: "text",
 *   audience: ["product", "creative"],
 *   minResponses: 5
 * });
 *
 * console.log(`Question submitted: ${result.questionId}`);
 *
 * // Later, check for responses
 * const response = await client.getQuestion(result.questionId);
 *
 * if (response.status === "CLOSED" || response.status === "PARTIAL") {
 *   for (const r of response.responses) {
 *     console.log(`Human said: ${r.answer} (confidence: ${r.confidence})`);
 *   }
 * }
 * ```
 *
 * @packageDocumentation
 */

// Client
export { AskHumanClient } from "./client.js";

// Orchestrator
export { AskHumanOrchestrator } from "./orchestrator.js";

// Errors
export {
  AskHumanError,
  ValidationError,
  QuestionNotFoundError,
  RateLimitError,
  ServerError,
  QuotaExceededError,
  TimeoutError,
  AbortError,
} from "./errors.js";

// Types
export type {
  // Question types
  QuestionType,
  QuestionStatus,
  AudienceTag,
  // Options
  SubmitQuestionOptions,
  ClientOptions,
  OrchestratorOptions,
  AwaitResponsesOptions,
  // Responses
  QuestionSubmission,
  QuestionResponse,
  HumanResponse,
} from "./types.js";
