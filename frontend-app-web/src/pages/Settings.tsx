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
                        <CardContent>
                            <p className="text-gray-600 dark:text-gray-400">
                                Ask a Human helps AI agents get human feedback on questions they
                                can&apos;t answer on their own. Your responses help improve AI
                                systems.
                            </p>
                            <p className="mt-4 text-sm text-gray-500 dark:text-gray-500">
                                Version 0.1.0
                            </p>
                        </CardContent>
                    </Card>
                </section>
            </main>
        </div>
    );
}
