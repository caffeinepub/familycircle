import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Principal } from "@icp-sdk/core/principal";
import { useNavigate, useParams } from "@tanstack/react-router";
import {
  ChevronDown,
  Clock,
  Edit,
  Grid3X3,
  Loader2,
  Lock,
  UserCheck,
  UserMinus,
  UserPlus,
  UserX,
} from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import type { Post } from "../backend";
import { Navbar } from "../components/Navbar";
import { PostCard } from "../components/PostCard";
import { UserAvatar } from "../components/UserAvatar";
import { useActor } from "../hooks/useActor";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useAcceptFriendRequest,
  useDeclineFriendRequest,
  useGetAcceptedFriends,
  useGetCallerUserProfile,
  useGetPendingFriendRequests,
  useGetPrincipalByUsername,
  useGetProfileByUsername,
  useGetProfilePosts,
  useGetSentFriendRequests,
  useGetUserProfile,
  useRemoveFriend,
  useSendFriendRequest,
} from "../hooks/useQueries";

const PAGE_SIZE = 10;

// ------ ProfilePost item ------

function ProfilePost({
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

// ------ Posts list for a known principal ------

function PostsList({
  principal,
  currentUserPrincipal,
}: {
  principal: Principal;
  currentUserPrincipal: string | undefined;
}) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const { data: posts, isLoading } = useGetProfilePosts(principal);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {["sk-a", "sk-b"].map((key) => (
          <Skeleton key={key} className="h-64 w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  if (!posts || posts.length === 0) {
    return (
      <div data-ocid="profile.posts.empty_state" className="text-center py-12">
        <Grid3X3 className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">No posts yet</p>
      </div>
    );
  }

  const sorted = posts
    .slice()
    .sort((a, b) => Number(b.createdAt - a.createdAt));
  const visible = sorted.slice(0, visibleCount);
  const remaining = sorted.length - visibleCount;

  return (
    <>
      <div data-ocid="profile.posts.list" className="space-y-4">
        {visible.map((post, i) => (
          <ProfilePost
            key={post.id.toString()}
            post={post}
            currentUserPrincipal={currentUserPrincipal}
            index={i}
          />
        ))}
      </div>
      {remaining > 0 && (
        <div className="flex justify-center mt-6">
          <Button
            data-ocid="profile.load_more_button"
            variant="outline"
            onClick={() => setVisibleCount((v) => v + PAGE_SIZE)}
            className="gap-2 px-6"
          >
            <ChevronDown className="h-4 w-4" />
            Load more
            <span className="text-muted-foreground text-xs">
              ({remaining} remaining)
            </span>
          </Button>
        </div>
      )}
    </>
  );
}

// ------ Friend action buttons ------

function FriendActions({
  username,
  friends,
  pendingRequests,
}: {
  username: string;
  friends: Principal[] | undefined;
  pendingRequests: Principal[] | undefined;
}) {
  const sendFriend = useSendFriendRequest();
  const acceptFriend = useAcceptFriendRequest();
  const declineFriend = useDeclineFriendRequest();
  const [localSent, setLocalSent] = useState(false);

  // Resolve principal via backend lookup
  const { data: targetPrincipal } = useGetPrincipalByUsername(username);

  // Fetch sent requests to check if we already sent a request to this user
  const { data: sentRequests } = useGetSentFriendRequests();

  const isFriend =
    targetPrincipal && friends
      ? friends.some((f) => f.toString() === targetPrincipal.toString())
      : false;

  // Received request from this user (they sent us a request)
  const isPendingRequest =
    targetPrincipal && pendingRequests
      ? pendingRequests.some((f) => f.toString() === targetPrincipal.toString())
      : false;

  // We already sent a request to this user (authoritative backend check)
  const isSentRequest =
    targetPrincipal && sentRequests
      ? sentRequests.some((f) => f.toString() === targetPrincipal.toString())
      : false;

  const removeFriend = useRemoveFriend();

  if (isFriend) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 text-sm text-green-700 font-semibold py-1.5 px-3 bg-green-50 rounded-full border border-green-200">
          <UserCheck className="h-4 w-4" />
          Friends
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-destructive border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
              data-ocid="profile.unfriend_button"
            >
              <UserMinus className="h-3.5 w-3.5" />
              Unfriend
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent data-ocid="profile.unfriend_dialog">
            <AlertDialogHeader>
              <AlertDialogTitle>Unfriend @{username}?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to unfriend @{username}? They will no
                longer be able to see your posts.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel data-ocid="profile.unfriend_cancel_button">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                data-ocid="profile.unfriend_confirm_button"
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={async () => {
                  if (!targetPrincipal) return;
                  try {
                    await removeFriend.mutateAsync(targetPrincipal);
                    toast.success(`Unfriended @${username}`);
                  } catch {
                    toast.error("Failed to unfriend. Please try again.");
                  }
                }}
                disabled={removeFriend.isPending}
              >
                {removeFriend.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                ) : null}
                Unfriend
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  if (isPendingRequest) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm text-muted-foreground flex items-center gap-1.5">
          <Clock className="h-4 w-4" />
          Sent you a request
        </span>
        <Button
          size="sm"
          onClick={async () => {
            if (!targetPrincipal) return;
            try {
              await acceptFriend.mutateAsync(targetPrincipal);
              toast.success("Friend request accepted!");
            } catch {
              toast.error("Failed to accept request");
            }
          }}
          disabled={acceptFriend.isPending}
          className="gap-1.5"
        >
          {acceptFriend.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <UserCheck className="h-3.5 w-3.5" />
          )}
          Accept
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={async () => {
            if (!targetPrincipal) return;
            try {
              await declineFriend.mutateAsync(targetPrincipal);
              toast.success("Friend request declined");
            } catch {
              toast.error("Failed to decline request");
            }
          }}
          className="gap-1.5"
        >
          <UserX className="h-3.5 w-3.5" />
          Decline
        </Button>
      </div>
    );
  }

  // Authoritative: we already sent a request (from backend), or local optimistic state
  if (isSentRequest || localSent) {
    return (
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground py-1.5 px-3 bg-muted rounded-full border border-border">
        <Clock className="h-4 w-4" />
        Request Sent
      </div>
    );
  }

  if (!targetPrincipal) {
    return (
      <p className="text-xs text-muted-foreground italic">
        Interact to send a friend request
      </p>
    );
  }

  return (
    <Button
      size="sm"
      onClick={async () => {
        try {
          await sendFriend.mutateAsync(targetPrincipal);
          toast.success("Friend request sent!");
          setLocalSent(true);
        } catch {
          toast.error("Failed to send friend request");
        }
      }}
      disabled={sendFriend.isPending}
      className="gap-1.5"
    >
      {sendFriend.isPending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <UserPlus className="h-3.5 w-3.5" />
      )}
      Send Friend Request
    </Button>
  );
}

