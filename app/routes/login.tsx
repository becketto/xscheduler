import { type LoaderFunction, type ActionFunction, json, redirect } from "@remix-run/node";
import { Form, useSearchParams } from "@remix-run/react";
import {
    AuthLayout,
    AuthInput,
    AuthButton,
    AuthError,
    AuthDivider,
    AuthLink
} from "../components/AuthLayout";
import { createUserSession } from "../auth/session.server";
import { db } from "../utils/db.server";
import bcrypt from "bcryptjs";

export const loader: LoaderFunction = async ({ request }) => {
    return json({});
};

export const action: ActionFunction = async ({ request }) => {
    const formData = await request.formData();
    const email = formData.get("email");
    const password = formData.get("password");

    if (
        typeof email !== "string" ||
        typeof password !== "string" ||
        !email.includes("@")
    ) {
        return json({ error: "Please enter a valid email and password" }, { status: 400 });
    }

    // Find user and verify password
    const user = await db.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
        return json({ error: "Invalid email or password" }, { status: 400 });
    }

    return redirect(`/post`);
};

export default function Login() {
    const [searchParams] = useSearchParams();
    const error = searchParams.get("error");

    return (
        <AuthLayout title="Welcome Back" subtitle="Sign in to your account">
            <AuthError error={error} />

            <Form method="post" className="space-y-5">
                <AuthInput
                    id="email"
                    name="email"
                    type="email"
                    label="Email address"
                    placeholder="you@example.com"
                    required
                />

                <AuthInput
                    id="password"
                    name="password"
                    type="password"
                    label="Password"
                    placeholder="••••••••"
                    required
                />

                <div className="flex items-center justify-between">
                    <div className="flex items-center">
                        <input
                            id="rememberMe"
                            name="rememberMe"
                            type="checkbox"
                            className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500 bg-white dark:bg-gray-700"
                        />
                        <label htmlFor="rememberMe" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                            Remember me
                        </label>
                    </div>
                    <div className="text-sm">
                        <AuthLink href="/auth-flow/forgot-password">Forgot password?</AuthLink>
                    </div>
                </div>

                <AuthButton>Sign in</AuthButton>

                <div className="text-center text-sm text-gray-600 dark:text-gray-400 mt-6">
                    Don't have an account?{" "}
                    <AuthLink href="/auth-flow/register">Create a free account</AuthLink>
                </div>
            </Form>
        </AuthLayout>
    );
}
