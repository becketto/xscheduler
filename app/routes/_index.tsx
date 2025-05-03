import { type LoaderFunction, json } from "@remix-run/node";
import { Link } from "@remix-run/react";

export const loader: LoaderFunction = async ({ request }) => {
  return json({});
};

export default function Index() {
  const loginPath = "/login";
  const registerPath = "/register";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 text-center">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
            Auth Boilerplate
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            A reusable authentication system for your projects
          </p>
        </div>

        <div className="space-y-4">
          <Link
            to={loginPath}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Sign In
          </Link>
          <Link
            to={registerPath}
            className="w-full flex justify-center py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
          >
            Create Account
          </Link>
        </div>

        <div className="mt-6 text-center text-sm">
          <p className="text-gray-600 dark:text-gray-400">
            Start building with secure authentication
          </p>
        </div>
      </div>
    </div>
  );
} 