// ------ Profile skeleton ------

function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-start gap-5">
        <Skeleton className="h-20 w-20 rounded-full" />
        <div className="flex-1 space-y-2 pt-2">
          <Skeleton className="h-6 w-36" />
          <Skeleton className="h-4 w-52" />
          <Skeleton className="h-8 w-32 mt-2" />
        </div>
      </div>
    </div>
  );
}

// ------ Main ProfilePage ------

export function ProfilePage() {
  const params = useParams({ strict: false }) as { username?: string };
  const username = params.username ?? "";
  const navigate = useNavigate();
  const { identity } = useInternetIdentity();

  const { isFetching: actorFetching } = useActor();
  const { data: targetProfile, isLoading: profileQueryLoading } =
    useGetProfileByUsername(username);
  // Show skeleton while the actor is still initialising OR while the profile query runs.
  // If the actor has errored (null + not fetching), fall through to "User not found".
  const profileLoading = actorFetching || profileQueryLoading;

  const { data: currentProfile } = useGetCallerUserProfile();
  const { data: friends } = useGetAcceptedFriends();
  const { data: pendingRequests } = useGetPendingFriendRequests();

  const currentUserPrincipal = identity?.getPrincipal().toString();
  const isSelf = currentProfile?.username === username;

  const { data: targetPrincipal } = useGetPrincipalByUsername(
    !isSelf ? username : undefined,
  );

  const isFriendWithTarget =
    isSelf ||
    (targetPrincipal && friends
      ? friends.some((f) => f.toString() === targetPrincipal.toString())
      : false);

  // Self: use identity principal for posts
  const selfPrincipal = isSelf ? identity?.getPrincipal() : null;
  const postsOwnerPrincipal = isSelf ? selfPrincipal : targetPrincipal;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="max-w-2xl mx-auto px-4 py-6">
        {profileLoading ? (
          <ProfileSkeleton />
        ) : !targetProfile ? (
          <div className="text-center py-16">
            <p className="font-display text-lg font-semibold text-foreground mb-2">
              User not found
            </p>
            <p className="text-muted-foreground text-sm">
              This username doesn't exist or may have changed.
            </p>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            {/* Profile header */}
            <div className="mb-8 rounded-2xl overflow-hidden border border-border/50 shadow-card bg-card card-grain">
              {/* Cover photo / gradient band */}
              {targetProfile.coverPhoto ? (
                <div className="h-36 w-full overflow-hidden">
                  <img
                    src={targetProfile.coverPhoto.getDirectURL()}
                    alt="Cover banner"
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div
                  className="h-36 w-full"
                  style={{
                    background:
                      "linear-gradient(135deg, oklch(0.88 0.06 75) 0%, oklch(0.93 0.04 55) 50%, oklch(0.85 0.08 42) 100%)",
                  }}
                  aria-hidden="true"
                />
              )}
              <div className="px-5 pb-5">
                {/* Avatar overlapping the cover */}
                <div className="flex items-end gap-4 -mt-10 mb-3">
                  <div className="ring-4 ring-card rounded-full">
                    <UserAvatar profile={targetProfile} size="xl" />
                  </div>
                  <div className="mb-1 ml-auto">
                    {isSelf ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate({ to: "/profile/edit" })}
                        className="gap-2"
                      >
                        <Edit className="h-3.5 w-3.5" />
                        Edit Profile
                      </Button>
                    ) : (
                      <FriendActions
                        username={username}
                        friends={friends}
                        pendingRequests={pendingRequests}
                      />
                    )}
                  </div>
                </div>
                <h1 className="font-display font-bold text-xl text-foreground">
                  @{targetProfile.username}
                </h1>
                {targetProfile.bio && (
                  <p className="text-muted-foreground text-sm mt-1 leading-relaxed max-w-sm">
                    {targetProfile.bio}
                  </p>
                )}
              </div>
            </div>

            {/* Posts */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Grid3X3 className="h-4 w-4 text-muted-foreground" />
                <h2 className="font-display font-semibold text-xs uppercase tracking-widest text-muted-foreground">
                  Posts
                </h2>
              </div>

              {postsOwnerPrincipal ? (
                isFriendWithTarget ? (
                  <PostsList
                    principal={postsOwnerPrincipal}
                    currentUserPrincipal={currentUserPrincipal}
                  />
                ) : (
                  <div className="text-center py-12 px-4 bg-card rounded-2xl border border-border/50">
                    <Lock className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground font-medium">
                      Posts are private
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      You need to be friends to see their posts.
                    </p>
                  </div>
                )
              ) : (
                <div className="text-center py-12 px-4 bg-card rounded-2xl border border-border/50">
                  <Lock className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">
                    Add this person as a friend to see their posts.
                  </p>
                </div>
              )}
            </div>
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
