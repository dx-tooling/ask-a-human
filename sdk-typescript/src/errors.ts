/**
 * Custom errors for Ask-a-Human SDK.
 *
 * This module defines the error hierarchy for handling API errors.
 * All errors inherit from AskHumanError for easy catching.
 *
 * @example
 * ```typescript
 * import { AskHumanError, RateLimitError } from "@ask-a-human/sdk";
 *
 * try {
 *   await client.submitQuestion({ ... });
 * } catch (e) {
 *   if (e instanceof RateLimitError) {
 *     console.log(`Rate limited, retry after: ${e.retryAfter}`);
 *   } else if (e instanceof AskHumanError) {
 *     console.log(`API error: ${e.message}`);
 *   }
 * }
 * ```
 */

/**
 * Base error for all Ask-a-Human errors.
 *
 * All SDK errors inherit from this class, making it easy to catch
 * any Ask-a-Human related error.
 *
 * @example
 * ```typescript
 * try {
 *   await client.submitQuestion({ ... });
 * } catch (e) {
 *   if (e instanceof AskHumanError) {
 *     console.log(`Error: ${e.message}`);
 *     if (e.code) {
 *       console.log(`Code: ${e.code}`);
 *     }
 *   }
 * }
 * ```
 */
export class AskHumanError extends Error {
  /**
   * Error code from the API (if available).
   */
  readonly code?: string;

  /**
   * Additional error details from the API (if available).
   */
  readonly details: Record<string, unknown>;

  constructor(message: string, code?: string, details?: Record<string, unknown>) {
    super(message);
    this.name = "AskHumanError";
    this.code = code;
    this.details = details ?? {};

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  override toString(): string {
    if (this.code) {
      return `[${this.code}] ${this.message}`;
    }
    return this.message;
  }
}

/**
 * Raised when the request is invalid (HTTP 400).
 *
 * This error occurs when the request body fails validation,
 * such as missing required fields or invalid values.
 *
 * @example
 * ```typescript
 * try {
 *   await client.submitQuestion({ prompt: "Hi", type: "text" }); // Too short
 * } catch (e) {
 *   if (e instanceof ValidationError) {
 *     console.log(`Invalid field: ${e.field}`);
 *   }
 * }
 * ```
 */
export class ValidationError extends AskHumanError {
  /**
   * The field that failed validation (if available).
   */
  readonly field?: string;

  /**
   * The constraint that was violated (if available).
   */
  readonly constraint?: string;

  constructor(message: string, code?: string, details?: Record<string, unknown>) {
    super(message, code ?? "VALIDATION_ERROR", details);
    this.name = "ValidationError";
    this.field = details?.["field"] as string | undefined;
    this.constraint = details?.["constraint"] as string | undefined;
  }
}

/**
 * Raised when a question is not found (HTTP 404).
 *
 * This error occurs when trying to retrieve a question that doesn't exist
 * or has been deleted.
 *
 * @example
 * ```typescript
 * try {
 *   await client.getQuestion("q_nonexistent");
 * } catch (e) {
 *   if (e instanceof QuestionNotFoundError) {
 *     console.log(`Question not found: ${e.questionId}`);
 *   }
 * }
 * ```
 */
export class QuestionNotFoundError extends AskHumanError {
  /**
   * The question ID that was not found.
   */
  readonly questionId?: string;

  constructor(
    message: string,
    questionId?: string,
    code?: string,
    details?: Record<string, unknown>
  ) {
    super(message, code ?? "QUESTION_NOT_FOUND", details);
    this.name = "QuestionNotFoundError";
    this.questionId = questionId;
  }
}

/**
 * Raised when rate limit is exceeded (HTTP 429).
 *
 * This error occurs when too many requests have been made.
 * Check the `retryAfter` attribute to know when to retry.
 *
 * @example
 * ```typescript
 * try {
 *   await client.submitQuestion({ ... });
 * } catch (e) {
 *   if (e instanceof RateLimitError) {
 *     if (e.retryAfter) {
 *       await sleep(e.retryAfter * 1000);
 *       // Retry the request
 *     }
 *   }
 * }
 * ```
 */
export class RateLimitError extends AskHumanError {
  /**
   * Seconds to wait before retrying (if provided by API).
   */
  readonly retryAfter?: number;

