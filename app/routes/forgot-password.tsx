import { Form, useActionData } from "@remix-run/react";
import type { ActionFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { db } from "../utils/db.server";
import { randomBytes } from "crypto";
import { AuthLayout, AuthInput, AuthButton, AuthError } from "../components/AuthLayout";

export const action: ActionFunction = async ({ request }) => {
    const formData = await request.formData();
    const email = formData.get("email");

    if (typeof email !== "string") {
        return json({ error: "Invalid email" }, { status: 400 });
    }

    const user = await db.user.findUnique({
        where: { email },
    });

    if (user) {
        const token = randomBytes(32).toString("hex");
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        await db.user.update({
            where: { id: user.id },
            data: {
                resetToken: token,
                resetTokenExpiresAt: expiresAt,
            },
        });

        // Placeholder for email sending logic
        // In a real app, you would integrate with an email service here
        console.log(`Password reset token for ${email}: ${token}`);
    }

    // Always return success to prevent email enumeration
    return json({ success: true });
};

export default function ForgotPassword() {
    const actionData = useActionData<typeof action>();

    return (
        <AuthLayout title="Reset your password" subtitle="Enter your email address">
            <Form method="post" className="space-y-6">
                <AuthInput
                    id="email"
                    name="email"
                    type="email"
                    label="Email address"
                    placeholder="you@example.com"
                    required
                />

                {actionData?.error && (
                    <AuthError error={actionData.error} />
                )}

                {actionData?.success && (
                    <AuthError error="If an account exists with this email, you will receive reset instructions." />
                )}

                <AuthButton>Send reset instructions</AuthButton>
            </Form>
        </AuthLayout>
    );
}
