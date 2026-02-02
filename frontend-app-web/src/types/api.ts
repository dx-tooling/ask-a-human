/**
 * API Types for Ask-a-Human Frontend
 *
 * These types match the backend API response formats from:
 * - GET /human/questions - List open questions
 * - GET /human/questions/{id} - Get single question
 * - POST /human/responses - Submit an answer
 */

/** Question types supported by the system */
export type QuestionType = "text" | "multiple_choice";

/** Question status values */
export type QuestionStatus = "OPEN" | "CLOSED" | "EXPIRED";

/** Question list item (from GET /human/questions) */
export interface QuestionListItem {
    question_id: string;
    prompt: string;
    type: QuestionType;
    responses_needed: number;
    created_at: string;
    options?: string[];
    audience?: string;
}

/** Question detail (from GET /human/questions/{id}) */
export interface QuestionDetail {
    question_id: string;
    prompt: string;
    type: QuestionType;
    responses_needed: number;
    can_answer: boolean;
    options?: string[];
}

/** Response to list questions API */
export interface QuestionsListResponse {
    questions: QuestionListItem[];
}

/** Request body for submitting a response */
export interface SubmitResponseRequest {
    question_id: string;
    answer?: string;
    selected_option?: number;
    confidence?: number;
}

/** Response from submitting an answer */
export interface SubmitResponseResult {
    response_id: string;
    points_earned: number;
}

/** API error response structure */
export interface ApiErrorResponse {
    error: string;
    code: string;
    details?: Record<string, unknown>;
}

/** Custom error class for API errors */
export class ApiError extends Error {
    public readonly code: string;
    public readonly statusCode: number;
    public readonly details: Record<string, unknown> | undefined;

    constructor(
        message: string,
        code: string,
        statusCode: number,
        details?: Record<string, unknown>
    ) {
        super(message);
        this.name = "ApiError";
        this.code = code;
        this.statusCode = statusCode;
        this.details = details;
    }

    static fromResponse(response: ApiErrorResponse, statusCode: number): ApiError {
        return new ApiError(response.error, response.code, statusCode, response.details);
    }
}