  /**
   * The rate limit ceiling.
   */
  readonly limit?: number;

  /**
   * Remaining requests in the current window.
   */
  readonly remaining?: number;

  /**
   * Unix timestamp when the limit resets.
   */
  readonly reset?: number;

  constructor(
    message: string,
    options?: {
      retryAfter?: number;
      limit?: number;
      remaining?: number;
      reset?: number;
      code?: string;
      details?: Record<string, unknown>;
    }
  ) {
    super(message, options?.code ?? "RATE_LIMITED", options?.details);
    this.name = "RateLimitError";
    this.retryAfter = options?.retryAfter;
    this.limit = options?.limit;
    this.remaining = options?.remaining;
    this.reset = options?.reset;
  }
}

/**
 * Raised when the server returns a 5xx error.
 *
 * This error indicates a server-side problem. The request can typically
 * be retried after a short delay.
 *
 * @example
 * ```typescript
 * try {
 *   await client.submitQuestion({ ... });
 * } catch (e) {
 *   if (e instanceof ServerError) {
 *     console.log(`Server error (HTTP ${e.statusCode}): ${e.message}`);
 *     // Implement retry logic
 *   }
 * }
 * ```
 */
export class ServerError extends AskHumanError {
  /**
   * The HTTP status code (500, 502, 503, etc.).
   */
  readonly statusCode: number;

  constructor(message: string, statusCode = 500, code?: string, details?: Record<string, unknown>) {
    super(message, code ?? "SERVER_ERROR", details);
    this.name = "ServerError";
    this.statusCode = statusCode;
  }
}

/**
 * Raised when the agent has too many concurrent questions (HTTP 403).
 *
 * This error occurs when the agent has reached its limit of concurrent
 * open questions. Wait for some questions to close before submitting more.
 *
 * @example
 * ```typescript
 * try {
 *   await client.submitQuestion({ ... });
 * } catch (e) {
 *   if (e instanceof QuotaExceededError) {
 *     console.log("Too many open questions, wait for some to close");
 *   }
 * }
 * ```
 */
export class QuotaExceededError extends AskHumanError {
  constructor(message: string, code?: string, details?: Record<string, unknown>) {
    super(message, code ?? "AGENT_QUOTA_EXCEEDED", details);
    this.name = "QuotaExceededError";
  }
}

/**
 * Raised when a request times out.
 *
 * This error occurs when the HTTP request or polling operation
 * exceeds the configured timeout.
 *
 * @example
 * ```typescript
 * try {
 *   await orchestrator.awaitResponses(questionIds, { timeout: 60000 });
 * } catch (e) {
 *   if (e instanceof TimeoutError) {
 *     console.log("Operation timed out, consider increasing timeout");
 *   }
 * }
 * ```
 */
export class TimeoutError extends AskHumanError {
  /**
   * The timeout value in milliseconds that was exceeded.
   */
  readonly timeoutMs?: number;

  constructor(message: string, timeoutMs?: number, code?: string) {
    super(message, code ?? "TIMEOUT");
    this.name = "TimeoutError";
    this.timeoutMs = timeoutMs;
  }
}

/**
 * Raised when an operation is aborted via AbortController.
 *
 * This error occurs when the user cancels an operation using an AbortSignal.
 *
 * @example
 * ```typescript
 * const controller = new AbortController();
 *
 * // Cancel after 10 seconds
 * setTimeout(() => controller.abort(), 10000);
 *
 * try {
 *   await orchestrator.awaitResponses(questionIds, { signal: controller.signal });
 * } catch (e) {
 *   if (e instanceof AbortError) {
 *     console.log("Operation was cancelled");
 *   }
 * }
 * ```
 */
export class AbortError extends AskHumanError {
  constructor(message = "Operation aborted") {
    super(message, "ABORTED");
    this.name = "AbortError";
  }
}
