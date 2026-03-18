import { Toaster } from "@/components/ui/sonner";
import {
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useActor } from "./hooks/useActor";
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
const LOADING_TIMEOUT_MS = 4_000;

function IndexPage() {
  const { identity, isInitializing } = useInternetIdentity();
  const { error: actorError } = useActor();
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
      if (!timerRef.current) {
        timerRef.current = setTimeout(() => {
          setTimedOut(true);
        }, LOADING_TIMEOUT_MS);
      }
    } else {
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

  // Show explicit error screen if actor creation failed (all retries exhausted)
  if (actorError) {
    return (
      <div
        className="min-h-screen bg-background flex items-center justify-center p-6"
        data-ocid="app.error_state"
      >
        <div className="flex flex-col items-center gap-6 max-w-sm text-center">
          <img
            src="/assets/generated/mycircle-logo-transparent.dim_120x120.png"
            alt="MyCircle"
            className="h-12 w-12 opacity-60"
          />
          <div className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold text-foreground">
              Something went wrong loading the app.
            </h2>
            <p className="text-sm text-muted-foreground">
              This may be a temporary issue. Please reload and try again.
            </p>
          </div>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-6 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
            data-ocid="app.reload_button"
          >
            Reload
          </button>
        </div>
      </div>
    );
  }

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

  if (isFetched && !timedOut && !profile && !profileError) {
    return <SetupPage />;
  }

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
