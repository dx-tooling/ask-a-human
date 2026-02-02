import type { ReactNode } from "react";

interface CardProps {
    children: ReactNode;
    className?: string;
    onClick?: () => void;
    as?: "div" | "article" | "button";
}

export function Card({ children, className = "", onClick, as: Component = "div" }: CardProps) {
    const isInteractive = onClick !== undefined || Component === "button";

    return (
        <Component
            className={`
                bg-white dark:bg-gray-800
                rounded-xl shadow-sm
                border border-gray-200 dark:border-gray-700
                ${isInteractive ? "cursor-pointer hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600 transition-shadow duration-200" : ""}
                ${className}
            `}
            onClick={onClick}
        >
            {children}
        </Component>
    );
}

interface CardContentProps {
    children: ReactNode;
    className?: string;
}

export function CardContent({ children, className = "" }: CardContentProps) {
    return <div className={`p-4 sm:p-6 ${className}`}>{children}</div>;
}
