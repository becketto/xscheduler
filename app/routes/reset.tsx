import { Form, useActionData, useParams } from "@remix-run/react";
import type { ActionFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { db } from "../utils/db.server";
import bcrypt from "bcryptjs";
import { AuthLayout, AuthInput, AuthButton, AuthError } from "../components/AuthLayout";

export const action: ActionFunction = async ({ request, params }) => {
    const formData = await request.formData();
    const password = formData.get("password");
    const confirmPassword = formData.get("confirmPassword");
    const { token } = params;

    if (
        typeof password !== "string" ||
        typeof confirmPassword !== "string"
    ) {
        return json({ error: "Invalid form data" }, { status: 400 });
    }

    if (password !== confirmPassword) {
        return json({ error: "Passwords don't match" }, { status: 400 });
    }

    if (password.length < 8) {
        return json({ error: "Password must be at least 8 characters long" }, { status: 400 });
    }

    const user = await db.user.findFirst({
        where: {
            resetToken: token,
            resetTokenExpiresAt: {
                gt: new Date()
            }
        }
    });

    if (!user) {
        return json({ error: "Invalid or expired reset token" }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // Update password and invalidate reset token
    await db.user.update({
        where: { id: user.id },
        data: {
            passwordHash,
            resetToken: null,
            resetTokenExpiresAt: null
        }
    });

    return redirect("/auth-flow/login?success=password-reset");
};

export default function ResetPassword() {
    const actionData = useActionData<typeof action>();

    return (
        <AuthLayout
            title="Reset your password"
            subtitle="Enter a new password"
        >
            <Form method="post" className="space-y-6">
                <AuthInput
                    id="password"
                    name="password"
                    type="password"
                    label="New password"
                    placeholder="••••••••"
                    required
                    minLength={8}
                />

                <AuthInput
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    label="Confirm new password"
                    placeholder="••••••••"
                    required
                    minLength={8}
                />

                {actionData?.error && (
                    <AuthError error={actionData.error} />
                )}

                <AuthButton>Reset password</AuthButton>
            </Form>
        </AuthLayout>
    );
} 