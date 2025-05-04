import { redirect } from "@remix-run/node";
import type { ActionFunction } from "@remix-run/node";
import { sessionStorage } from "~/auth/session.server";
import crypto from "crypto";

const X_CLIENT_ID = process.env.X_CLIENT_ID!;
const CALLBACK_URL = "http://localhost:5173/auth/x/callback";

// Utility function to generate a random string for code_verifier
function generateCodeVerifier(): string {
    return crypto.randomBytes(32).toString('hex');
}

// Utility function to generate code_challenge from code_verifier
function generateCodeChallenge(verifier: string): string {
    return crypto.createHash('sha256')
        .update(verifier)
        .digest('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
}

export const action: ActionFunction = async ({ request }) => {
    // Validate environment variable
    if (!X_CLIENT_ID) {
        throw new Error("X_CLIENT_ID environment variable is not set");
    }

    // Get session
    const session = await sessionStorage.getSession(request.headers.get("Cookie"));

    // Generate state for CSRF protection
    const state = crypto.randomBytes(16).toString("hex");
    session.set("oauth2:state", state);

    // Generate and store code verifier
    const codeVerifier = generateCodeVerifier();
    session.set("codeVerifier", codeVerifier);

    // Generate code challenge
    const codeChallenge = generateCodeChallenge(codeVerifier);

    // Build authorization URL
    const authUrl = new URL('https://twitter.com/i/oauth2/authorize');
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('client_id', X_CLIENT_ID);
    authUrl.searchParams.append('redirect_uri', CALLBACK_URL);
    authUrl.searchParams.append('scope', 'tweet.read tweet.write users.read offline.access');
    authUrl.searchParams.append('state', state);
    authUrl.searchParams.append('code_challenge', codeChallenge);
    authUrl.searchParams.append('code_challenge_method', 'S256');

    return redirect(authUrl.toString(), {
        headers: {
            "Set-Cookie": await sessionStorage.commitSession(session),
        },
    });
};