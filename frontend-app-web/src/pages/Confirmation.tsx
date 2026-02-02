import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/Button";

interface LocationState {
    pointsEarned?: number;
}

const AUTO_RETURN_DELAY = 5000; // 5 seconds

export function Confirmation() {
    const location = useLocation();
    const navigate = useNavigate();
    const state = location.state as LocationState | null;
    const pointsEarned = state?.pointsEarned ?? 10;

    const [countdown, setCountdown] = useState(AUTO_RETURN_DELAY / 1000);

    useEffect(() => {
        const timer = setInterval(() => {
            setCountdown((prev) => {
                if (prev <= 1) {
                    void navigate("/");
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => {
            clearInterval(timer);
        };
    }, [navigate]);

    const handleAnswerAnother = () => {
        void navigate("/");
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4">
            <div className="max-w-md w-full text-center">
                {/* Success icon */}
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-success-50 dark:bg-success-500/20 flex items-center justify-center">
                    <svg
                        className="w-10 h-10 text-success-500"
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
                </div>

                {/* Success message */}
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                    Thank you!
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                    Your answer has been submitted successfully.
                </p>

                {/* Points earned */}
                <div className="mb-8 p-4 rounded-xl bg-primary-50 dark:bg-primary-900/20">
                    <p className="text-sm text-primary-600 dark:text-primary-400 mb-1">
                        Points earned
                    </p>
                    <p className="text-3xl font-bold text-primary-700 dark:text-primary-300">
                        +{pointsEarned}
                    </p>
                </div>

                {/* Actions */}
                <Button fullWidth size="lg" onClick={handleAnswerAnother}>
                    Answer Another Question
                </Button>

                {/* Auto-return notice */}
                <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                    Returning to feed in {countdown} second{countdown !== 1 ? "s" : ""}...
                </p>
            </div>
        </div>
    );
}
