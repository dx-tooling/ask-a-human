/**
 * Type definitions for Ask-a-Human SDK.
 *
 * This module contains TypeScript types for all data structures used in the SDK.
 * These types match the API responses defined in ADR-03 and PRD-02.
 */

/**
 * Type of question: 'text' for free-form answers, 'multiple_choice' for predefined options.
 */
export type QuestionType = "text" | "multiple_choice";

/**
 * Status of a question:
 * - OPEN: Accepting responses, none received yet
 * - PARTIAL: Has some responses, still accepting more
 * - CLOSED: Required responses reached
 * - EXPIRED: Timeout reached before sufficient responses
 */
export type QuestionStatus = "OPEN" | "PARTIAL" | "CLOSED" | "EXPIRED";

/**
 * Target audience for a question:
 * - technical: Software developers, engineers
 * - product: Product managers, UX designers
 * - ethics: Ethics considerations, safety
 * - creative: Writers, designers, creatives
 * - general: No specific expertise required
 */
export type AudienceTag = "technical" | "product" | "ethics" | "creative" | "general";

/**
 * Options for submitting a question.
 */
export interface SubmitQuestionOptions {
  /**
   * The question text (10-2000 characters).
   */
  prompt: string;

  /**
   * Question type - 'text' for free-form, 'multiple_choice' for options.
   */
  type: QuestionType;

  /**
   * Options for multiple choice questions (2-10 items).
   * Required if type is 'multiple_choice'.
   */
  options?: string[];

  /**
   * Target audience tags. Defaults to ['general'].
   */
  audience?: AudienceTag[];

  /**
   * Minimum responses needed (1-50). Defaults to 5.
   */
  minResponses?: number;

  /**
   * Question expiration in seconds (60-86400). Defaults to 3600.
   */
  timeoutSeconds?: number;

  /**
   * Optional key to prevent duplicate submissions.
   */
  idempotencyKey?: string;
}

/**
 * Response from submitting a question.
 *
 * Returned by the POST /agent/questions endpoint.
 *
 * @example
 * ```typescript
 * const submission = await client.submitQuestion({ prompt: "...", type: "text" });
 * console.log(submission.questionId);
 * // 'q_abc123def456'
 * console.log(submission.pollUrl);
 * // '/agent/questions/q_abc123def456'
 * ```
 */
export interface QuestionSubmission {
  /**
   * Unique identifier for the question (e.g., 'q_abc123def456').
   */
  questionId: string;

  /**
   * Current status of the question.
   */
  status: QuestionStatus;

  /**
   * Relative URL to poll for responses.
   */
  pollUrl: string;

  /**
   * When the question will expire if not enough responses (ISO 8601 string).
   */
  expiresAt: string;

  /**
   * When the question was created (ISO 8601 string).
   */
  createdAt?: string;
}

/**
 * Individual response from a human.
 *
 * For text questions, the `answer` field contains the response.
 * For multiple choice questions, `selectedOption` contains the index.
 *
 * @example
 * ```typescript
 * for (const response of question.responses) {
 *   if (response.answer) {
 *     console.log(`Text: ${response.answer}`);
 *   } else {
 *     console.log(`Selected option: ${response.selectedOption}`);
 *   }
 * }
 * ```
 */
export interface HumanResponse {
  /**
   * Free-text answer for text questions.
   */
  answer?: string;

  /**
   * Index of selected option for multiple choice questions.
   */
  selectedOption?: number;

  /**
   * Human's confidence in their answer (1-5 scale).
   */
  confidence?: number;
}

/**
 * Full question with status and responses.
 *
 * Returned by the GET /agent/questions/{question_id} endpoint.
 *
 * @example
 * ```typescript
 * const response = await client.getQuestion("q_abc123");
 * console.log(`Status: ${response.status}`);
 * console.log(`Got ${response.currentResponses} of ${response.requiredResponses}`);
 * for (const r of response.responses) {
 *   console.log(r.answer || `Option ${r.selectedOption}`);
 * }
 * ```
 */
