import { LoaderFunction, redirect, json } from "@remix-run/node";
import { sessionStorage } from "~/auth/session.server";
import { db } from "../utils/db.server"; //THIS IS THE CORRECT PATH DON'T CHANGE

const X_CLIENT_ID = process.env.X_CLIENT_ID!;
const X_CLIENT_SECRET = process.env.X_CLIENT_SECRET!;
const CALLBACK_URL = "http://localhost:5173/auth/x/callback";

export const loader: LoaderFunction = async ({ request }) => {
    console.log("Callback hit with URL:", request.url);

    const session = await sessionStorage.getSession(request.headers.get("Cookie"));
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const codeVerifier = session.get("codeVerifier");

    try {
        // Get token from Twitter
        const tokenResponse = await fetch('https://api.twitter.com/2/oauth2/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${Buffer.from(`${X_CLIENT_ID}:${X_CLIENT_SECRET}`).toString('base64')}`
            },
            body: new URLSearchParams({
                code: code!,
                grant_type: 'authorization_code',
                client_id: X_CLIENT_ID,
                redirect_uri: CALLBACK_URL,
                code_verifier: codeVerifier,
            })
        });

        if (!tokenResponse.ok) {
            throw new Error(`Token exchange failed: ${await tokenResponse.text()}`);
        }

        const { access_token, refresh_token, expires_in } = await tokenResponse.json();

        // Get user info from Twitter
        const userResponse = await fetch('https://api.twitter.com/2/users/me', {
            headers: {
                'Authorization': `Bearer ${access_token}`
            }
        });

        if (!userResponse.ok) {
            throw new Error(`Failed to get user info: ${await userResponse.text()}`);
        }

        const { data: xUser } = await userResponse.json();

        // Create or update user in database
        const user = await db.user.upsert({
            where: {
                email: `${xUser.id}@twitter.com`
            },
            create: {
                email: `${xUser.id}@twitter.com`,
                xCredentials: {
                    create: {
                        accessToken: access_token,
                        refreshToken: refresh_token,
                        tokenExpiresAt: new Date(Date.now() + expires_in * 1000)
                    }
                }
            },
            update: {
                xCredentials: {
                    upsert: {
                        create: {
                            accessToken: access_token,
                            refreshToken: refresh_token,
                            tokenExpiresAt: new Date(Date.now() + expires_in * 1000)
                        },
                        update: {
                            accessToken: access_token,
                            refreshToken: refresh_token,
                            tokenExpiresAt: new Date(Date.now() + expires_in * 1000)
                        }
                    }
                }
            },
            include: {
                xCredentials: true
            }
        });

        console.log("Created/Updated user:", user);

        // Store the user ID and access token in session
        session.set("userId", user.id);
        session.set("accessToken", access_token);

        return redirect("/post", {
            headers: {
                "Set-Cookie": await sessionStorage.commitSession(session)
            }
        });
    } catch (error) {
        console.error('Error in callback:', error);
        return redirect("/?error=auth_failed");
    }
};