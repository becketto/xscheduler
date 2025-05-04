import { Form, useLoaderData, useActionData, useNavigation, useSubmit } from "@remix-run/react";
import { json, ActionFunction, LoaderFunction, redirect } from "@remix-run/node";
import { sessionStorage } from "~/auth/session.server";
import { db } from "../utils/db.server"; //THIS IS THE CORRECT PATH DON'T CHANGE
import { useRef, useEffect } from "react";

type LoaderData = {
    message: string;
    isAuthenticated: boolean;
    userEmail: string;
    scheduledPosts: Array<{
        id: number;
        content: string;
        scheduledFor: Date;
        status: string;
        error?: string;
    }>;
    remainingPosts: number; // X API limit
};

type ActionData = {
    success?: boolean;
    error?: string;
    posts?: any[];
    message?: string;
    action?: 'scheduled' | 'cleared' | 'deleted';
};

export const loader: LoaderFunction = async ({ request }) => {
    const session = await sessionStorage.getSession(request.headers.get("Cookie"));
    const userId = session.get("userId");

    if (!userId) {
        return redirect("/");
    }

    const user = await db.user.findUnique({
        where: { id: userId },
        include: {
            xCredentials: true,
            posts: {
                where: {
                    isDeleted: false
                },
                orderBy: { scheduledFor: 'asc' }
            }
        }
    });

    if (!user?.xCredentials) {
        return redirect("/");
    }

    // Get current month's usage
    const currentMonth = new Date().toISOString().slice(0, 7); // Format: "2024-03"
    const apiUsage = await db.xApiUsage.findUnique({
        where: { monthYear: currentMonth }
    });

    const postsUsed = apiUsage?.postsUsed || 0;
    const remainingPosts = 500 - postsUsed;

    return json<LoaderData>({
        message: "Welcome to your dashboard",
        isAuthenticated: true,
        userEmail: user.email,
        scheduledPosts: user.posts,
        remainingPosts
    });
};

export const action: ActionFunction = async ({ request }) => {
    const session = await sessionStorage.getSession(request.headers.get("Cookie"));
    const userId = session.get("userId");

    if (!userId) {
        return json<ActionData>({ error: "Not authenticated" }, { status: 401 });
    }

    const formData = await request.formData();
    const intent = formData.get("intent");

    if (intent === "delete") {
        const postId = parseInt(formData.get("postId") as string);
        const post = await db.post.findUnique({ where: { id: postId } });

        if (post?.status === "completed") {
            await db.post.update({
                where: { id: postId },
                data: { isDeleted: true }
            });
        } else {
            await db.post.delete({ where: { id: postId } });
        }

        return json<ActionData>({
            success: true,
            message: "Post deleted",
            action: 'deleted'
        });
    }

    if (intent === "clear-completed") {
        await db.post.updateMany({
            where: {
                userId,
                status: "completed"
            },
            data: {
                isDeleted: true
            }
        });
        return json<ActionData>({
            success: true,
            message: "Completed posts cleared",
            action: 'cleared'
        });
    }

    // Regular post scheduling
    const posts = (formData.get("posts") as string)?.split("\n").filter(Boolean);
    const intervalMinutes = parseInt(formData.get("interval") as string);

    if (!posts?.length || !intervalMinutes) {
        return json<ActionData>({ error: "Please provide posts and interval" }, { status: 400 });
    }

    try {
        const now = new Date();
        // Find the latest scheduled post for this user
        const latestPost = await db.post.findFirst({
            where: {
                userId,
                status: "pending"
            },
            orderBy: {
                scheduledFor: 'desc'
            }
        });

        // Start scheduling from either 30 mins from now or after the latest scheduled post
        let startTime = new Date(Math.max(
            now.getTime() + intervalMinutes * 60 * 1000,
            latestPost ? new Date(latestPost.scheduledFor).getTime() + intervalMinutes * 60 * 1000 : 0
        ));

        const createdPosts = await Promise.all(
            posts.map(async (content) => {
                const post = await db.post.create({
                    data: {
                        content,
                        scheduledFor: startTime,
                        userId,
                        status: "pending"
                    },
                });
                // Next post should be scheduled after this one
                startTime = new Date(startTime.getTime() + intervalMinutes * 60 * 1000);
                return post;
            })
        );

        return json<ActionData>({
            success: true,
            posts: createdPosts,
            message: `Successfully scheduled ${createdPosts.length} posts`,
            action: 'scheduled'
        });
    } catch (error) {
        console.error("Error creating posts:", error);
        return json<ActionData>({ error: "Failed to create posts" }, { status: 500 });
    }
};

