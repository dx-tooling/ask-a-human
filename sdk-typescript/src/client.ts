/**
 * Low-level API client for Ask-a-Human.
 *
 * This module provides the AskHumanClient class which wraps the Ask-a-Human
 * HTTP API. For higher-level orchestration with polling and timeouts, see
 * the AskHumanOrchestrator class.
 *
 * @example
 * ```typescript
 * import { AskHumanClient } from "@ask-a-human/sdk";
 *
 * const client = new AskHumanClient({ agentId: "my-agent" });
 * const result = await client.submitQuestion({
 *   prompt: "Should this error apologize?",
 *   type: "text"
 * });
 * const response = await client.getQuestion(result.questionId);
 * ```
 */

import {
  AskHumanError,
  QuestionNotFoundError,
  QuotaExceededError,
  RateLimitError,
  ServerError,
  ValidationError,
} from "./errors.js";
import type {
  ApiErrorResponse,
  ClientOptions,
  HumanResponse,
  HumanResponseData,
  QuestionRequestBody,
  QuestionResponse,
  QuestionResponseData,
  QuestionSubmission,
  QuestionSubmissionResponse,
  SubmitQuestionOptions,
} from "./types.js";

/** Default API base URL */
const DEFAULT_BASE_URL = "https://api.ask-a-human.com";

/** Default HTTP request timeout in milliseconds */
const DEFAULT_TIMEOUT = 30000;

/**
 * Low-level client for the Ask-a-Human API.
 *
 * This client provides direct access to the API endpoints. For higher-level
 * functionality like polling and timeouts, use AskHumanOrchestrator instead.
 *
 * @example
 * ```typescript
 * const client = new AskHumanClient({ agentId: "my-agent" });
 *
 * // Submit a question
 * const result = await client.submitQuestion({
 *   prompt: "What tone should this email use?",
 *   type: "multiple_choice",
 *   options: ["Formal", "Casual", "Friendly"]
 * });
 * console.log(result.questionId); // 'q_abc123'
 *
 * // Check for responses
 * const response = await client.getQuestion(result.questionId);
 * console.log(response.status); // 'PARTIAL'
 * ```
 */
export class AskHumanClient {
  /** The API base URL */
  readonly baseUrl: string;

  /** The agent identifier for rate limiting */
  readonly agentId: string;

  /** HTTP request timeout in milliseconds */
  readonly timeout: number;

  /** The fetch implementation to use */
  private readonly fetchImpl: typeof globalThis.fetch;

  /**
   * Initialize the client.
   *
   * @param options - Client configuration options
   * @param options.baseUrl - API base URL. Defaults to ASK_A_HUMAN_BASE_URL env var
   *   or https://api.ask-a-human.com.
   * @param options.agentId - Agent identifier for rate limiting. Defaults to
   *   ASK_A_HUMAN_AGENT_ID env var or 'default'.
   * @param options.timeout - HTTP request timeout in milliseconds. Defaults to 30000.
   * @param options.fetch - Custom fetch implementation for testing or custom environments.
   *
   * @example
   * ```typescript
   * // Using defaults
   * const client = new AskHumanClient({ agentId: "my-agent" });
   *
   * // Custom configuration
   * const client = new AskHumanClient({
   *   baseUrl: "https://api.example.com",
   *   agentId: "my-agent",
   *   timeout: 60000
   * });
   * ```
   */
  constructor(options?: ClientOptions) {
    this.baseUrl = options?.baseUrl ?? process.env["ASK_A_HUMAN_BASE_URL"] ?? DEFAULT_BASE_URL;
    this.agentId = options?.agentId ?? process.env["ASK_A_HUMAN_AGENT_ID"] ?? "default";
    this.timeout = options?.timeout ?? DEFAULT_TIMEOUT;
    this.fetchImpl = options?.fetch ?? globalThis.fetch;
  }

  /**
   * Submit a question for humans to answer.
   *
   * @param options - Question submission options
   * @param options.prompt - The question text (10-2000 characters)
   * @param options.type - Question type - 'text' for free-form, 'multiple_choice' for options
   * @param options.options - Options for multiple choice questions (2-10 items)
   * @param options.audience - Target audience tags. Defaults to ['general']
   * @param options.minResponses - Minimum responses needed (1-50). Defaults to 5
   * @param options.timeoutSeconds - Question expiration in seconds (60-86400). Defaults to 3600
   * @param options.idempotencyKey - Optional key to prevent duplicate submissions
   *
   * @returns QuestionSubmission with questionId, status, pollUrl, and expiresAt
   *
   * @throws {ValidationError} If the request is invalid
   * @throws {RateLimitError} If rate limit is exceeded
   * @throws {QuotaExceededError} If too many concurrent questions
   * @throws {ServerError} If the server returns a 5xx error
   * @throws {AskHumanError} For other API errors
   *
   * @example
   * ```typescript
   * // Text question
   * const result = await client.submitQuestion({
   *   prompt: "Should error messages apologize to users?",
   *   type: "text",
   *   audience: ["product", "creative"],
   *   minResponses: 5
   * });
   *
   * // Multiple choice question
   * const result = await client.submitQuestion({
   *   prompt: "Which button label is clearer?",
   *   type: "multiple_choice",
   *   options: ["Submit", "Send", "Confirm"],
   *   minResponses: 10
   * });
   * ```
   */
  async submitQuestion(options: SubmitQuestionOptions): Promise<QuestionSubmission> {
    // Build request body (convert to snake_case for API)
    const body: QuestionRequestBody = {
      prompt: options.prompt,
      type: options.type,
    };

    if (options.options !== undefined) {
      body.options = options.options;
    }
    if (options.audience !== undefined) {
      body.audience = options.audience;
    }
    if (options.minResponses !== undefined) {
      body.min_responses = options.minResponses;
    }
    if (options.timeoutSeconds !== undefined) {
      body.timeout_seconds = options.timeoutSeconds;
    }
    if (options.idempotencyKey !== undefined) {
      body.idempotency_key = options.idempotencyKey;
    }

    // Send request
    const response = await this.request<QuestionSubmissionResponse>(
      "POST",
      "/agent/questions",
      body
    );

    // Convert to camelCase
    return this.convertSubmission(response);
  }

