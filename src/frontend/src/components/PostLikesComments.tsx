import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { Principal } from "@icp-sdk/core/principal";
import { Link } from "@tanstack/react-router";
import { Heart, Loader2, MessageCircle, Send, Trash2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import {
  useAddComment,
  useDeleteComment,
  useGetComments,
  useGetLikes,
  useGetUserProfile,
  useLikePost,
} from "../hooks/useQueries";
import { formatRelativeTime } from "../utils/time";
import { UserAvatar } from "./UserAvatar";

// ─── Username resolver ────────────────────────────────────────────────────────

function CommentAuthor({ principal }: { principal: Principal }) {
  const { data: profile } = useGetUserProfile(principal);
  return (
    <span className="font-semibold text-foreground text-xs">
      {profile?.username ?? `${principal.toString().slice(0, 8)}…`}
    </span>
  );
}

// ─── Single comment item ──────────────────────────────────────────────────────

function CommentItem({
  comment,
  postId,
  currentUserPrincipal,
  commentIndex,
}: {
  comment: {
    id: bigint;
    text: string;
    author: Principal;
    createdAt: bigint;
    postId: bigint;
  };
  postId: bigint;
  currentUserPrincipal: string | undefined;
  commentIndex: number;
}) {
  const deleteComment = useDeleteComment();
  const isOwnComment = currentUserPrincipal === comment.author.toString();

  const handleDelete = async () => {
    try {
      await deleteComment.mutateAsync({
        postId,
        commentId: comment.id,
      });
    } catch {
      toast.error("Failed to delete comment");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.2 }}
      className="group flex items-start gap-2 py-1.5"
      data-ocid={`comment.item.${commentIndex}`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-1.5 flex-wrap">
          <CommentAuthor principal={comment.author} />
          <span className="text-xs text-foreground leading-relaxed break-words">
            {comment.text}
          </span>
        </div>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          {formatRelativeTime(comment.createdAt)}
        </p>
      </div>
      {isOwnComment && (
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleteComment.isPending}
          className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive disabled:opacity-40"
          aria-label="Delete comment"
          data-ocid={`post.comment.delete_button.${commentIndex}`}
        >
          {deleteComment.isPending ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Trash2 className="h-3 w-3" />
          )}
        </button>
      )}
    </motion.div>
  );
}

// ─── Single liker avatar (resolves profile) ───────────────────────────────────

function LikerAvatar({
  principal,
  index,
}: {
  principal: Principal;
  index: number;
}) {
  const { data: profile } = useGetUserProfile(principal);
  return (
    <span
      className="inline-flex"
      style={{ marginLeft: index > 0 ? "-8px" : 0, zIndex: 10 - index }}
    >
      <UserAvatar
        profile={profile}
        size="xs"
        className="h-6 w-6 ring-2 ring-background"
      />
    </span>
  );
}

// ─── Liker row in modal ───────────────────────────────────────────────────────

