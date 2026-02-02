import { Button } from "./Button";

interface ErrorMessageProps {
    title?: string;
    message: string;
    onRetry?: () => void;
}

export function ErrorMessage({
    title = "Something went wrong",
    message,
    onRetry,
}: ErrorMessageProps) {
    return (
        <div className="flex flex-col items-center justify-center p-6 text-center">
            <div className="w-12 h-12 mb-4 rounded-full bg-error-50 dark:bg-error-500/20 flex items-center justify-center">
                <svg
                    className="w-6 h-6 text-error-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">{title}</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">{message}</p>
            {onRetry && (
                <Button variant="secondary" onClick={onRetry}>
                    Try Again
                </Button>
            )}
        </div>
    );
}
