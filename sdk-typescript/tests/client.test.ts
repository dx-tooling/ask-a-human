import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AskHumanClient } from "../src/client.js";
import {
  AskHumanError,
  QuestionNotFoundError,
  QuotaExceededError,
  RateLimitError,
  ServerError,
  ValidationError,
} from "../src/errors.js";
import type { QuestionResponseData, QuestionSubmissionResponse } from "../src/types.js";

describe("AskHumanClient", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("constructor", () => {
    it("uses default values when no options provided", () => {
      // Clear environment variables to test true defaults
      const originalBaseUrl = process.env["ASK_A_HUMAN_BASE_URL"];
      const originalAgentId = process.env["ASK_A_HUMAN_AGENT_ID"];
      delete process.env["ASK_A_HUMAN_BASE_URL"];
      delete process.env["ASK_A_HUMAN_AGENT_ID"];

      try {
        const client = new AskHumanClient({ fetch: mockFetch });

        expect(client.baseUrl).toBe("https://api.ask-a-human.com");
        expect(client.agentId).toBe("default");
        expect(client.timeout).toBe(30000);
      } finally {
        // Restore environment variables
        if (originalBaseUrl !== undefined) process.env["ASK_A_HUMAN_BASE_URL"] = originalBaseUrl;
        if (originalAgentId !== undefined) process.env["ASK_A_HUMAN_AGENT_ID"] = originalAgentId;
      }
    });

    it("uses provided options", () => {
      const client = new AskHumanClient({
        baseUrl: "https://custom.api.com",
        agentId: "my-agent",
        timeout: 60000,
        fetch: mockFetch,
      });

      expect(client.baseUrl).toBe("https://custom.api.com");
      expect(client.agentId).toBe("my-agent");
      expect(client.timeout).toBe(60000);
    });

    it("uses environment variables when set", () => {
      const originalBaseUrl = process.env["ASK_A_HUMAN_BASE_URL"];
      const originalAgentId = process.env["ASK_A_HUMAN_AGENT_ID"];

      process.env["ASK_A_HUMAN_BASE_URL"] = "https://env.api.com";
      process.env["ASK_A_HUMAN_AGENT_ID"] = "env-agent";

      try {
        const client = new AskHumanClient({ fetch: mockFetch });

        expect(client.baseUrl).toBe("https://env.api.com");
        expect(client.agentId).toBe("env-agent");
      } finally {
        // Restore original values
        if (originalBaseUrl !== undefined) {
          process.env["ASK_A_HUMAN_BASE_URL"] = originalBaseUrl;
        } else {
          delete process.env["ASK_A_HUMAN_BASE_URL"];
        }
        if (originalAgentId !== undefined) {
          process.env["ASK_A_HUMAN_AGENT_ID"] = originalAgentId;
        } else {
          delete process.env["ASK_A_HUMAN_AGENT_ID"];
        }
      }
    });
  });

  describe("submitQuestion", () => {
    it("submits a text question successfully", async () => {
      const submissionResponse: QuestionSubmissionResponse = {
        question_id: "q_abc123",
        status: "OPEN",
        poll_url: "/agent/questions/q_abc123",
        expires_at: "2026-02-02T15:00:00Z",
        created_at: "2026-02-02T14:00:00Z",
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => submissionResponse,
      });

      const client = new AskHumanClient({ agentId: "test-agent", fetch: mockFetch });

      const result = await client.submitQuestion({
        prompt: "Should error messages apologize?",
        type: "text",
        audience: ["product", "creative"],
        minResponses: 5,
      });

      expect(result).toEqual({
        questionId: "q_abc123",
        status: "OPEN",
        pollUrl: "/agent/questions/q_abc123",
        expiresAt: "2026-02-02T15:00:00Z",
        createdAt: "2026-02-02T14:00:00Z",
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.ask-a-human.com/agent/questions",
        expect.objectContaining({
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Agent-Id": "test-agent",
          },
          body: JSON.stringify({
            prompt: "Should error messages apologize?",
            type: "text",
            audience: ["product", "creative"],
            min_responses: 5,
          }),
        })
      );
    });

    it("submits a multiple choice question successfully", async () => {
      const submissionResponse: QuestionSubmissionResponse = {
        question_id: "q_def456",
        status: "OPEN",
        poll_url: "/agent/questions/q_def456",
        expires_at: "2026-02-02T15:00:00Z",
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => submissionResponse,
      });

      const client = new AskHumanClient({ fetch: mockFetch });

      const result = await client.submitQuestion({
        prompt: "Which button label is clearer?",
        type: "multiple_choice",
        options: ["Submit", "Send", "Confirm"],
        minResponses: 10,
        timeoutSeconds: 1800,
        idempotencyKey: "key123",
      });

      expect(result.questionId).toBe("q_def456");

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody).toEqual({
        prompt: "Which button label is clearer?",
        type: "multiple_choice",
        options: ["Submit", "Send", "Confirm"],
        min_responses: 10,
        timeout_seconds: 1800,
        idempotency_key: "key123",
      });
    });

    it("throws ValidationError on 400 response", async () => {
      const errorResponse = {
        ok: false,
        status: 400,
        json: async () => ({
          error: {
            code: "VALIDATION_ERROR",
            message: "Prompt too short",
            details: { field: "prompt", constraint: "min_length" },
          },
        }),
      };

      mockFetch.mockResolvedValue(errorResponse);

      const client = new AskHumanClient({ fetch: mockFetch });

      try {
        await client.submitQuestion({ prompt: "Hi", type: "text" });
        expect.fail("Should have thrown ValidationError");
      } catch (e) {
        expect(e).toBeInstanceOf(ValidationError);
        const error = e as ValidationError;
        expect(error.message).toBe("Prompt too short");
        expect(error.field).toBe("prompt");
        expect(error.constraint).toBe("min_length");
      }
    });

    it("throws QuotaExceededError on 403 response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({
          error: {
            code: "AGENT_QUOTA_EXCEEDED",
            message: "Too many concurrent questions",
          },
        }),
      });

      const client = new AskHumanClient({ fetch: mockFetch });

      await expect(
        client.submitQuestion({ prompt: "Test question here", type: "text" })
      ).rejects.toThrow(QuotaExceededError);
    });

    it("throws RateLimitError on 429 response with headers", async () => {
      const headers = new Map([
        ["Retry-After", "60"],
        ["X-RateLimit-Limit", "100"],
        ["X-RateLimit-Remaining", "0"],
        ["X-RateLimit-Reset", "1706886000"],
      ]);

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        headers: {
          get: (name: string) => headers.get(name) ?? null,
        },
        json: async () => ({
          error: {
            code: "RATE_LIMITED",
            message: "Rate limit exceeded",
          },
        }),
      });

      const client = new AskHumanClient({ fetch: mockFetch });

      try {
        await client.submitQuestion({ prompt: "Test question here", type: "text" });
        expect.fail("Should have thrown");
      } catch (e) {
        expect(e).toBeInstanceOf(RateLimitError);
        const error = e as RateLimitError;
        expect(error.retryAfter).toBe(60);
        expect(error.limit).toBe(100);
        expect(error.remaining).toBe(0);
        expect(error.reset).toBe(1706886000);
      }
    });

    it("throws ServerError on 500 response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({
          error: {
            message: "Internal server error",
          },
        }),
      });

      const client = new AskHumanClient({ fetch: mockFetch });

      try {
        await client.submitQuestion({ prompt: "Test question here", type: "text" });
        expect.fail("Should have thrown");
      } catch (e) {
        expect(e).toBeInstanceOf(ServerError);
        const error = e as ServerError;
        expect(error.statusCode).toBe(500);
      }
    });

    it("throws AskHumanError on unknown error status", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 418,
        json: async () => ({
          error: {
            message: "I'm a teapot",
          },
        }),
      });

      const client = new AskHumanClient({ fetch: mockFetch });

      await expect(
        client.submitQuestion({ prompt: "Test question here", type: "text" })
      ).rejects.toThrow(AskHumanError);
    });

    it("handles network errors", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const client = new AskHumanClient({ fetch: mockFetch });

      await expect(
        client.submitQuestion({ prompt: "Test question here", type: "text" })
      ).rejects.toThrow(AskHumanError);
    });

    it("handles malformed error responses", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => {
          throw new Error("Invalid JSON");
        },
      });

      const client = new AskHumanClient({ fetch: mockFetch });

      await expect(
        client.submitQuestion({ prompt: "Test question here", type: "text" })
      ).rejects.toThrow(ValidationError);
    });
  });

  describe("getQuestion", () => {
    it("gets a question successfully", async () => {
      const responseData: QuestionResponseData = {
        question_id: "q_abc123",
        status: "PARTIAL",
        prompt: "Should error messages apologize?",
        type: "text",
        required_responses: 5,
        current_responses: 3,
        expires_at: "2026-02-02T15:00:00Z",
        responses: [
          { answer: "Yes, be polite", confidence: 4 },
          { answer: "No, be direct", confidence: 5 },
          { answer: "It depends on the context", confidence: 3 },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => responseData,
      });

      const client = new AskHumanClient({ fetch: mockFetch });

      const result = await client.getQuestion("q_abc123");

      expect(result).toEqual({
        questionId: "q_abc123",
        status: "PARTIAL",
        prompt: "Should error messages apologize?",
        type: "text",
        requiredResponses: 5,
        currentResponses: 3,
        expiresAt: "2026-02-02T15:00:00Z",
        closedAt: undefined,
        options: undefined,
        responses: [
          { answer: "Yes, be polite", confidence: 4, selectedOption: undefined },
          { answer: "No, be direct", confidence: 5, selectedOption: undefined },
          { answer: "It depends on the context", confidence: 3, selectedOption: undefined },
        ],
        summary: undefined,
      });
    });

    it("gets a multiple choice question with summary", async () => {
      const responseData: QuestionResponseData = {
        question_id: "q_def456",
        status: "CLOSED",
        prompt: "Which button label?",
        type: "multiple_choice",
        options: ["Submit", "Send", "Confirm"],
        required_responses: 10,
        current_responses: 10,
        expires_at: "2026-02-02T15:00:00Z",
        closed_at: "2026-02-02T14:30:00Z",
        responses: [
          { selected_option: 0, confidence: 4 },
          { selected_option: 1, confidence: 5 },
          { selected_option: 0, confidence: 3 },
        ],
        summary: { Submit: 5, Send: 3, Confirm: 2 },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => responseData,
      });

      const client = new AskHumanClient({ fetch: mockFetch });

      const result = await client.getQuestion("q_def456");

      expect(result.options).toEqual(["Submit", "Send", "Confirm"]);
      expect(result.summary).toEqual({ Submit: 5, Send: 3, Confirm: 2 });
      expect(result.closedAt).toBe("2026-02-02T14:30:00Z");
      expect(result.responses[0].selectedOption).toBe(0);
    });

    it("throws QuestionNotFoundError on 404 response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({
          error: {
            code: "QUESTION_NOT_FOUND",
            message: "Question not found",
          },
        }),
      });

      const client = new AskHumanClient({ fetch: mockFetch });

      try {
        await client.getQuestion("q_nonexistent");
        expect.fail("Should have thrown");
      } catch (e) {
        expect(e).toBeInstanceOf(QuestionNotFoundError);
        const error = e as QuestionNotFoundError;
        expect(error.questionId).toBe("q_nonexistent");
      }
    });

    it("throws RateLimitError on 429 response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        headers: {
          get: () => null,
        },
        json: async () => ({
          error: {
            message: "Rate limit exceeded",
          },
        }),
      });

      const client = new AskHumanClient({ fetch: mockFetch });

      await expect(client.getQuestion("q_abc123")).rejects.toThrow(RateLimitError);
    });
  });
});