export interface QuestionResponse {
  /**
   * Unique identifier for the question.
   */
  questionId: string;

  /**
   * Current status of the question.
   */
  status: QuestionStatus;

  /**
   * The original question text.
   */
  prompt: string;

  /**
   * Type of question ('text' or 'multiple_choice').
   */
  type: QuestionType;

  /**
   * Options for multiple choice questions.
   */
  options?: string[];

  /**
   * Number of responses needed to close.
   */
  requiredResponses: number;

  /**
   * Number of responses received so far.
   */
  currentResponses: number;

  /**
   * When the question will expire (ISO 8601 string).
   */
  expiresAt: string;

  /**
   * When the question was closed (ISO 8601 string, if applicable).
   */
  closedAt?: string;

  /**
   * List of human responses.
   */
  responses: HumanResponse[];

  /**
   * For multiple choice questions, vote counts by option text.
   */
  summary?: Record<string, number>;
}

/**
 * Options for awaiting responses.
 */
export interface AwaitResponsesOptions {
  /**
   * Minimum responses needed per question. Defaults to 1.
   */
  minResponses?: number;

  /**
   * Maximum time to wait in milliseconds. Defaults to 3600000 (1 hour).
   */
  timeout?: number;

  /**
   * AbortSignal for cancellation.
   */
  signal?: AbortSignal;
}

/**
 * Options for the orchestrator constructor.
 */
export interface OrchestratorOptions {
  /**
   * Base interval between polls in milliseconds. Defaults to 30000 (30 seconds).
   */
  pollInterval?: number;

  /**
   * Maximum interval between polls in milliseconds. Defaults to 300000 (5 minutes).
   */
  maxBackoff?: number;

  /**
   * Multiplier for exponential backoff. Defaults to 1.5.
   */
  backoffMultiplier?: number;
}

/**
 * Options for the client constructor.
 */
export interface ClientOptions {
  /**
   * API base URL. Defaults to ASK_A_HUMAN_BASE_URL env var or https://api.ask-a-human.com.
   */
  baseUrl?: string;

  /**
   * Agent identifier for rate limiting. Defaults to ASK_A_HUMAN_AGENT_ID env var or 'default'.
   */
  agentId?: string;

  /**
   * HTTP request timeout in milliseconds. Defaults to 30000 (30 seconds).
   */
  timeout?: number;

  /**
   * Custom fetch implementation for testing or custom environments.
   */
  fetch?: typeof globalThis.fetch;
}

// ============================================================================
// Internal types for API communication
// ============================================================================

/**
 * Request body for submitting a question (internal, snake_case for API).
 * @internal
 */
export interface QuestionRequestBody {
  prompt: string;
  type: QuestionType;
  options?: string[];
  audience?: AudienceTag[];
  min_responses?: number;
  timeout_seconds?: number;
  idempotency_key?: string;
}

/**
 * API response for question submission (internal, snake_case from API).
 * @internal
 */
export interface QuestionSubmissionResponse {
  question_id: string;
  status: QuestionStatus;
  poll_url: string;
  expires_at: string;
  created_at?: string;
}

/**
 * API response for human response (internal, snake_case from API).
 * @internal
 */
export interface HumanResponseData {
  answer?: string;
  selected_option?: number;
  confidence?: number;
}

/**
 * API response for question (internal, snake_case from API).
 * @internal
 */
export interface QuestionResponseData {
  question_id: string;
  status: QuestionStatus;
  prompt: string;
  type: QuestionType;
  options?: string[];
  required_responses: number;
  current_responses: number;
  expires_at: string;
  closed_at?: string;
  responses: HumanResponseData[];
  summary?: Record<string, number>;
}

/**
 * API error response (internal).
 * @internal
 */
export interface ApiErrorResponse {
  error: {
    code?: string;
    message: string;
    details?: Record<string, unknown>;
  };
}
