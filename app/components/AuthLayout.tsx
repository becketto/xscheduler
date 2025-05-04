import React from "react";

type AuthLayoutProps = {
    children: React.ReactNode;
    title: string;
    subtitle: string;
};

export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
    return (
        <div
            className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-900 to-purple-900"
            key="auth-layout"
        >
            <div className="max-w-md w-full p-8 rounded-xl shadow-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                <div className="mb-8 text-center">
                    <h2 className="text-3xl font-bold mb-2 text-gray-900 dark:text-white">{title}</h2>
                    <p className="text-gray-600 dark:text-gray-300">{subtitle}</p>
                </div>
                {children}
            </div>
        </div>
    );
}

export function AuthInput({
    id,
    name,
    type = "text",
    label,
    placeholder,
    required = false,
}: {
    id: string;
    name: string;
    type?: string;
    label: string;
    placeholder: string;
    required?: boolean;
}) {
    return (
        <div>
            <label htmlFor={id} className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                {label}
            </label>
            <input
                id={id}
                name={name}
                type={type}
                required={required}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder={placeholder}
            />
        </div>
    );
}

export function AuthButton({ children }: { children: React.ReactNode }) {
    return (
        <button
            type="submit"
            className="w-full py-3 px-4 rounded-lg font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
        >
            {children}
        </button>
    );
}

export function AuthError({ error }: { error: string | null }) {
    if (!error) return null;

    return (
        <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 rounded-lg text-sm">
            {error}
        </div>
    );
}

export function AuthDivider({ text }: { text: string }) {
    return (
        <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
            </div>
            <div className="relative flex justify-center">
                <span className="px-2 bg-white dark:bg-gray-800 text-sm text-gray-500 dark:text-gray-400">
                    {text}
                </span>
            </div>
        </div>
    );
}

export function AuthLink({ href, children }: { href: string; children: React.ReactNode }) {
    return (
        <a href={href} className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400">
            {children}
        </a>
    );
} 