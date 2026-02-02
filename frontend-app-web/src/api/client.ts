/**
 * API Client for Ask-a-Human Backend
 *
 * Provides typed functions for all Human API endpoints.
 * Base URL is configured via VITE_API_BASE_URL environment variable.
 */

import type {
    QuestionDetail,
    QuestionListItem,
    QuestionsListResponse,
    SubmitResponseRequest,
    SubmitResponseResult,
} from "@/types/api";
import { ApiError } from "@/types/api";

/** Get the API base URL from environment */
function getBaseUrl(): string {
    const url = import.meta.env["VITE_API_BASE_URL"] as string | undefined;
    if (url === undefined || url === "") {
        // Default to relative path for same-origin deployment
        return "";
    }
    // Remove trailing slash if present
    return url.replace(/\/$/, "");
}

/** Standard fetch options with JSON headers */
function getDefaultOptions(): RequestInit {
    return {
        headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
        },
    };
}

/**
 * Make an API request and handle errors consistently.
 *
 * @param path - API endpoint path (e.g., "/human/questions")
 * @param options - Fetch options
 * @returns Parsed JSON response
 * @throws ApiError on API errors
 */
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const baseUrl = getBaseUrl();
    const url = `${baseUrl}${path}`;

    const response = await fetch(url, {
        ...getDefaultOptions(),
        ...options,
    });

    // Handle non-2xx responses
    if (!response.ok) {
        let errorData: unknown;
        try {
            errorData = await response.json();
        } catch {
            // If we can't parse JSON, create a generic error
            throw new ApiError(
                `Request failed with status ${response.status}`,
                "REQUEST_FAILED",
                response.status
            );
        }

        // Check if it's our standard error format
        if (
            typeof errorData === "object" &&
            errorData !== null &&
            "error" in errorData &&
            "code" in errorData
        ) {
            const err = errorData as {
                error: string;
                code: string;
                details?: Record<string, unknown>;
            };
            throw new ApiError(err.error, err.code, response.status, err.details);
        }

        // Generic error for non-standard responses
        throw new ApiError(
            `Request failed with status ${response.status}`,
            "REQUEST_FAILED",
            response.status
        );
    }

    return response.json() as Promise<T>;
}

/**
 * Fetch list of open questions.
 *
 * GET /human/questions
 *
 * @param limit - Maximum number of questions to return (default: 20, max: 50)
 * @returns Array of question list items
 */
export async function getQuestions(limit = 20): Promise<QuestionListItem[]> {
    const params = new URLSearchParams({ limit: String(limit) });
    const response = await request<QuestionsListResponse>(`/human/questions?${params.toString()}`);
    return response.questions;
}

/**
 * Fetch a single question by ID.
 *
 * GET /human/questions/{id}
 *
 * @param questionId - The question ID
 * @returns Question details
 */
export async function getQuestion(questionId: string): Promise<QuestionDetail> {
    return request<QuestionDetail>(`/human/questions/${encodeURIComponent(questionId)}`);
}

/**
 * Submit a response to a question.
 *
 * POST /human/responses
 *
 * @param data - Response data (question_id, answer/selected_option, optional confidence)
 * @returns Submission result with response ID and points earned
 */
export async function submitResponse(data: SubmitResponseRequest): Promise<SubmitResponseResult> {
    return request<SubmitResponseResult>("/human/responses", {
        method: "POST",
        body: JSON.stringify(data),
    });
}
