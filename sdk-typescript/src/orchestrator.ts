/**
 * High-level orchestration for Ask-a-Human.
 *
 * This module provides the AskHumanOrchestrator class which handles polling,
 * timeouts, and exponential backoff for async human-in-the-loop workflows.
 *
 * @example
 * ```typescript
 * import { AskHumanClient, AskHumanOrchestrator } from "@ask-a-human/sdk";
 *
 * const client = new AskHumanClient({ agentId: "my-agent" });
 * const orchestrator = new AskHumanOrchestrator(client);
 *
 * const submission = await orchestrator.submit({ prompt: "...", type: "text" });
 * const responses = await orchestrator.awaitResponses([submission.questionId]);
 * ```
 */

import type { AskHumanClient } from "./client.js";
import { AbortError, TimeoutError } from "./errors.js";
import type {
  AwaitResponsesOptions,
  OrchestratorOptions,
  QuestionResponse,
  QuestionSubmission,
  SubmitQuestionOptions,
} from "./types.js";

/** Default poll interval in milliseconds (30 seconds) */
const DEFAULT_POLL_INTERVAL = 30000;

/** Default maximum backoff in milliseconds (5 minutes) */
const DEFAULT_MAX_BACKOFF = 300000;

/** Default backoff multiplier */
const DEFAULT_BACKOFF_MULTIPLIER = 1.5;

/** Default timeout in milliseconds (1 hour) */
const DEFAULT_TIMEOUT = 3600000;

/**
 * High-level orchestrator for async human-in-the-loop workflows.
 *
 * The orchestrator handles common patterns like polling for responses,
 * waiting with timeouts, and exponential backoff. It wraps an AskHumanClient
 * and provides higher-level methods.
 *
 * @example
 * ```typescript
 * const client = new AskHumanClient({ agentId: "my-agent" });
 * const orchestrator = new AskHumanOrchestrator(client, { pollInterval: 30000 });
 *
 * // Submit and wait for responses
 * const submission = await orchestrator.submit({
 *   prompt: "What tone should this use?",
 *   type: "multiple_choice",
 *   options: ["Formal", "Casual"]
 * });
 *
 * const responses = await orchestrator.awaitResponses(
 *   [submission.questionId],
 *   { minResponses: 5, timeout: 300000 }
 * );
 * ```
 */
export class AskHumanOrchestrator {
  /** The underlying AskHumanClient */
  readonly client: AskHumanClient;

  /** Base interval between polls in milliseconds */
  readonly pollInterval: number;

  /** Maximum interval between polls in milliseconds */
  readonly maxBackoff: number;

  /** Multiplier for exponential backoff */
  readonly backoffMultiplier: number;

  /**
   * Initialize the orchestrator.
   *
   * @param client - The AskHumanClient to use for API calls
   * @param options - Orchestrator configuration options
   * @param options.pollInterval - Base interval between polls in milliseconds. Defaults to 30000 (30 seconds)
   * @param options.maxBackoff - Maximum interval between polls in milliseconds. Defaults to 300000 (5 minutes)
   * @param options.backoffMultiplier - Multiplier for exponential backoff. Defaults to 1.5
   *
   * @example
   * ```typescript
   * const client = new AskHumanClient({ agentId: "my-agent" });
   * const orchestrator = new AskHumanOrchestrator(client, {
   *   pollInterval: 15000,  // Start with 15s polls
   *   maxBackoff: 120000,   // Max 2 minutes between polls
   * });
   * ```
   */
  constructor(client: AskHumanClient, options?: OrchestratorOptions) {
    this.client = client;
    this.pollInterval = options?.pollInterval ?? DEFAULT_POLL_INTERVAL;
    this.maxBackoff = options?.maxBackoff ?? DEFAULT_MAX_BACKOFF;
    this.backoffMultiplier = options?.backoffMultiplier ?? DEFAULT_BACKOFF_MULTIPLIER;
  }

  /**
   * Submit a question for humans to answer.
   *
   * This is a convenience wrapper around client.submitQuestion().
   *
   * @param options - Question submission options
   * @returns QuestionSubmission with questionId, status, pollUrl, and expiresAt
   *
   * @example
   * ```typescript
   * const submission = await orchestrator.submit({
   *   prompt: "Which headline is better?",
   *   type: "multiple_choice",
   *   options: ["Option A", "Option B"],
   *   minResponses: 10
   * });
   * console.log(submission.questionId);
   * ```
   */
  async submit(options: SubmitQuestionOptions): Promise<QuestionSubmission> {
    return this.client.submitQuestion(options);
  }

  /**
   * Poll for the current status of questions.
   *
   * This is a non-blocking call that returns immediately with the current
   * status of each question.
   *
   * @param questionIds - List of question IDs to check
   * @returns Record mapping questionId to QuestionResponse
   *
   * @example
   * ```typescript
   * const responses = await orchestrator.pollOnce(["q_abc123", "q_def456"]);
   * for (const [qid, response] of Object.entries(responses)) {
   *   console.log(`${qid}: ${response.status} (${response.currentResponses} responses)`);
   * }
   * ```
   */
  async pollOnce(questionIds: string[]): Promise<Record<string, QuestionResponse>> {
    const results: Record<string, QuestionResponse> = {};

    // Poll all questions in parallel
    const promises = questionIds.map(async (questionId) => {
      const response = await this.client.getQuestion(questionId);
      results[questionId] = response;
    });

    await Promise.all(promises);

    return results;
  }

