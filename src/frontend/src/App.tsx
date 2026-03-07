import { Toaster } from "@/components/ui/sonner";
import {
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useInternetIdentity } from "./hooks/useInternetIdentity";
import { useGetCallerUserProfile } from "./hooks/useQueries";

import { EditProfilePage } from "./pages/EditProfilePage";
import { FeedPage } from "./pages/FeedPage";
import { FriendsPage } from "./pages/FriendsPage";
// Pages
import { LandingPage } from "./pages/LandingPage";
import { LoginPage } from "./pages/LoginPage";
import { PostPage } from "./pages/PostPage";
import { ProfilePage } from "./pages/ProfilePage";
import { SetupPage } from "./pages/SetupPage";

// ------ Root Route ------

function RootLayout() {
  return (
    <>
      <Outlet />
      <Toaster position="bottom-right" richColors closeButton />
    </>
  );
}

const rootRoute = createRootRoute({
  component: RootLayout,
});

// ------ Index Route (redirect based on auth state) ------

// Maximum milliseconds to wait for profile load before proceeding anyway.
// This prevents the loading screen from hanging forever if the backend
// call stalls. Kept intentionally short so signed-in users aren't stuck.
const LOADING_TIMEOUT_MS = 4_000;

function IndexPage() {
  const { identity, isInitializing } = useInternetIdentity();
  const {
    data: profile,
    isLoading: profileLoading,
    isFetched,
    isError: profileError,
  } = useGetCallerUserProfile();

  // Escape hatch: if we have an identity and loading hasn't resolved within
  // LOADING_TIMEOUT_MS, force-proceed so the user isn't stuck forever.
  const [timedOut, setTimedOut] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (identity && profileLoading && !isFetched) {
      // Start the timeout only when authenticated but still loading
      if (!timerRef.current) {
        timerRef.current = setTimeout(() => {
          setTimedOut(true);
        }, LOADING_TIMEOUT_MS);
      }
    } else {
      // Loading resolved — clear any pending timer
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      setTimedOut(false);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [identity, profileLoading, isFetched]);

  // Show loading screen only while initialising auth or loading profile,
  // BUT stop showing it if we've timed out (so the user isn't stuck).
  const isStillLoading = !timedOut && (isInitializing || profileLoading);

  if (isStillLoading) {
    return (
      <div
        className="min-h-screen bg-background flex items-center justify-center"
        data-ocid="app.loading_state"
      >
        <div className="flex flex-col items-center gap-3">
          <img
            src="/assets/generated/mycircle-logo-transparent.dim_120x120.png"
            alt="MyCircle"
            className="h-10 w-10 animate-pulse"
          />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!identity) {
    return <LandingPage />;
  }

  // Only route to setup when we definitively confirmed there is no profile:
  // the query completed (isFetched), we did NOT time out, there is no data,
  // and there is no error. This is the true "new user" signal.
  // Never route to setup on a timeout alone — prefer feed for signed-in users
  // so profile data can finish loading in the background.
  if (isFetched && !timedOut && !profile && !profileError) {
    return <SetupPage />;
  }

  // Signed-in user: go to feed (profile loads asynchronously in Navbar/FeedPage)
  return <FeedPage />;
}

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: IndexPage,
});

// ------ Login Route ------

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  component: LoginPage,
});

// ------ Setup Route ------

const setupRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/setup",
  component: SetupPage,
});

// ------ Feed Route ------

const feedRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/feed",
  component: FeedPage,
});

// ------ Profile Edit Route (must come before /profile/$username) ------

const profileEditRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/profile/edit",
  component: EditProfilePage,
});

// ------ Profile Route ------

const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/profile/$username",
  component: ProfilePage,
});

// ------ Friends Route ------

const friendsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/friends",
  component: FriendsPage,
});

// ------ Post Route ------

const postRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/post/$postId",
  component: PostPage,
});

// ------ Router ------

const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  setupRoute,
  feedRoute,
  profileEditRoute,
  profileRoute,
  friendsRoute,
  postRoute,
]);

const router = createRouter({
  routeTree,
  defaultPreload: "intent",
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export default function App() {
  return <RouterProvider router={router} />;
}
