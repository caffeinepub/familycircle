import { Button } from "@/components/ui/button";
import type { Principal } from "@icp-sdk/core/principal";
import { Newspaper, Plus } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import type { Post } from "../backend";
import { CreatePostModal } from "../components/CreatePostModal";
import { Navbar } from "../components/Navbar";
import { PostCard } from "../components/PostCard";
import { FeedSkeleton } from "../components/PostSkeleton";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useGetCallerUserProfile,
  useGetMainFeed,
  useGetUserProfile,
} from "../hooks/useQueries";

// Individual post with resolved author
function FeedPost({
  post,
  currentUserPrincipal,
  index,
}: {
  post: Post;
  currentUserPrincipal: string | undefined;
  index: number;
}) {
  const { data: authorProfile } = useGetUserProfile(post.owner);
  const isOwner = currentUserPrincipal === post.owner.toString();

  return (
    <PostCard
      post={post}
      authorProfile={authorProfile}
      isOwner={isOwner}
      index={index}
      currentUserPrincipal={currentUserPrincipal}
    />
  );
}

export function FeedPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const { identity } = useInternetIdentity();
  const { data: feed, isLoading } = useGetMainFeed();

  const currentUserPrincipal = identity?.getPrincipal().toString();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="max-w-2xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display font-bold text-2xl text-foreground">
              Your Feed
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Posts from your friends
            </p>
          </div>
          <Button
            onClick={() => setCreateOpen(true)}
            className="gap-2 sm:hidden"
            size="sm"
          >
            <Plus className="h-4 w-4" />
            Post
          </Button>
        </div>

        {/* Feed content */}
        {isLoading ? (
          <FeedSkeleton />
        ) : !feed || feed.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16 px-4"
          >
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
              <Newspaper className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="font-display font-semibold text-lg text-foreground mb-2">
              Your feed is empty
            </h2>
            <p className="text-muted-foreground text-sm mb-6 max-w-sm mx-auto">
              Add friends to see their posts here, or be the first to share
              something!
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={() => setCreateOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Create your first post
              </Button>
            </div>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {feed
              .slice()
              .sort((a, b) => Number(b.createdAt - a.createdAt))
              .map((post, i) => (
                <FeedPost
                  key={post.id.toString()}
                  post={post}
                  currentUserPrincipal={currentUserPrincipal}
                  index={i}
                />
              ))}
          </div>
        )}
      </main>

      {/* FAB for mobile */}
      <Button
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-card-hover sm:hidden p-0"
        onClick={() => setCreateOpen(true)}
        aria-label="Create post"
      >
        <Plus className="h-6 w-6" />
      </Button>

      <CreatePostModal open={createOpen} onClose={() => setCreateOpen(false)} />

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
