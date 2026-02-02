import { Header } from "@/components/Header";
import { QuestionCard } from "@/components/QuestionCard";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { ErrorMessage } from "@/components/ErrorMessage";
import { EmptyState } from "@/components/EmptyState";
import { useQuestions } from "@/hooks/useQuestions";

export function Feed() {
    const { questions, isLoading, error, refetch } = useQuestions();

    return (
        <div className="min-h-screen flex flex-col">
            <Header />

            <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-6">
                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <LoadingSpinner size="lg" />
                    </div>
                ) : error ? (
                    <ErrorMessage
                        message={error.message}
                        onRetry={() => {
                            void refetch();
                        }}
                    />
                ) : questions.length === 0 ? (
                    <EmptyState />
                ) : (
                    <div className="space-y-4">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            {questions.length} question{questions.length !== 1 ? "s" : ""} available
                        </p>
                        {questions.map((question) => (
                            <QuestionCard key={question.question_id} question={question} />
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
