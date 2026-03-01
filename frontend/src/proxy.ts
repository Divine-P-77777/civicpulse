import { clerkMiddleware } from "@clerk/nextjs/server";
import { type NextRequest, type NextFetchEvent } from "next/server";

// We create an instance of the Clerk middleware
const clerkHandler = clerkMiddleware();

// Explicitly invoke it via an exported 'proxy' function to satisfy Next.js 16 requirements 
export function proxy(request: NextRequest, event: NextFetchEvent) {
    return clerkHandler(request, event);
}

export const config = {
    matcher: [
        // Skip Next.js internals and all static files, unless found in search params
        "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
        // Always run for API routes
        "/(api|trpc)(.*)",
    ],
};
