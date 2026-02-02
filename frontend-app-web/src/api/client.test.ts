import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getQuestions, getQuestion, submitResponse } from "./client";
import { ApiError } from "@/types/api";

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// Mock localStorage
const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
        getItem: vi.fn((key: string) => store[key] ?? null),
        setItem: vi.fn((key: string, value: string) => {
            store[key] = value;
        }),
        clear: () => {
            store = {};
        },
    };
})();
vi.stubGlobal("localStorage", localStorageMock);

// Mock crypto.randomUUID
vi.stubGlobal("crypto", {
    randomUUID: vi.fn(() => "test-uuid-12345"),
});

describe("API Client", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorageMock.clear();
        // Mock import.meta.env
        vi.stubEnv("VITE_API_BASE_URL", "https://api.example.com");
    });

    afterEach(() => {
        vi.unstubAllEnvs();
    });

    describe("getQuestions", () => {
        it("fetches questions successfully", async () => {
            const mockQuestions = [
                { question_id: "q-1", prompt: "Question 1", type: "text", responses_needed: 5 },
            ];
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ questions: mockQuestions }),
            });

            const result = await getQuestions();

            expect(mockFetch).toHaveBeenCalledWith(
                "https://api.example.com/human/questions?limit=20",

                expect.objectContaining({
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                    headers: expect.objectContaining({
                        "Content-Type": "application/json",
                        Accept: "application/json",
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                        "X-Fingerprint": expect.any(String),
                    }),
                })
            );
            expect(result).toEqual(mockQuestions);
        });

        it("passes custom limit parameter", async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ questions: [] }),
            });

            await getQuestions(10);

            expect(mockFetch).toHaveBeenCalledWith(
                "https://api.example.com/human/questions?limit=10",
                expect.any(Object)
            );
        });

        it("throws ApiError on non-2xx response with standard error format", async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 400,
                json: () =>
                    Promise.resolve({
                        error: "Invalid request",
                        code: "INVALID_REQUEST",
                        details: { field: "limit" },
                    }),
            });

            try {
                await getQuestions();
                expect.fail("Should have thrown");
            } catch (error) {
                expect(error).toBeInstanceOf(ApiError);
                expect(error).toMatchObject({
                    message: "Invalid request",
                    code: "INVALID_REQUEST",
                    statusCode: 400,
                });
            }
        });

        it("throws ApiError on non-2xx response with non-standard error", async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 500,
                json: () => Promise.resolve({ message: "Server error" }),
            });

            try {
                await getQuestions();
                expect.fail("Should have thrown");
            } catch (error) {
                expect(error).toBeInstanceOf(ApiError);
                expect(error).toMatchObject({
                    message: "Request failed with status 500",
                    code: "REQUEST_FAILED",
                });
            }
        });

        it("throws ApiError when response is not JSON", async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 502,
                json: () => Promise.reject(new Error("Invalid JSON")),
            });

            try {
                await getQuestions();
                expect.fail("Should have thrown");
            } catch (error) {
                expect(error).toBeInstanceOf(ApiError);
                expect(error).toMatchObject({
                    message: "Request failed with status 502",
                    code: "REQUEST_FAILED",
                });
            }
        });
    });

    describe("getQuestion", () => {
        it("fetches a single question successfully", async () => {
            const mockQuestion = {
                question_id: "q-123",
                prompt: "Test question",
                type: "text",
                responses_needed: 3,
                can_answer: true,
            };
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockQuestion),
            });

            const result = await getQuestion("q-123");

            expect(mockFetch).toHaveBeenCalledWith(
                "https://api.example.com/human/questions/q-123",
                expect.any(Object)
            );
            expect(result).toEqual(mockQuestion);
        });

        it("encodes question ID in URL", async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({}),
            });

            await getQuestion("id/with/slashes");

            expect(mockFetch).toHaveBeenCalledWith(
                "https://api.example.com/human/questions/id%2Fwith%2Fslashes",
                expect.any(Object)
            );
        });

        it("throws ApiError on 404", async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 404,
                json: () =>
                    Promise.resolve({
                        error: "Question not found",
                        code: "NOT_FOUND",
                    }),
            });

            await expect(getQuestion("nonexistent")).rejects.toMatchObject({
                message: "Question not found",
                code: "NOT_FOUND",
                statusCode: 404,
            });
        });
    });

    describe("submitResponse", () => {
        it("submits text response successfully", async () => {
            const mockResult = { response_id: "r-123", points_earned: 10 };
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockResult),
            });

            const result = await submitResponse({
                question_id: "q-123",
                answer: "My answer",
            });

            expect(mockFetch).toHaveBeenCalledWith(
                "https://api.example.com/human/responses",
                expect.objectContaining({
                    method: "POST",
                    body: JSON.stringify({
                        question_id: "q-123",
                        answer: "My answer",
                    }),
                })
            );
            expect(result).toEqual(mockResult);
        });

        it("submits multiple choice response successfully", async () => {
            const mockResult = { response_id: "r-456", points_earned: 10 };
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockResult),
            });

            const result = await submitResponse({
                question_id: "q-456",
                selected_option: 2,
            });

            expect(mockFetch).toHaveBeenCalledWith(
                "https://api.example.com/human/responses",
                expect.objectContaining({
                    method: "POST",
                    body: JSON.stringify({
                        question_id: "q-456",
                        selected_option: 2,
                    }),
                })
            );
            expect(result).toEqual(mockResult);
        });

        it("throws ApiError on validation error", async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 400,
                json: () =>
                    Promise.resolve({
                        error: "Answer too short",
                        code: "VALIDATION_ERROR",
                        details: { min_length: 10 },
                    }),
            });

            await expect(
                submitResponse({ question_id: "q-123", answer: "short" })
            ).rejects.toMatchObject({
                message: "Answer too short",
                code: "VALIDATION_ERROR",
                statusCode: 400,
            });
        });
    });

    describe("fingerprint management", () => {
        it("generates and stores fingerprint on first request", async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ questions: [] }),
            });

            await getQuestions();

            expect(localStorageMock.setItem).toHaveBeenCalledWith(
                "aah-fingerprint",
                "test-uuid-12345"
            );
        });

        it("reuses stored fingerprint on subsequent requests", async () => {
            localStorageMock.getItem.mockReturnValueOnce("existing-fingerprint");

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ questions: [] }),
            });

            await getQuestions();

            expect(mockFetch).toHaveBeenCalledWith(
                expect.any(String),

                expect.objectContaining({
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                    headers: expect.objectContaining({
                        "X-Fingerprint": "existing-fingerprint",
                    }),
                })
            );
        });
    });

    describe("base URL handling", () => {
        it("uses empty base URL when VITE_API_BASE_URL is not set", async () => {
            vi.unstubAllEnvs();
            vi.stubEnv("VITE_API_BASE_URL", "");

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ questions: [] }),
            });

            await getQuestions();

            expect(mockFetch).toHaveBeenCalledWith("/human/questions?limit=20", expect.any(Object));
        });

        it("removes trailing slash from base URL", async () => {
            vi.unstubAllEnvs();
            vi.stubEnv("VITE_API_BASE_URL", "https://api.example.com/");

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ questions: [] }),
            });

            await getQuestions();

            expect(mockFetch).toHaveBeenCalledWith(
                "https://api.example.com/human/questions?limit=20",
                expect.any(Object)
            );
        });
    });
});