export default function Dashboard() {
    const { message, isAuthenticated, userEmail, scheduledPosts, remainingPosts } = useLoaderData<LoaderData>();
    const actionData = useActionData<ActionData>();
    const navigation = useNavigation();
    const isSubmitting = navigation.state === "submitting";
    const formRef = useRef<HTMLFormElement>(null);

    // Only clear form if we just scheduled posts
    useEffect(() => {
        if (actionData?.success && actionData.action === 'scheduled' && formRef.current) {
            formRef.current.reset();
            // Reset interval back to 30
            const intervalInput = formRef.current.querySelector('input[name="interval"]') as HTMLInputElement;
            if (intervalInput) intervalInput.value = "30";
        }
    }, [actionData]);

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
            <header className="bg-white dark:bg-gray-800 shadow">
                <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        Dashboard
                    </h1>
                    <div className="flex items-center gap-4">
                        <div className="text-sm text-gray-600 dark:text-gray-300">
                            {remainingPosts} posts remaining this month
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-300">
                            Connected as {userEmail.replace("@twitter.com", "")}
                        </div>
                    </div>
                </div>
            </header>
            <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
                <div className="text-center">
                    <h2 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
                        <span className="block">{message}</span>
                        <span className="block text-indigo-600 dark:text-indigo-400">Schedule your X posts here.</span>
                    </h2>
                    <Form ref={formRef} method="post" className="mt-8 space-y-6">
                        <div className="rounded-md shadow-sm">
                            <textarea
                                name="posts"
                                placeholder="Write your posts here, one per line."
                                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-t-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                rows={5}
                                required
                                disabled={isSubmitting}
                            ></textarea>
                            <input
                                type="number"
                                name="interval"
                                placeholder="Interval between posts (minutes)"
                                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-b-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                min="1"
                                defaultValue="30"
                                required
                                disabled={isSubmitting}
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                        >
                            {isSubmitting ? "Scheduling..." : "Schedule Posts"}
                        </button>
                    </Form>
                </div>

                {/* Success/Error Messages */}
                {actionData?.error && (
                    <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
                        {actionData.error}
                    </div>
                )}
                {actionData?.success && (
                    <div className="mt-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
                        {actionData.message}
                    </div>
                )}

                {/* Scheduled Posts Section */}
                <div className="mt-8">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                            Scheduled Posts
                        </h3>
                        <Form method="post">
                            <input type="hidden" name="intent" value="clear-completed" />
                            <button
                                type="submit"
                                className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                            >
                                Clear Completed Posts
                            </button>
                        </Form>
                    </div>
                    <div className="space-y-4">
                        {scheduledPosts
                            .filter(post => post.status !== "archived")
                            .map((post) => (
                                <div key={post.id}
                                    className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow flex justify-between items-start"
                                >
                                    <div className="flex-1">
                                        <p className="text-gray-900 dark:text-white whitespace-pre-wrap">
                                            {post.content}
                                        </p>
                                        <div className="mt-2 space-y-1">
                                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                                Scheduled for: {new Date(post.scheduledFor).toLocaleString()}
                                            </p>
                                            <div className="flex items-center gap-2">
                                                <span className={`px-2 py-1 rounded-full text-xs ${post.status === "pending" ? "bg-yellow-100 text-yellow-800" :
                                                    post.status === "completed" ? "bg-green-100 text-green-800" :
                                                        post.status === "failed" ? "bg-red-100 text-red-800" :
                                                            "bg-gray-100 text-gray-800"
                                                    }`}>
                                                    {post.status}
                                                </span>
                                                {post.error && (
                                                    <span className="text-xs text-red-600">
                                                        {post.error}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <Form method="post" className="ml-4">
                                        <input type="hidden" name="postId" value={post.id} />
                                        <input type="hidden" name="intent" value="delete" />
                                        <button
                                            type="submit"
                                            className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                                            title="Delete post"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </Form>
                                </div>
                            ))}
                        {scheduledPosts.filter(p => p.status !== "archived").length === 0 && (
                            <p className="text-gray-500 dark:text-gray-400 text-center">
                                No scheduled posts yet.
                            </p>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
} 