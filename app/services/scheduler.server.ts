import { processScheduledPosts } from "~/jobs/postWorker.server";
import { db } from "~/utils/db.server";

let schedulerInterval: NodeJS.Timeout | null = null;
let isProcessing = false;

export async function startScheduler() {
    if (schedulerInterval) return;

    // Run the processor every minute
    schedulerInterval = setInterval(async () => {
        // Prevent multiple concurrent processing
        if (isProcessing) {
            console.log("Already processing posts, skipping this run");
            return;
        }

        try {
            isProcessing = true;
            await processScheduledPosts();
        } catch (error) {
            console.error("Error processing posts:", error);
        } finally {
            isProcessing = false;
        }
    }, 60 * 1000);

    // Run immediately on start
    try {
        isProcessing = true;
        await processScheduledPosts();
    } catch (error) {
        console.error("Error in initial post processing:", error);
    } finally {
        isProcessing = false;
    }
}

export function stopScheduler() {
    if (schedulerInterval) {
        clearInterval(schedulerInterval);
        schedulerInterval = null;
    }
} 