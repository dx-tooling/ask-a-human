import { useNavigate } from "react-router-dom";
import type { QuestionListItem } from "@/types/api";
import { Card, CardContent } from "./Card";

interface QuestionCardProps {
    question: QuestionListItem;
}

function QuestionTypeBadge({ type }: { type: string }) {
    const isMultipleChoice = type === "multiple_choice";

    return (
        <span
            className={`
                inline-flex items-center px-2 py-0.5 rounded text-xs font-medium
                ${isMultipleChoice ? "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300" : "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"}
            `}
        >
            {isMultipleChoice ? "Multiple Choice" : "Text"}
        </span>
    );
}

export function QuestionCard({ question }: QuestionCardProps) {
    const navigate = useNavigate();

    const handleClick = () => {
        void navigate(`/questions/${question.question_id}`);
    };

    // Truncate prompt if too long
    const maxLength = 150;
    const truncatedPrompt =
        question.prompt.length > maxLength
            ? `${question.prompt.substring(0, maxLength)}...`
            : question.prompt;

    return (
        <Card onClick={handleClick} as="article">
            <CardContent>
                <div className="flex items-start justify-between gap-3 mb-2">
                    <QuestionTypeBadge type={question.type} />
                    <span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {question.responses_needed > 0
                            ? `${question.responses_needed} more needed`
                            : "Almost done"}
                    </span>
                </div>
                <p className="text-gray-900 dark:text-gray-100 line-clamp-3">{truncatedPrompt}</p>
                {question.audience && (
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                        Looking for: {question.audience}
                    </p>
                )}
            </CardContent>
        </Card>
    );
}