function LikerRow({
  principal,
  index,
  onClose,
}: {
  principal: Principal;
  index: number;
  onClose: () => void;
}) {
  const { data: profile, isLoading } = useGetUserProfile(principal);

  if (isLoading) {
    return (
      <div className="flex items-center gap-3 py-2.5 px-1">
        <Skeleton className="h-8 w-8 rounded-full shrink-0" />
        <Skeleton className="h-4 w-28 rounded" />
      </div>
    );
  }

  if (!profile) return null;

  return (
    <Link
      to="/profile/$username"
      params={{ username: profile.username }}
      onClick={onClose}
      className={cn(
        "flex items-center gap-3 py-2.5 px-2 rounded-lg",
        "hover:bg-muted/60 transition-colors duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      )}
      data-ocid={`post.likers.item.${index}`}
    >
      <UserAvatar profile={profile} size="sm" className="shrink-0" />
      <span className="text-sm font-medium text-foreground">
        @{profile.username}
      </span>
    </Link>
  );
}

// ─── Likers modal ─────────────────────────────────────────────────────────────

function LikersModal({
  open,
  onClose,
  likes,
}: {
  open: boolean;
  onClose: () => void;
  likes: Principal[];
}) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="max-w-sm p-0 overflow-hidden"
        data-ocid="post.likers.modal"
      >
        <DialogHeader className="px-5 pt-5 pb-0">
          <DialogTitle className="text-base font-semibold">
            Liked by
            <span className="ml-1.5 text-muted-foreground font-normal text-sm">
              ({likes.length})
            </span>
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-80 mt-3">
          <div className="px-3 pb-4 space-y-0.5">
            {likes.map((principal, idx) => (
              <LikerRow
                key={principal.toString()}
                principal={principal}
                index={idx + 1}
                onClose={onClose}
              />
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

// ─── Avatar stack (tappable) ──────────────────────────────────────────────────

function LikersAvatarStack({
  likes,
  onOpen,
}: {
  likes: Principal[];
  onOpen: () => void;
}) {
  if (likes.length === 0) return null;

  const MAX_VISIBLE = 3;
  const visible = likes.slice(0, MAX_VISIBLE);
  const overflow = likes.length - MAX_VISIBLE;

  return (
    <motion.button
      type="button"
      onClick={onOpen}
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "flex items-center gap-2 mt-2 group cursor-pointer",
        "rounded-full hover:bg-muted/50 transition-colors duration-150 py-1 px-1 -ml-1",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
      )}
      aria-label={`View ${likes.length} ${likes.length === 1 ? "like" : "likes"}`}
      data-ocid="post.likers.open_modal_button"
    >
      {/* Overlapping avatars */}
      <span className="flex items-center" aria-hidden>
        {visible.map((p, i) => (
          <LikerAvatar key={p.toString()} principal={p} index={i} />
        ))}
        {overflow > 0 && (
          <span
            className={cn(
              "inline-flex items-center justify-center",
              "h-6 w-auto min-w-6 px-1.5 rounded-full",
              "bg-muted text-muted-foreground text-[10px] font-semibold",
              "ring-2 ring-background",
              "-ml-2",
            )}
            style={{ zIndex: 0 }}
          >
            +{overflow}
          </span>
        )}
      </span>
      {/* Subtle text cue */}
      <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors duration-150 leading-none">
        {likes.length === 1 ? "1 like" : `${likes.length} likes`}
      </span>
    </motion.button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface PostLikesCommentsProps {
  postId: bigint;
  currentUserPrincipal: string | undefined;
  /** When true, comments are always expanded (used in PostPage) */
  defaultExpanded?: boolean;
  /** 1-based index of this post in the list, for deterministic markers */
  postIndex: number;
}

export function PostLikesComments({
  postId,
  currentUserPrincipal,
  defaultExpanded = false,
  postIndex,
}: PostLikesCommentsProps) {
  const [commentsOpen, setCommentsOpen] = useState(defaultExpanded);
  const [commentText, setCommentText] = useState("");
  const [likersModalOpen, setLikersModalOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: likes = [] } = useGetLikes(postId);
  const { data: comments = [] } = useGetComments(postId);
  const likePost = useLikePost();
  const addComment = useAddComment();

  const isLiked = currentUserPrincipal
    ? likes.some((p) => p.toString() === currentUserPrincipal)
    : false;

  const handleToggleLike = useCallback(async () => {
    try {
      await likePost.mutateAsync(postId);
    } catch {
      toast.error("Failed to update like");
    }
  }, [likePost, postId]);

  const handleSubmitComment = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const text = commentText.trim();
    if (!text) return;
    try {
      setCommentText("");
      await addComment.mutateAsync({ postId, text });
    } catch {
      toast.error("Failed to post comment");
      setCommentText(text); // restore on failure
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmitComment();
    }
  };

  const postIndexStr = String(postIndex);

  return (
    <div className="px-4 pb-3 pt-0">
      <Separator className="mb-2.5 opacity-50" />

      {/* Action row: like + comment toggle */}
      <div className="flex items-center gap-1">
        {/* Like button */}
        <button
          type="button"
          onClick={handleToggleLike}
          disabled={likePost.isPending || !currentUserPrincipal}
          className={cn(
            "flex items-center gap-1.5 text-xs font-medium py-1 px-2 rounded-lg transition-all duration-200",
            "hover:bg-muted disabled:opacity-40",
            isLiked
              ? "text-rose-500"
              : "text-muted-foreground hover:text-rose-500",
          )}
          aria-label={isLiked ? "Unlike post" : "Like post"}
          aria-pressed={isLiked}
          data-ocid={`post.like_button.${postIndexStr}`}
        >
          <motion.span
            key={isLiked ? "liked" : "unliked"}
            initial={{ scale: 0.7 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 20 }}
          >
            <Heart
              className={cn(
                "h-4 w-4 transition-all",
                isLiked ? "fill-rose-500 text-rose-500" : "fill-none",
              )}
            />
          </motion.span>
          <span>{likes.length > 0 ? likes.length : ""}</span>
          {likes.length > 0 && (
            <span>{likes.length === 1 ? "like" : "likes"}</span>
          )}
          {likes.length === 0 && <span>Like</span>}
        </button>

        {/* Comment toggle */}
        <button
          type="button"
          onClick={() => setCommentsOpen((prev) => !prev)}
          className={cn(
            "flex items-center gap-1.5 text-xs font-medium py-1 px-2 rounded-lg transition-all duration-200",
            "hover:bg-muted",
            commentsOpen
              ? "text-primary"
              : "text-muted-foreground hover:text-primary",
          )}
          aria-label={commentsOpen ? "Hide comments" : "Show comments"}
          aria-expanded={commentsOpen}
          data-ocid={`post.comment_toggle.${postIndexStr}`}
        >
          <MessageCircle
            className={cn(
              "h-4 w-4 transition-all",
              commentsOpen ? "fill-primary/20 text-primary" : "fill-none",
            )}
          />
          <span>
            {comments.length > 0
              ? `${comments.length} ${comments.length === 1 ? "comment" : "comments"}`
              : "Comment"}
          </span>
        </button>
      </div>

      {/* Likers avatar stack */}
      {likes.length > 0 && (
        <LikersAvatarStack
          likes={likes}
          onOpen={() => setLikersModalOpen(true)}
        />
      )}

      {/* Likers modal */}
      <LikersModal
        open={likersModalOpen}
        onClose={() => setLikersModalOpen(false)}
        likes={likes}
      />

      {/* Collapsible comment section */}
      <AnimatePresence>
        {commentsOpen && (
          <motion.div
            key="comments-section"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            style={{ overflow: "hidden" }}
          >
            <div className="pt-2">
              {/* Comment list */}
              {comments.length > 0 && (
                <div className="space-y-0.5 mb-3 max-h-64 overflow-y-auto pr-1">
                  <AnimatePresence initial={false}>
                    {[...comments]
                      .sort((a, b) => Number(a.createdAt - b.createdAt))
                      .map((comment, idx) => (
                        <CommentItem
                          key={comment.id.toString()}
                          comment={comment}
                          postId={postId}
                          currentUserPrincipal={currentUserPrincipal}
                          commentIndex={idx + 1}
                        />
                      ))}
                  </AnimatePresence>
                </div>
              )}

              {/* Comment input */}
              {currentUserPrincipal ? (
                <form
                  onSubmit={handleSubmitComment}
                  className="flex items-center gap-2"
                >
                  <input
                    ref={inputRef}
                    type="text"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Add a comment…"
                    className={cn(
                      "flex-1 min-w-0 text-xs bg-muted/60 border border-border/60 rounded-full",
                      "px-3 py-1.5 placeholder:text-muted-foreground",
                      "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0 focus:bg-background",
                      "transition-colors duration-150",
                    )}
                    maxLength={500}
                    disabled={addComment.isPending}
                    data-ocid={`post.comment.input.${postIndexStr}`}
                  />
                  <Button
                    type="submit"
                    size="icon"
                    variant="ghost"
                    className={cn(
                      "h-7 w-7 rounded-full shrink-0 transition-all",
                      commentText.trim()
                        ? "text-primary hover:bg-primary/10"
                        : "text-muted-foreground opacity-50",
                    )}
                    disabled={!commentText.trim() || addComment.isPending}
                    aria-label="Post comment"
                    data-ocid={`post.comment.submit_button.${postIndexStr}`}
                  >
                    {addComment.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Send className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </form>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-2">
                  Sign in to comment
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
