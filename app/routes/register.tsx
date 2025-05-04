import { Form, useActionData } from "@remix-run/react";
import type { ActionFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { db } from "../utils/db.server";
import bcrypt from "bcryptjs";
import { createUserSession } from "../auth/session.server";
import { AuthLayout, AuthInput, AuthButton, AuthError, AuthDivider, AuthLink } from "../components/AuthLayout";

export const action: ActionFunction = async ({ request }) => {
    const formData = await request.formData();
    const email = formData.get("email");
    const password = formData.get("password");
    const confirmPassword = formData.get("confirmPassword");

    if (
        typeof email !== "string" ||
        typeof password !== "string" ||
        typeof confirmPassword !== "string"
    ) {
        return json({ error: "Invalid form submission" }, { status: 400 });
    }

    if (password !== confirmPassword) {
        return json({ error: "Passwords don't match" }, { status: 400 });
    }

    const existingUser = await db.user.findUnique({
        where: { email },
    });

    if (existingUser) {
        return json({ error: "User already exists" }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await db.user.create({
        data: { email, passwordHash },
    });

    return createUserSession(user.id, "/dashboard/home");
};

export default function Register() {
    const actionData = useActionData<typeof action>();

    return (
        <AuthLayout title="Create Account" subtitle="Join us today">
            {actionData?.error && (
                <AuthError error={actionData.error} />
            )}

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

                <AuthInput
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    label="Confirm Password"
                    placeholder="••••••••"
                    required
                />

                <AuthButton>Create Account</AuthButton>

                <div className="text-center text-sm text-gray-600 dark:text-gray-400 mt-6">
                    Already have an account?{" "}
                    <AuthLink href="/auth-flow/login">Sign in</AuthLink>
                </div>
            </Form>
        </AuthLayout>
    );
}
