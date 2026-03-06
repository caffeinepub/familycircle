import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";
import {
  Check,
  Edit2,
  MoreHorizontal,
  Play,
  Share2,
  Trash2,
  X,
} from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import type { Post, UserProfile } from "../backend";
import { MediaType } from "../backend";
import { useDeletePost, useEditPost } from "../hooks/useQueries";
import { formatRelativeTime } from "../utils/time";
import { PostLikesComments } from "./PostLikesComments";
import { UserAvatar } from "./UserAvatar";

interface PostCardProps {
  post: Post;
  authorProfile: UserProfile | null | undefined;
  isOwner: boolean;
  index?: number;
  currentUserPrincipal?: string;
  /** When true, comments are always expanded (PostPage single-post view) */
  defaultCommentsExpanded?: boolean;
}

export function PostCard({
  post,
  authorProfile,
  isOwner,
  index = 0,
  currentUserPrincipal,
  defaultCommentsExpanded = false,
}: PostCardProps) {
  const [editing, setEditing] = useState(false);
  const [editCaption, setEditCaption] = useState(post.caption);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const editPost = useEditPost();
  const deletePost = useDeletePost();

  const mediaUrl = post.media.getDirectURL();

  const handleShare = async () => {
    const url = `${window.location.origin}/post/${post.id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard!");
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const handleSaveEdit = async () => {
    if (!editCaption.trim()) return;
    try {
      await editPost.mutateAsync({ id: post.id, caption: editCaption.trim() });
      toast.success("Post updated");
      setEditing(false);
    } catch {
      toast.error("Failed to update post");
    }
  };

  const handleCancelEdit = () => {
    setEditCaption(post.caption);
    setEditing(false);
  };

  const handleDelete = async () => {
    try {
      await deletePost.mutateAsync(post.id);
      toast.success("Post deleted");
    } catch {
      toast.error("Failed to delete post");
    }
    setShowDeleteDialog(false);
  };

  return (
    <>
      <motion.article
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: index * 0.06, ease: "easeOut" }}
        className={cn(
          "bg-card rounded-2xl overflow-hidden shadow-card border border-border/50 card-grain",
        )}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3">
          <Link
            to="/profile/$username"
            params={{ username: authorProfile?.username ?? "" }}
            className="flex items-center gap-3 flex-1 min-w-0 group"
          >
            <UserAvatar profile={authorProfile} size="sm" />
            <div className="min-w-0">
              <p className="font-display font-semibold text-sm text-foreground group-hover:text-primary transition-colors truncate">
                {authorProfile?.username ?? "Unknown"}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatRelativeTime(post.createdAt)}
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={handleShare}
              title="Share post"
            >
              <Share2 className="h-4 w-4" />
            </Button>

            {isOwner && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-36">
                  <DropdownMenuItem onClick={() => setEditing(true)}>
                    <Edit2 className="mr-2 h-4 w-4" />
                    Edit caption
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setShowDeleteDialog(true)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {/* Media */}
        {post.mediaType === MediaType.video ? (
          <div className="media-container w-full bg-black">
            {/* biome-ignore lint/a11y/useMediaCaption: user-uploaded content, captions not available */}
            <video
              src={mediaUrl}
              controls
              className="w-full max-h-[540px] object-contain"
              playsInline
            />
          </div>
        ) : (
          <div
            className="media-container w-full bg-muted"
            style={{ aspectRatio: "4/5" }}
          >
            <img
              src={mediaUrl}
              alt={post.caption || "Post image"}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
        )}

        {/* Caption */}
        <div className="px-4 py-3">
          {editing ? (
            <div className="space-y-2">
              <Textarea
                value={editCaption}
                onChange={(e) => setEditCaption(e.target.value)}
                className="min-h-[80px] text-sm resize-none"
                placeholder="Write a caption..."
                autoFocus
              />
              <div className="flex gap-2 justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCancelEdit}
                  disabled={editPost.isPending}
                >
                  <X className="mr-1 h-3 w-3" />
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveEdit}
                  disabled={editPost.isPending || !editCaption.trim()}
                >
                  {editPost.isPending ? (
                    <span className="animate-pulse-dot mr-1">•••</span>
                  ) : (
                    <Check className="mr-1 h-3 w-3" />
                  )}
                  Save
                </Button>
              </div>
            </div>
          ) : (
            post.caption && (
              <p className="text-sm text-foreground leading-relaxed">
                {post.caption}
              </p>
            )
          )}
        </div>

        {/* Likes and Comments */}
        <PostLikesComments
          postId={post.id}
          currentUserPrincipal={currentUserPrincipal}
          defaultExpanded={defaultCommentsExpanded}
          postIndex={index + 1}
        />
      </motion.article>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this post?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Your post will be permanently
              removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
