import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { ArrowLeft, Loader2, Lock } from "lucide-react";
import { motion } from "motion/react";
import { Navbar } from "../components/Navbar";
import { PostCard } from "../components/PostCard";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useGetAcceptedFriends,
  useGetCallerUserProfile,
  useGetPostById,
  useGetUserProfile,
} from "../hooks/useQueries";

export function PostPage() {
  const params = useParams({ strict: false }) as { postId?: string };
  const postId = params.postId ? BigInt(params.postId) : undefined;
  const navigate = useNavigate();
  const { identity } = useInternetIdentity();

  const { data: post, isLoading: postLoading } = useGetPostById(postId);
  useGetCallerUserProfile();
  const { data: friends } = useGetAcceptedFriends();
  const { data: authorProfile } = useGetUserProfile(post?.owner);

  const currentUserPrincipal = identity?.getPrincipal().toString();
  const isOwner = post ? currentUserPrincipal === post.owner.toString() : false;

  // Check if viewer is friends with post owner
  const isFriend = post
    ? friends?.some((f) => f.toString() === post.owner.toString())
    : false;

  const canView = isOwner || isFriend;

  if (!identity) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <Lock className="h-10 w-10 text-muted-foreground/40 mx-auto mb-4" />
          <h2 className="font-display font-bold text-xl text-foreground mb-2">
            Sign in to view this post
          </h2>
          <p className="text-muted-foreground text-sm mb-6">
            This post is only visible to friends.
          </p>
          <Button
            onClick={() =>
              navigate({
                to: "/login",
                search: { redirect: `/post/${postId}` },
              })
            }
          >
            Sign in
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate({ to: -1 as never })}
            className="h-8 w-8"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="font-display font-semibold text-base text-foreground">
            Post
          </h1>
        </div>

        {postLoading ? (
          <div className="bg-card rounded-2xl overflow-hidden shadow-card border border-border/50">
            <div className="flex items-center gap-3 px-4 py-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="space-y-1.5">
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
            <Skeleton className="w-full h-72" />
            <div className="px-4 py-3 space-y-1.5">
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-3.5 w-3/4" />
            </div>
          </div>
        ) : !post ? (
          <div className="text-center py-16">
            <p className="font-display text-lg font-semibold text-foreground mb-2">
              Post not found
            </p>
            <p className="text-muted-foreground text-sm mb-6">
              This post may have been deleted or doesn't exist.
            </p>
            <Button asChild variant="outline">
              <Link to="/feed">Go to feed</Link>
            </Button>
          </div>
        ) : !canView ? (
          <div className="text-center py-16 px-4">
            <Lock className="h-10 w-10 text-muted-foreground/40 mx-auto mb-4" />
            <h2 className="font-display font-bold text-xl text-foreground mb-2">
              Private post
            </h2>
            <p className="text-muted-foreground text-sm mb-6 max-w-xs mx-auto">
              You need to be friends with{" "}
              <span className="font-semibold">
                @{authorProfile?.username ?? "this user"}
              </span>{" "}
              to view this post.
            </p>
            {authorProfile?.username && (
              <Button asChild variant="outline">
                <Link
                  to="/profile/$username"
                  params={{ username: authorProfile.username }}
                >
                  View Profile
                </Link>
              </Button>
            )}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <PostCard
              post={post}
              authorProfile={authorProfile}
              isOwner={isOwner}
              index={0}
            />
          </motion.div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 py-6 text-center mt-10">
        <p className="text-xs text-muted-foreground">
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
      </footer>
    </div>
  );
}
