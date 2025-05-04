import { db } from "~/utils/db.server";

const X_CLIENT_ID = process.env.X_CLIENT_ID!;
const X_CLIENT_SECRET = process.env.X_CLIENT_SECRET!;

async function refreshToken(refreshToken: string) {
    try {
        const response = await fetch("https://api.twitter.com/2/oauth2/token", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "Authorization": `Basic ${Buffer.from(`${X_CLIENT_ID}:${X_CLIENT_SECRET}`).toString("base64")}`
            },
            body: new URLSearchParams({
                grant_type: "refresh_token",
                refresh_token: refreshToken
            })
        });

        if (!response.ok) {
            throw new Error(`Failed to refresh token: ${await response.text()}`);
        }

        const data = await response.json();
        return {
            accessToken: data.access_token,
            refreshToken: data.refresh_token,
            expiresAt: new Date(Date.now() + data.expires_in * 1000)
        };
    } catch (error) {
        console.error("Token refresh failed:", error);
        throw error;
    }
}

export async function processScheduledPosts() {
    // Add a lock to prevent multiple instances from processing the same posts
    const lock = await db.lock.create({
        data: {
            id: 'post-processor',
            acquiredAt: new Date()
        }
    }).catch(() => null);

    if (!lock) {
        console.log("Another instance is processing posts");
        return;
    }

    try {
        const pendingPosts = await db.post.findMany({
            where: {
                status: "pending",
                scheduledFor: {
                    lte: new Date(),
                },
                isDeleted: false
            },
            orderBy: { scheduledFor: 'asc' },
            include: {
                user: {
                    include: { xCredentials: true }
                }
            },
            take: 100
        });

        for (const post of pendingPosts) {
            try {
                if (!post.user.xCredentials) {
                    throw new Error("X credentials not found");
                }

                // Check if token is expired or will expire soon (within 5 minutes)
                const tokenExpiresAt = new Date(post.user.xCredentials.tokenExpiresAt);
                const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);

                let accessToken = post.user.xCredentials.accessToken;

                if (tokenExpiresAt <= fiveMinutesFromNow) {
                    if (!post.user.xCredentials.refreshToken) {
                        throw new Error("Refresh token not found and access token is expired");
                    }

                    console.log(`Token expires soon/expired for post ${post.id}, refreshing...`);

                    try {
                        const newTokens = await refreshToken(post.user.xCredentials.refreshToken);

                        // Update credentials in database
                        await db.xCredentials.update({
                            where: { userId: post.user.id },
                            data: {
                                accessToken: newTokens.accessToken,
                                refreshToken: newTokens.refreshToken,
                                tokenExpiresAt: newTokens.expiresAt
                            }
                        });

                        accessToken = newTokens.accessToken;
                    } catch (refreshError) {
                        throw new Error(`Token refresh failed: ${refreshError.message}. User needs to reauthorize.`);
                    }
                }

                // Mark as processing to prevent double-posting
                await db.post.update({
                    where: { id: post.id },
                    data: { status: "processing" }
                });

                const response = await fetch("https://api.twitter.com/2/tweets", {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ text: post.content }),
                });

                if (!response.ok) {
                    throw new Error(`Failed to post tweet: ${await response.text()}`);
                }

                await db.post.update({
                    where: { id: post.id },
                    data: { status: "completed" }
                });

                // Update API usage
                const currentMonth = new Date().toISOString().slice(0, 7);
                await db.xApiUsage.upsert({
                    where: { monthYear: currentMonth },
                    create: {
                        monthYear: currentMonth,
                        postsUsed: 1
                    },
                    update: {
                        postsUsed: {
                            increment: 1
                        }
                    }
                });
            } catch (error) {
                console.error(`Failed to process post ${post.id}:`, error);

                const errorMessage = error.message.includes("reauthorize")
                    ? "X authorization expired. Please reconnect your X account."
                    : error.message;

                await db.post.update({
                    where: { id: post.id },
                    data: {
                        status: "failed",
                        error: errorMessage
                    }
                });

                // If it's an auth error, mark all pending posts as failed
                if (error.message.includes("reauthorize")) {
                    await db.post.updateMany({
                        where: {
                            userId: post.user.id,
                            status: "pending",
                            isDeleted: false
                        },
                        data: {
                            status: "failed",
                            error: errorMessage
                        }
                    });

                    // Break the loop since all subsequent posts will fail
                    break;
                }
            }
        }
    } finally {
        // Release the lock
        await db.lock.delete({
            where: { id: 'post-processor' }
        }).catch(() => { });
    }
} 