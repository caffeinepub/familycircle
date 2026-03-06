import { Button } from "@/components/ui/button";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { motion } from "motion/react";
import { useEffect } from "react";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { useGetCallerUserProfile } from "../hooks/useQueries";

export function LoginPage() {
  const navigate = useNavigate();
  const {
    login,
    clear,
    isLoggingIn,
    isLoginError,
    loginError,
    identity,
    isInitializing,
  } = useInternetIdentity();
  const { data: profile, isFetched: profileFetched } =
    useGetCallerUserProfile();

  // Get redirect param
  const search = useSearch({ strict: false }) as { redirect?: string };
  const redirectTo = search?.redirect;

  useEffect(() => {
    if (!identity) return;
    if (!profileFetched) return;

    if (profile) {
      // Has profile → go to intended destination or feed
      if (redirectTo) {
        navigate({ to: redirectTo });
      } else {
        navigate({ to: "/feed" });
      }
    } else {
      // No profile → setup
      navigate({ to: "/setup" });
    }
  }, [identity, profile, profileFetched, navigate, redirectTo]);

  const handleLogin = () => {
    if (identity) {
      clear();
    } else {
      login();
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-sm"
      >
        <div className="bg-card rounded-3xl shadow-card-hover border border-border/50 p-8 text-center card-grain">
          <div className="flex justify-center mb-6">
            <img
              src="/assets/generated/mycircle-logo-transparent.dim_120x120.png"
              alt="MyCircle"
              className="h-16 w-16"
            />
          </div>

          <h1 className="font-display font-bold text-2xl text-foreground mb-2">
            Welcome back
          </h1>
          <p className="text-muted-foreground text-sm mb-8 leading-relaxed">
            Sign in to MyCircle to see posts from your friends and family.
          </p>

          {isLoginError && (
            <div className="mb-4 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">
              {loginError?.message ?? "Sign in failed. Please try again."}
            </div>
          )}

          <Button
            size="lg"
            className="w-full h-12 text-base font-semibold rounded-xl"
            onClick={handleLogin}
            disabled={isLoggingIn || isInitializing}
          >
            {isLoggingIn || isInitializing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              "Sign in with Internet Identity"
            )}
          </Button>

          <p className="text-xs text-muted-foreground mt-6 leading-relaxed">
            Internet Identity is a secure, password-free authentication system.
            Your identity is never shared with this app.
          </p>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          © {new Date().getFullYear()}. Built with ❤️ using{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            className="text-primary hover:underline"
            target="_blank"
            rel="noreferrer"
          >
            caffeine.ai
          </a>
        </p>
      </motion.div>
    </div>
  );
}