  /**
   * Get a question's status and responses.
   *
   * @param questionId - The question ID to retrieve
   *
   * @returns QuestionResponse with full question details and responses
   *
   * @throws {QuestionNotFoundError} If the question doesn't exist
   * @throws {RateLimitError} If rate limit is exceeded
   * @throws {ServerError} If the server returns a 5xx error
   * @throws {AskHumanError} For other API errors
   *
   * @example
   * ```typescript
   * const response = await client.getQuestion("q_abc123");
   * console.log(`Status: ${response.status}`);
   * console.log(`Responses: ${response.currentResponses}/${response.requiredResponses}`);
   * for (const r of response.responses) {
   *   console.log(`  ${r.answer ?? r.selectedOption}`);
   * }
   * ```
   */
  async getQuestion(questionId: string): Promise<QuestionResponse> {
    const response = await this.request<QuestionResponseData>(
      "GET",
      `/agent/questions/${questionId}`
    );

    // Convert to camelCase
    return this.convertResponse(response);
  }

  /**
   * Make an HTTP request to the API.
   *
   * @internal
   */
  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const url = `${this.baseUrl}${path}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await this.fetchImpl(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "X-Agent-Id": this.agentId,
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      await this.handleErrors(response, path);

      return (await response.json()) as T;
    } catch (error) {
      clearTimeout(timeoutId);

      // Handle abort (timeout)
      if (error instanceof Error && error.name === "AbortError") {
        throw new AskHumanError(`Request timeout after ${this.timeout}ms`, "TIMEOUT");
      }

      // Re-throw our errors
      if (error instanceof AskHumanError) {
        throw error;
      }

      // Wrap unknown errors
      throw new AskHumanError(
        error instanceof Error ? error.message : "Unknown error occurred",
        "UNKNOWN_ERROR"
      );
    }
  }

  /**
   * Handle HTTP error responses.
   *
   * @internal
   */
  private async handleErrors(response: Response, path: string): Promise<void> {
    if (response.ok) {
      return;
    }

    // Try to parse error response
    let errorData: ApiErrorResponse["error"] | undefined;
    try {
      const json = (await response.json()) as ApiErrorResponse;
      errorData = json.error;
    } catch {
      // Ignore JSON parse errors
    }

    const message = errorData?.message ?? `HTTP ${response.status}`;
    const code = errorData?.code;
    const details = errorData?.details as Record<string, unknown> | undefined;

    if (response.status === 400) {
      throw new ValidationError(message, code, details);
    }

    if (response.status === 403) {
      throw new QuotaExceededError(message, code, details);
    }

    if (response.status === 404) {
      // Extract question ID from path if available
      const questionIdMatch = path.match(/\/agent\/questions\/([^/]+)/);
      const questionId = questionIdMatch?.[1];
      throw new QuestionNotFoundError(message, questionId, code, details);
    }

    if (response.status === 429) {
      // Extract rate limit headers
      const retryAfter = response.headers.get("Retry-After");
      const limit = response.headers.get("X-RateLimit-Limit");
      const remaining = response.headers.get("X-RateLimit-Remaining");
      const reset = response.headers.get("X-RateLimit-Reset");

      throw new RateLimitError(message, {
        retryAfter: retryAfter ? parseInt(retryAfter, 10) : undefined,
        limit: limit ? parseInt(limit, 10) : undefined,
        remaining: remaining ? parseInt(remaining, 10) : undefined,
        reset: reset ? parseInt(reset, 10) : undefined,
        code,
        details,
      });
    }

    if (response.status >= 500) {
      throw new ServerError(message, response.status, code, details);
    }

    // Unknown error
    throw new AskHumanError(message, code, details);
  }

  /**
   * Convert API submission response to SDK type.
   *
   * @internal
   */
  private convertSubmission(data: QuestionSubmissionResponse): QuestionSubmission {
    return {
      questionId: data.question_id,
      status: data.status,
      pollUrl: data.poll_url,
      expiresAt: data.expires_at,
      createdAt: data.created_at,
    };
  }

  /**
   * Convert API question response to SDK type.
   *
   * @internal
   */
  private convertResponse(data: QuestionResponseData): QuestionResponse {
    return {
      questionId: data.question_id,
      status: data.status,
      prompt: data.prompt,
      type: data.type,
      options: data.options,
      requiredResponses: data.required_responses,
      currentResponses: data.current_responses,
      expiresAt: data.expires_at,
      closedAt: data.closed_at,
      responses: data.responses.map((r) => this.convertHumanResponse(r)),
      summary: data.summary,
    };
  }

  /**
   * Convert API human response to SDK type.
   *
   * @internal
   */
  private convertHumanResponse(data: HumanResponseData): HumanResponse {
    return {
      answer: data.answer,
      selectedOption: data.selected_option,
      confidence: data.confidence,
    };
  }
}
