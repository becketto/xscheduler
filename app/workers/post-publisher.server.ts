import { db } from "../utils/db.server"; //THIS IS THE CORRECT PATH DON'T CHANGE

async function publishPendingPosts() {
    // Find all pending posts that are due to be published
    const postsToPublish = await db.post.findMany({
        where: {
            status: "pending",
            scheduledFor: {
                lte: new Date(), // Posts that are due or overdue
            },
        },
        include: {
            user: {
                include: {
                    xCredentials: true,
                },
            },
        },
    });

    for (const post of postsToPublish) {
        try {
            if (!post.user.xCredentials) {
                throw new Error("X credentials not found");
            }

            // Make API call to X to create the tweet
            const response = await fetch("https://api.twitter.com/2/tweets", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${post.user.xCredentials.accessToken}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ text: post.content }),
            });

            if (!response.ok) {
                throw new Error(`Failed to post tweet: ${await response.text()}`);
            }

            // Update post status to completed
            await db.post.update({
                where: { id: post.id },
                data: { status: "completed" },
            });
        } catch (error) {
            console.error(`Failed to publish post ${post.id}:`, error);
            // Update post status to failed
            await db.post.update({
                where: { id: post.id },
                data: { status: "failed" },
            });
        }
    }
}

// If you're using Remix's built-in server
let interval: NodeJS.Timeout;

export function startPostPublisher() {
    // Check for posts every minute
    interval = setInterval(publishPendingPosts, 60 * 1000);
}

export function stopPostPublisher() {
    if (interval) {
        clearInterval(interval);
    }
} 