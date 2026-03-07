import { Toaster } from "@/components/ui/sonner";
import {
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { useEffect, useState } from "react";
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

// Maximum milliseconds to wait for actor initialisation before bypassing the
// loading gate.  This prevents the app from freezing indefinitely when the
// backend _initializeAccessControlWithSecret call retries on failure (e.g.
// when CAFFEINE_ADMIN_TOKEN env var is not available in the canister).
const ACTOR_INIT_TIMEOUT_MS = 6_000;

function IndexPage() {
  const { identity, isInitializing } = useInternetIdentity();
  const {
    data: profile,
    isLoading: profileLoading,
    isFetched,
  } = useGetCallerUserProfile();

  // Safety valve: if loading takes too long (actor retry loop), stop waiting
  // and route the user based on whether they have a stored identity.
  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    if (!isInitializing && !profileLoading) return;
    const id = window.setTimeout(
      () => setTimedOut(true),
      ACTOR_INIT_TIMEOUT_MS,
    );
    return () => window.clearTimeout(id);
  }, [isInitializing, profileLoading]);

  const isStillLoading = (isInitializing || profileLoading) && !timedOut;

  // While initializing, show nothing (avoids flash)
  if (isStillLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
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

  // Only send to setup when profile was explicitly fetched and confirmed absent.
  // If we timed out (actor init failure) we can't confirm absence, so fall through
  // to FeedPage rather than incorrectly routing an existing user to setup.
  if (isFetched && !profile && !timedOut) {
    // Has identity but no profile → setup
    return <SetupPage />;
  }

  // Has profile (or timed out) → feed
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