  /**
   * Wait for responses to questions.
   *
   * Polls periodically until either:
   * - All questions have at least minResponses, or
   * - All questions are CLOSED or EXPIRED, or
   * - The timeout is reached, or
   * - The operation is aborted via AbortSignal
   *
   * Uses exponential backoff to reduce API load during long waits.
   *
   * @param questionIds - List of question IDs to wait for
   * @param options - Options for waiting
   * @param options.minResponses - Minimum responses needed per question. Defaults to 1
   * @param options.timeout - Maximum time to wait in milliseconds. Defaults to 3600000 (1 hour)
   * @param options.signal - AbortSignal for cancellation
   *
   * @returns Record mapping questionId to QuestionResponse. May return partial results if timeout is reached.
   *
   * @throws {TimeoutError} If timeout is reached (only when no partial results available)
   * @throws {AbortError} If the operation is aborted via AbortSignal
   *
   * @example
   * ```typescript
   * // Wait up to 5 minutes for at least 5 responses
   * const responses = await orchestrator.awaitResponses(
   *   ["q_abc123"],
   *   { minResponses: 5, timeout: 300000 }
   * );
   *
   * const question = responses["q_abc123"];
   * if (question.status === "CLOSED") {
   *   console.log("Got all responses!");
   * } else if (question.status === "PARTIAL") {
   *   console.log(`Got ${question.currentResponses} partial responses`);
   * }
   * ```
   */
  async awaitResponses(
    questionIds: string[],
    options?: AwaitResponsesOptions
  ): Promise<Record<string, QuestionResponse>> {
    const minResponses = options?.minResponses ?? 1;
    const timeout = options?.timeout ?? DEFAULT_TIMEOUT;
    const signal = options?.signal;

    const startTime = Date.now();
    let currentInterval = this.pollInterval;
    let results: Record<string, QuestionResponse> = {};

    while (true) {
      // Check for abort
      if (signal?.aborted) {
        throw new AbortError("Operation aborted");
      }

      // Poll all questions
      results = await this.pollOnce(questionIds);

      // Check if all questions are done
      const allDone = this.checkAllDone(results, minResponses);

      if (allDone) {
        return results;
      }

      // Check timeout
      const elapsed = Date.now() - startTime;
      if (elapsed >= timeout) {
        // Return partial results
        return results;
      }

      // Calculate sleep time (don't sleep past timeout)
      const remaining = timeout - elapsed;
      const sleepTime = Math.min(currentInterval, remaining);

      if (sleepTime > 0) {
        await this.sleep(sleepTime, signal);
      }

      // Exponential backoff for next iteration
      currentInterval = Math.min(currentInterval * this.backoffMultiplier, this.maxBackoff);
    }
  }

  /**
   * Submit a question and wait for responses.
   *
   * Convenience method that combines submit() and awaitResponses().
   *
   * @param options - Question submission options
   * @param awaitOptions - Options for waiting
   *
   * @returns QuestionResponse with status and responses
   *
   * @example
   * ```typescript
   * const response = await orchestrator.submitAndWait(
   *   {
   *     prompt: "Should we proceed with option A or B?",
   *     type: "multiple_choice",
   *     options: ["Option A", "Option B"],
   *     minResponses: 5,
   *   },
   *   { timeout: 300000 }  // Wait up to 5 minutes
   * );
   *
   * console.log(`Status: ${response.status}`);
   * for (const r of response.responses) {
   *   console.log(`  Option ${r.selectedOption}`);
   * }
   * ```
   */
  async submitAndWait(
    options: SubmitQuestionOptions,
    awaitOptions?: AwaitResponsesOptions
  ): Promise<QuestionResponse> {
    const submission = await this.submit(options);

    // Use the submission's minResponses if not specified in await options
    const minResponses = awaitOptions?.minResponses ?? options.minResponses ?? 1;

    // Use the submission's timeout if not specified in await options
    const timeout =
      awaitOptions?.timeout ?? (options.timeoutSeconds ? options.timeoutSeconds * 1000 : undefined);

    const results = await this.awaitResponses([submission.questionId], {
      ...awaitOptions,
      minResponses,
      timeout,
    });

    const result = results[submission.questionId];
    if (!result) {
      throw new TimeoutError(
        `No response received for question ${submission.questionId}`,
        awaitOptions?.timeout
      );
    }

    return result;
  }

  /**
   * Check if all questions are done.
   *
   * A question is done if:
   * - It has enough responses (>= minResponses)
   * - It's CLOSED
   * - It's EXPIRED
   *
   * @internal
   */
  private checkAllDone(
    results: Record<string, QuestionResponse>,
    minResponses: number
  ): boolean {
    for (const response of Object.values(results)) {
      // Question is done if it's CLOSED or EXPIRED
      if (response.status === "CLOSED" || response.status === "EXPIRED") {
        continue;
      }

      // Question is done if it has enough responses
      if (response.currentResponses >= minResponses) {
        continue;
      }

      // This question is not done
      return false;
    }

    return true;
  }

  /**
   * Sleep for a specified duration, with abort support.
   *
   * @internal
   */
  private sleep(ms: number, signal?: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      if (signal?.aborted) {
        reject(new AbortError("Operation aborted"));
        return;
      }

      const timeoutId = setTimeout(resolve, ms);

      if (signal) {
        const abortHandler = () => {
          clearTimeout(timeoutId);
          reject(new AbortError("Operation aborted"));
        };

        signal.addEventListener("abort", abortHandler, { once: true });

        // Clean up the abort handler when the timeout completes
        const originalResolve = resolve;
        resolve = () => {
          signal.removeEventListener("abort", abortHandler);
          originalResolve();
        };
      }
    });
  }
}
