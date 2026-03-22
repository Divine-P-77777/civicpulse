import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Define all routes that require the user to be logged in
const isProtectedRoute = createRouteMatcher([
  "/chat(.*)",
  "/live(.*)",
  "/admin(.*)",
  "/draftcreation(.*)"
]);

export default clerkMiddleware(async (auth, req) => {
  // If the user is trying to access a protected route and is not logged in,
  // we can use auth.protect() with a specific fallback URL.
  // We want to force a redirect to the sign-in modal, but in Clerk App router
  // if you hit a protected route when logged out, it redirects to the SignIn page.
  // Next.js with Clerk automatically handles the post-login redirect backup to the URL they tried to visit.
  // So auth.protect() naturally achieves the goal: "trigger login after successfully should comes in /chat"
  
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
