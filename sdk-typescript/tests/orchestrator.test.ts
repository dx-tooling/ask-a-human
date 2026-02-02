import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AskHumanClient } from "../src/client.js";
import { AbortError } from "../src/errors.js";
import { AskHumanOrchestrator } from "../src/orchestrator.js";
import type { QuestionResponse, QuestionSubmission } from "../src/types.js";

describe("AskHumanOrchestrator", () => {
  let mockClient: {
    submitQuestion: ReturnType<typeof vi.fn>;
    getQuestion: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockClient = {
      submitQuestion: vi.fn(),
      getQuestion: vi.fn(),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("constructor", () => {
    it("uses default values when no options provided", () => {
      const orch = new AskHumanOrchestrator(mockClient as unknown as AskHumanClient);

      expect(orch.pollInterval).toBe(30000);
      expect(orch.maxBackoff).toBe(300000);
      expect(orch.backoffMultiplier).toBe(1.5);
    });

    it("uses provided options", () => {
      const orch = new AskHumanOrchestrator(mockClient as unknown as AskHumanClient, {
        pollInterval: 1000,
        maxBackoff: 5000,
        backoffMultiplier: 2,
      });

      expect(orch.pollInterval).toBe(1000);
      expect(orch.maxBackoff).toBe(5000);
      expect(orch.backoffMultiplier).toBe(2);
    });
  });

  describe("submit", () => {
    it("delegates to client.submitQuestion", async () => {
      const submission: QuestionSubmission = {
        questionId: "q_abc123",
        status: "OPEN",
        pollUrl: "/agent/questions/q_abc123",
        expiresAt: "2026-02-02T15:00:00Z",
      };

      mockClient.submitQuestion.mockResolvedValueOnce(submission);

      const orchestrator = new AskHumanOrchestrator(mockClient as unknown as AskHumanClient);
      const result = await orchestrator.submit({
        prompt: "Test question",
        type: "text",
      });

      expect(result).toEqual(submission);
      expect(mockClient.submitQuestion).toHaveBeenCalledWith({
        prompt: "Test question",
        type: "text",
      });
    });
  });

  describe("pollOnce", () => {
    it("polls all questions in parallel", async () => {
      const response1: QuestionResponse = {
        questionId: "q_abc123",
        status: "PARTIAL",
        prompt: "Question 1",
        type: "text",
        requiredResponses: 5,
        currentResponses: 2,
        expiresAt: "2026-02-02T15:00:00Z",
        responses: [],
      };

      const response2: QuestionResponse = {
        questionId: "q_def456",
        status: "CLOSED",
        prompt: "Question 2",
        type: "text",
        requiredResponses: 5,
        currentResponses: 5,
        expiresAt: "2026-02-02T15:00:00Z",
        responses: [],
      };

      mockClient.getQuestion
        .mockResolvedValueOnce(response1)
        .mockResolvedValueOnce(response2);

      const orchestrator = new AskHumanOrchestrator(mockClient as unknown as AskHumanClient);
      const results = await orchestrator.pollOnce(["q_abc123", "q_def456"]);

      expect(results).toEqual({
        q_abc123: response1,
        q_def456: response2,
      });

      expect(mockClient.getQuestion).toHaveBeenCalledTimes(2);
    });
  });

  describe("awaitResponses", () => {
    it("returns immediately if all questions are done", async () => {
      const response: QuestionResponse = {
        questionId: "q_abc123",
        status: "CLOSED",
        prompt: "Question",
        type: "text",
        requiredResponses: 5,
        currentResponses: 5,
        expiresAt: "2026-02-02T15:00:00Z",
        responses: [],
      };

      mockClient.getQuestion.mockResolvedValueOnce(response);

      const orchestrator = new AskHumanOrchestrator(mockClient as unknown as AskHumanClient);
      const results = await orchestrator.awaitResponses(["q_abc123"]);

      expect(results).toEqual({ q_abc123: response });
      expect(mockClient.getQuestion).toHaveBeenCalledTimes(1);
    });

    it("returns immediately if minResponses is met", async () => {
      const response: QuestionResponse = {
        questionId: "q_abc123",
        status: "PARTIAL",
        prompt: "Question",
        type: "text",
        requiredResponses: 10,
        currentResponses: 5,
        expiresAt: "2026-02-02T15:00:00Z",
        responses: [],
      };

      mockClient.getQuestion.mockResolvedValueOnce(response);

      const orchestrator = new AskHumanOrchestrator(mockClient as unknown as AskHumanClient);
      const results = await orchestrator.awaitResponses(["q_abc123"], { minResponses: 3 });

      expect(results).toEqual({ q_abc123: response });
      expect(mockClient.getQuestion).toHaveBeenCalledTimes(1);
    });

    it("returns when question status is EXPIRED", async () => {
      const openResponse: QuestionResponse = {
        questionId: "q_abc123",
        status: "OPEN",
        prompt: "Question",
        type: "text",
        requiredResponses: 5,
        currentResponses: 0,
        expiresAt: "2026-02-02T15:00:00Z",
        responses: [],
      };

      const expiredResponse: QuestionResponse = {
        ...openResponse,
        status: "EXPIRED",
      };

      mockClient.getQuestion
        .mockResolvedValueOnce(openResponse)
        .mockResolvedValueOnce(expiredResponse);

      const orchestrator = new AskHumanOrchestrator(mockClient as unknown as AskHumanClient, {
        pollInterval: 10, // Fast polling for test
        maxBackoff: 100,
        backoffMultiplier: 2,
      });

      const results = await orchestrator.awaitResponses(["q_abc123"], { timeout: 10000 });

      expect(results.q_abc123.status).toBe("EXPIRED");
      expect(mockClient.getQuestion).toHaveBeenCalledTimes(2);
    });

    it("returns partial results on timeout", async () => {
      const partialResponse: QuestionResponse = {
        questionId: "q_abc123",
        status: "PARTIAL",
        prompt: "Question",
        type: "text",
        requiredResponses: 10,
        currentResponses: 3,
        expiresAt: "2026-02-02T15:00:00Z",
        responses: [],
      };

      // Always return partial response
      mockClient.getQuestion.mockResolvedValue(partialResponse);

      const orchestrator = new AskHumanOrchestrator(mockClient as unknown as AskHumanClient, {
        pollInterval: 50,
        maxBackoff: 100,
        backoffMultiplier: 2,
      });

      // Short timeout should return partial results
      const results = await orchestrator.awaitResponses(["q_abc123"], {
        minResponses: 5,
        timeout: 100, // 100ms timeout
      });

      expect(results.q_abc123.status).toBe("PARTIAL");
      expect(results.q_abc123.currentResponses).toBe(3);
    });

    it("polls until question is closed", async () => {
      // First call returns OPEN, second call returns CLOSED
      const openResponse: QuestionResponse = {
        questionId: "q_abc123",
        status: "OPEN",
        prompt: "Question",
        type: "text",
        requiredResponses: 5,
        currentResponses: 0,
        expiresAt: "2026-02-02T15:00:00Z",
        responses: [],
      };

      const closedResponse: QuestionResponse = {
        ...openResponse,
        status: "CLOSED",
        currentResponses: 5,
      };

      mockClient.getQuestion
        .mockResolvedValueOnce(openResponse)
        .mockResolvedValueOnce(closedResponse);

      const orchestrator = new AskHumanOrchestrator(mockClient as unknown as AskHumanClient, {
        pollInterval: 10,
        maxBackoff: 100,
        backoffMultiplier: 2,
      });

      const results = await orchestrator.awaitResponses(["q_abc123"], {
        timeout: 10000,
      });

      expect(results.q_abc123.status).toBe("CLOSED");
      expect(mockClient.getQuestion).toHaveBeenCalledTimes(2);
    });

    it("makes multiple polls before timeout", async () => {
      const partialResponse: QuestionResponse = {
        questionId: "q_abc123",
        status: "PARTIAL",
        prompt: "Question",
        type: "text",
        requiredResponses: 10,
        currentResponses: 3,
        expiresAt: "2026-02-02T15:00:00Z",
        responses: [],
      };

      mockClient.getQuestion.mockResolvedValue(partialResponse);

      const orchestrator = new AskHumanOrchestrator(mockClient as unknown as AskHumanClient, {
        pollInterval: 20,
        maxBackoff: 100,
        backoffMultiplier: 1.5,
      });

      // Timeout of 200ms with 20ms poll interval should allow several polls
      const results = await orchestrator.awaitResponses(["q_abc123"], {
        timeout: 200,
        minResponses: 10, // More than currentResponses
      });

      // Should return partial results
      expect(results.q_abc123.status).toBe("PARTIAL");
      // Should have made multiple calls
      expect(mockClient.getQuestion.mock.calls.length).toBeGreaterThanOrEqual(2);
    });

    it("respects abort signal during polling", async () => {
      // Test that the function checks abort signal at the start of the loop
      const partialResponse: QuestionResponse = {
        questionId: "q_abc123",
        status: "PARTIAL",
        prompt: "Question",
        type: "text",
        requiredResponses: 10,
        currentResponses: 1,
        expiresAt: "2026-02-02T15:00:00Z",
        responses: [],
      };

      // Create an abort controller that's already aborted
      const controller = new AbortController();
      controller.abort();

      mockClient.getQuestion.mockResolvedValue(partialResponse);

      const orchestrator = new AskHumanOrchestrator(mockClient as unknown as AskHumanClient, {
        pollInterval: 10,
        maxBackoff: 100,
        backoffMultiplier: 2,
      });

      // Should throw immediately because signal is already aborted
      await expect(
        orchestrator.awaitResponses(["q_abc123"], {
          timeout: 30000,
          signal: controller.signal,
        })
      ).rejects.toThrow(AbortError);

      // Should not have made any API calls since abort was checked first
      expect(mockClient.getQuestion).toHaveBeenCalledTimes(0);
    });
  });

  describe("submitAndWait", () => {
    it("submits and waits for responses", async () => {
      const submission: QuestionSubmission = {
        questionId: "q_abc123",
        status: "OPEN",
        pollUrl: "/agent/questions/q_abc123",
        expiresAt: "2026-02-02T15:00:00Z",
      };

      const response: QuestionResponse = {
        questionId: "q_abc123",
        status: "CLOSED",
        prompt: "Question",
        type: "text",
        requiredResponses: 5,
        currentResponses: 5,
        expiresAt: "2026-02-02T15:00:00Z",
        responses: [{ answer: "Test answer", confidence: 4 }],
      };

      mockClient.submitQuestion.mockResolvedValueOnce(submission);
      mockClient.getQuestion.mockResolvedValueOnce(response);

      const orchestrator = new AskHumanOrchestrator(mockClient as unknown as AskHumanClient);
      const result = await orchestrator.submitAndWait({
        prompt: "Test question",
        type: "text",
        minResponses: 5,
      });

      expect(result).toEqual(response);
      expect(mockClient.submitQuestion).toHaveBeenCalledTimes(1);
      expect(mockClient.getQuestion).toHaveBeenCalledTimes(1);
    });

    it("uses submission minResponses if not specified in await options", async () => {
      const submission: QuestionSubmission = {
        questionId: "q_abc123",
        status: "OPEN",
        pollUrl: "/agent/questions/q_abc123",
        expiresAt: "2026-02-02T15:00:00Z",
      };

      const partialResponse: QuestionResponse = {
        questionId: "q_abc123",
        status: "PARTIAL",
        prompt: "Question",
        type: "text",
        requiredResponses: 10,
        currentResponses: 5,
        expiresAt: "2026-02-02T15:00:00Z",
        responses: [],
      };

      mockClient.submitQuestion.mockResolvedValueOnce(submission);
      mockClient.getQuestion.mockResolvedValueOnce(partialResponse);

      const orchestrator = new AskHumanOrchestrator(mockClient as unknown as AskHumanClient);

      // minResponses: 5 in submit options, should be satisfied by currentResponses: 5
      const result = await orchestrator.submitAndWait({
        prompt: "Test question",
        type: "text",
        minResponses: 5,
      });

      expect(result.currentResponses).toBe(5);
      expect(mockClient.getQuestion).toHaveBeenCalledTimes(1);
    });

    it("uses submission timeoutSeconds for await timeout", async () => {
      const submission: QuestionSubmission = {
        questionId: "q_abc123",
        status: "OPEN",
        pollUrl: "/agent/questions/q_abc123",
        expiresAt: "2026-02-02T15:00:00Z",
      };

      const partialResponse: QuestionResponse = {
        questionId: "q_abc123",
        status: "PARTIAL",
        prompt: "Question",
        type: "text",
        requiredResponses: 10,
        currentResponses: 1,
        expiresAt: "2026-02-02T15:00:00Z",
        responses: [],
      };

      mockClient.submitQuestion.mockResolvedValueOnce(submission);
      mockClient.getQuestion.mockResolvedValue(partialResponse);

      const orchestrator = new AskHumanOrchestrator(mockClient as unknown as AskHumanClient, {
        pollInterval: 50,
        maxBackoff: 100,
        backoffMultiplier: 1.5,
      });

      // timeoutSeconds: 0.1 = 100ms
      const result = await orchestrator.submitAndWait({
        prompt: "Test question",
        type: "text",
        minResponses: 5,
        timeoutSeconds: 0.1, // 100ms
      });

      // Should return partial results after timeout
      expect(result.currentResponses).toBe(1);
    });
  });
});
