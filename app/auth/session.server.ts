import { createCookieSessionStorage, redirect } from "@remix-run/node";
import { db } from "../utils/db.server";

// Session handling
export const sessionStorage = createCookieSessionStorage({
    cookie: {
        name: "__session",
        httpOnly: true,
        path: "/",
        sameSite: "lax",
        secrets: [process.env.SESSION_SECRET || "s3cr3t"],
        secure: process.env.NODE_ENV === "production",
    },
});

// Session management
export async function createUserSession(userId: string, redirectTo: string) {
    const session = await sessionStorage.getSession();
    session.set("userId", userId);

    return redirect(redirectTo, {
        headers: { "Set-Cookie": await sessionStorage.commitSession(session) },
    });
}

export async function getUserId(request: Request) {
    const session = await sessionStorage.getSession(request.headers.get("Cookie"));
    return session.get("userId");
}

export async function requireUserId(request: Request) {
    const userId = await getUserId(request);
    if (!userId) throw redirect("/auth-flow/login");
    return userId;
}

export async function logout(request: Request) {
    const session = await sessionStorage.getSession(request.headers.get("Cookie"));
    return redirect("/auth-flow/login", {
        headers: { "Set-Cookie": await sessionStorage.destroySession(session) },
    });
}