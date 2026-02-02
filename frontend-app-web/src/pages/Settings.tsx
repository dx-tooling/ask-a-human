import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Card, CardContent } from "@/components/Card";
import { useTheme, type Theme } from "@/context/ThemeContext";

const themeOptions: { value: Theme; label: string; description: string }[] = [
    { value: "dark", label: "Dark", description: "Always use dark theme" },
    { value: "light", label: "Light", description: "Always use light theme" },
    { value: "system", label: "System", description: "Follow your device settings" },
];

export function Settings() {
    const navigate = useNavigate();
    const { theme, setTheme } = useTheme();

    const handleBack = () => {
        void navigate("/");
    };

    return (
        <div className="min-h-screen flex flex-col">
            <Header title="Settings" showBackButton onBack={handleBack} />

            <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-6">
                {/* Theme section */}
                <section>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                        Appearance
                    </h2>

                    <Card>
                        <CardContent className="p-0">
                            <div role="radiogroup" aria-label="Theme selection">
                                {themeOptions.map((option, index) => (
                                    <div
                                        key={option.value}
                                        className={`
                                            flex items-center justify-between p-4 cursor-pointer
                                            hover:bg-gray-50 dark:hover:bg-gray-700/50
                                            transition-colors duration-200
                                            min-h-touch-target
                                            ${index !== themeOptions.length - 1 ? "border-b border-gray-200 dark:border-gray-700" : ""}
                                        `}
                                        onClick={() => {
                                            setTheme(option.value);
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter" || e.key === " ") {
                                                e.preventDefault();
                                                setTheme(option.value);
                                            }
                                        }}
                                        role="radio"
                                        aria-checked={theme === option.value}
                                        tabIndex={0}
                                    >
                                        <div className="flex-1">
                                            <p className="font-medium text-gray-900 dark:text-gray-100">
                                                {option.label}
                                            </p>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                                {option.description}
                                            </p>
                                        </div>
                                        <div
                                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                                theme === option.value
                                                    ? "border-primary-600 bg-primary-600"
                                                    : "border-gray-300"
                                            }`}
                                        >
                                            {theme === option.value && (
                                                <div className="w-2 h-2 rounded-full bg-white" />
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </section>

                {/* Notifications section (placeholder) */}
                <section className="mt-8">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                        Notifications
                    </h2>

                    <Card>
                        <CardContent>
                            <p className="text-gray-500 dark:text-gray-400">
                                Push notification settings coming soon.
                            </p>
                        </CardContent>
                    </Card>
                </section>

                {/* About section */}
                <section className="mt-8">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                        About
                    </h2>

                    <Card>
                        <CardContent className="space-y-4">
                            <p className="text-gray-600 dark:text-gray-400">
                                <strong className="text-gray-900 dark:text-gray-100">Ask a Human</strong> connects 
                                AI agents to human judgment. When agents face subjective decisions—tone, 
                                style, ethics, or &quot;does this feel right?&quot;—they ask you.
                            </p>
                            <p className="text-gray-600 dark:text-gray-400">
                                Your responses help agents make better decisions on things that 
                                require human intuition: UX copy, design choices, ethical questions, 
                                and more.
                            </p>
                            <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                                <a
                                    href="https://github.com/dx-tooling/ask-a-human"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 text-primary-600 dark:text-primary-400 hover:underline"
                                >
                                    <svg
                                        className="w-5 h-5"
                                        fill="currentColor"
                                        viewBox="0 0 24 24"
                                        aria-hidden="true"
                                    >
                                        <path
                                            fillRule="evenodd"
                                            d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                                            clipRule="evenodd"
                                        />
                                    </svg>
                                    View on GitHub
                                </a>
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-500">
                                Version 0.1.0
                            </p>
                        </CardContent>
                    </Card>
                </section>
            </main>
        </div>
    );
}
