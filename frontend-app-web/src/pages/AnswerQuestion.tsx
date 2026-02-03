import { useState, useCallback, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Button } from "@/components/Button";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { ErrorMessage } from "@/components/ErrorMessage";
import { useQuestion } from "@/hooks/useQuestion";
import { useSubmitResponse } from "@/hooks/useSubmitResponse";

const MAX_TEXT_LENGTH = 5000;
const MIN_TEXT_LENGTH = 10;

export function AnswerQuestion() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { question, isLoading, error, refetch } = useQuestion(id);
    const { submit, isSubmitting, error: submitError } = useSubmitResponse();

    // Text answer state
    const [textAnswer, setTextAnswer] = useState("");
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Multiple choice state
    const [selectedOption, setSelectedOption] = useState<number | null>(null);

    const handleBack = useCallback(() => {
        void navigate("/");
    }, [navigate]);

    // Auto-resize textarea
    useEffect(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = "auto";
            textarea.style.height = `${textarea.scrollHeight}px`;
        }
    }, [textAnswer]);

    const isTextQuestion = question?.type === "text";
    const isMultipleChoice = question?.type === "multiple_choice";

    const canSubmit =
        (isTextQuestion && textAnswer.length >= MIN_TEXT_LENGTH) ||
        (isMultipleChoice && selectedOption !== null);

    const handleSubmit = async () => {
        if (!question || !canSubmit) return;

        const request: Parameters<typeof submit>[0] = {
            question_id: question.question_id,
        };
        if (isTextQuestion) {
            request.answer = textAnswer;
        }
        if (isMultipleChoice && selectedOption !== null) {
            request.selected_option = selectedOption;
        }
        const result = await submit(request);

        if (result) {
            void navigate("/confirmation", {
                state: { pointsEarned: result.points_earned },
            });
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex flex-col">
                <Header title="Loading..." showBackButton onBack={handleBack} />
                <main className="flex-1 flex items-center justify-center">
                    <LoadingSpinner size="lg" />
                </main>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex flex-col">
                <Header title="Error" showBackButton onBack={handleBack} />
                <main className="flex-1 flex items-center justify-center p-4">
                    <ErrorMessage
                        message={error.message}
                        onRetry={() => {
                            void refetch();
                        }}
                    />
                </main>
            </div>
        );
    }

    if (!question) {
        return (
            <div className="min-h-screen flex flex-col">
                <Header title="Not Found" showBackButton onBack={handleBack} />
                <main className="flex-1 flex items-center justify-center p-4">
                    <ErrorMessage
                        title="Question not found"
                        message="This question may have been removed."
                    />
                </main>
            </div>
        );
    }

    if (!question.can_answer) {
        return (
            <div className="min-h-screen flex flex-col">
                <Header title="Cannot Answer" showBackButton onBack={handleBack} />
                <main className="flex-1 flex items-center justify-center p-4">
                    <ErrorMessage
                        title="Already answered"
                        message="You have already submitted a response to this question."
                    />
                </main>
            </div>
        );
    }

    const responsesText =
        question.responses_needed > 0
            ? `${question.responses_needed} more response${question.responses_needed !== 1 ? "s" : ""} needed`
            : "Almost done collecting responses";

    return (
        <div className="min-h-screen flex flex-col">
            <Header title="Answer Question" showBackButton onBack={handleBack} />

            <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-6">
                {/* Question prompt */}
                <div className="mb-6">
                    <p className="text-lg text-gray-900 dark:text-gray-100">{question.prompt}</p>
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{responsesText}</p>
                </div>

                {/* Text answer form */}
                {isTextQuestion && (
                    <div className="space-y-2">
                        <label
                            htmlFor="answer"
                            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                        >
                            Your Answer
                        </label>
                        <textarea
                            ref={textareaRef}
                            id="answer"
                            value={textAnswer}
                            onChange={(e) => {
                                setTextAnswer(e.target.value);
                            }}
                            placeholder="Type your answer here..."
                            className="w-full min-h-[120px] px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                            maxLength={MAX_TEXT_LENGTH}
                            disabled={isSubmitting}
                        />
                        <div className="flex justify-between text-sm">
                            <span
                                className={
                                    textAnswer.length < MIN_TEXT_LENGTH
                                        ? "text-gray-500 dark:text-gray-400"
                                        : "text-green-600 dark:text-green-400"
                                }
                            >
                                {textAnswer.length < MIN_TEXT_LENGTH
                                    ? `At least ${MIN_TEXT_LENGTH} characters required`
                                    : "Ready to submit"}
                            </span>
                            <span className="text-gray-500 dark:text-gray-400">
                                {textAnswer.length}/{MAX_TEXT_LENGTH}
                            </span>
                        </div>
                    </div>
                )}

                {/* Multiple choice form */}
                {isMultipleChoice && question.options && (
                    <fieldset className="space-y-3">
                        <legend className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Select an option
                        </legend>
                        {question.options.map((option, index) => (
                            <label
                                key={option}
                                className={`
                                    flex items-center p-4 rounded-lg border-2 cursor-pointer
                                    transition-colors duration-200
                                    min-h-touch-target
                                    ${
                                        selectedOption === index
                                            ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20"
                                            : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                                    }
                                `}
                            >
                                <input
                                    type="radio"
                                    name="answer"
                                    value={index}
                                    checked={selectedOption === index}
                                    onChange={() => {
                                        setSelectedOption(index);
                                    }}
                                    className="w-5 h-5 text-primary-600 border-gray-300 focus:ring-primary-500"
                                    disabled={isSubmitting}
                                />
                                <span className="ml-3 text-gray-900 dark:text-gray-100">
                                    {option}
                                </span>
                            </label>
                        ))}
                    </fieldset>
                )}

                {/* Error message */}
                {submitError && (
                    <div className="mt-4 p-4 rounded-lg bg-error-50 dark:bg-error-500/20 text-error-600 dark:text-error-400">
                        {submitError.message}
                    </div>
                )}

                {/* Submit button */}
                <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                    <Button
                        fullWidth
                        size="lg"
                        disabled={!canSubmit}
                        isLoading={isSubmitting}
                        onClick={() => {
                            void handleSubmit();
                        }}
                    >
                        <svg
                            className="w-5 h-5 mr-2"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 13l4 4L19 7"
                            />
                        </svg>
                        Submit Answer
                    </Button>
                    {!canSubmit && (
                        <p className="mt-2 text-center text-sm text-gray-500 dark:text-gray-400">
                            {isTextQuestion
                                ? "Write at least 10 characters to submit"
                                : "Select an option to submit"}
                        </p>
                    )}
                </div>
            </main>
        </div>
    );
}
