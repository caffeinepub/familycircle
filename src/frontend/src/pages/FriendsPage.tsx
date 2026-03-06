import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import type { Principal } from "@icp-sdk/core/principal";
import { Link } from "@tanstack/react-router";
import {
  CheckCircle2,
  Clock,
  Loader2,
  Search,
  UserCheck,
  UserPlus,
  UserX,
  Users,
} from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import type { UserProfile } from "../backend";
import { Navbar } from "../components/Navbar";
import { UserAvatar } from "../components/UserAvatar";
import { useDebounce } from "../hooks/useDebounce";
import {
  useAcceptFriendRequest,
  useDeclineFriendRequest,
  useGetAcceptedFriends,
  useGetPendingFriendRequests,
  useGetPrincipalByUsername,
  useGetProfileByUsername,
  useGetSentFriendRequests,
  useGetUserProfile,
  useSendFriendRequest,
} from "../hooks/useQueries";

const PENDING_SKELETON_KEYS = ["ps-0", "ps-1"];
const FRIENDS_SKELETON_KEYS = ["fs-0", "fs-1", "fs-2"];

// ------ Individual pending request row ------

function PendingRequestRow({ principal }: { principal: Principal }) {
  const { data: profile, isLoading } = useGetUserProfile(principal);
  const acceptFriend = useAcceptFriendRequest();
  const declineFriend = useDeclineFriendRequest();

  if (isLoading) {
    return (
      <div className="flex items-center gap-3 py-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-3 w-40" />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center gap-3 py-3"
    >
      <UserAvatar profile={profile} size="md" />
      <div className="flex-1 min-w-0">
        {profile ? (
          <Link
            to="/profile/$username"
            params={{ username: profile.username }}
            className="font-display font-semibold text-sm text-foreground hover:text-primary transition-colors"
          >
            @{profile.username}
          </Link>
        ) : (
          <p className="text-sm text-muted-foreground text-xs font-mono">
            {principal.toString().slice(0, 12)}...
          </p>
        )}
        {profile?.bio && (
          <p className="text-xs text-muted-foreground truncate">
            {profile.bio}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <Button
          size="sm"
          onClick={async () => {
            try {
              await acceptFriend.mutateAsync(principal);
              toast.success(
                `Now friends with @${profile?.username ?? "user"}!`,
              );
            } catch {
              toast.error("Failed to accept request");
            }
          }}
          disabled={acceptFriend.isPending}
          className="gap-1.5 h-8"
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
            try {
              await declineFriend.mutateAsync(principal);
              toast.success("Request declined");
            } catch {
              toast.error("Failed to decline");
            }
          }}
          disabled={declineFriend.isPending}
          className="h-8 gap-1.5"
        >
          <UserX className="h-3.5 w-3.5" />
          Decline
        </Button>
      </div>
    </motion.div>
  );
}

// ------ Individual friend row ------

function FriendRow({ principal }: { principal: Principal }) {
  const { data: profile, isLoading } = useGetUserProfile(principal);

  if (isLoading) {
    return (
      <div className="flex items-center gap-3 py-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-36" />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center gap-3 py-3"
    >
      <UserAvatar profile={profile} size="md" />
      <div className="flex-1 min-w-0">
        {profile ? (
          <Link
            to="/profile/$username"
            params={{ username: profile.username }}
            className="font-display font-semibold text-sm text-foreground hover:text-primary transition-colors"
          >
            @{profile.username}
          </Link>
        ) : (
          <p className="text-xs text-muted-foreground font-mono">
            {principal.toString().slice(0, 12)}...
          </p>
        )}
        {profile?.bio && (
          <p className="text-xs text-muted-foreground truncate">
            {profile.bio}
          </p>
        )}
      </div>
      {profile?.username && (
        <Button size="sm" variant="ghost" asChild className="h-8 text-xs">
          <Link to="/profile/$username" params={{ username: profile.username }}>
            View
          </Link>
        </Button>
      )}
    </motion.div>
  );
}

// ------ Individual sent request row ------

function SentRequestRow({ principal }: { principal: Principal }) {
  const { data: profile, isLoading } = useGetUserProfile(principal);

  if (isLoading) {
    return (
      <div className="flex items-center gap-3 py-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-3 w-40" />
        </div>
        <Skeleton className="h-6 w-24 rounded-full" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center gap-3 py-3"
    >
      <UserAvatar profile={profile} size="md" />
      <div className="flex-1 min-w-0">
        {profile ? (
          <Link
            to="/profile/$username"
            params={{ username: profile.username }}
            className="font-display font-semibold text-sm text-foreground hover:text-primary transition-colors"
          >
            @{profile.username}
          </Link>
        ) : (
          <p className="text-xs text-muted-foreground font-mono">
            {principal.toString().slice(0, 12)}...
          </p>
        )}
        {profile?.bio && (
          <p className="text-xs text-muted-foreground truncate">
            {profile.bio}
          </p>
        )}
      </div>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground py-1 px-2.5 bg-muted rounded-full border border-border/50 flex-shrink-0">
        <Clock className="h-3 w-3" />
        Waiting for response
      </div>
    </motion.div>
  );
}

// ------ Search result add friend button ------

function AddFriendButton({
  profile,
  onSent,
}: {
  profile: UserProfile;
  onSent: () => void;
}) {
  const sendFriend = useSendFriendRequest();
  const { data: targetPrincipal, isLoading: principalLoading } =
    useGetPrincipalByUsername(profile.username);

  const handleSend = async () => {
    if (!targetPrincipal) {
      toast.error("Could not resolve user. Please try again.");
      return;
    }
    try {
      await sendFriend.mutateAsync(targetPrincipal);
      toast.success(`Friend request sent to @${profile.username}!`);
      onSent();
    } catch {
      toast.error(
        "Failed to send friend request. You may already have a pending request.",
      );
    }
  };

  return (
    <Button
      size="sm"
      onClick={handleSend}
      disabled={sendFriend.isPending || principalLoading || !targetPrincipal}
      className="gap-1.5 h-8"
    >
      {sendFriend.isPending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <UserPlus className="h-3.5 w-3.5" />
      )}
      Add Friend
    </Button>
  );
}

// ------ Find friends search ------

function FindFriends() {
  const [query, setQuery] = useState("");
  const [sentTo, setSentTo] = useState<Set<string>>(new Set());
  const debouncedQuery = useDebounce(query, 400);

  const { data: foundProfile, isLoading: searching } = useGetProfileByUsername(
    debouncedQuery.length >= 2 ? debouncedQuery : undefined,
  );

  const hasSentRequest = foundProfile && sentTo.has(foundProfile.username);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by username..."
          className="pl-9"
        />
      </div>

      {debouncedQuery.length >= 2 && (
        <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
          {searching ? (
            <div className="flex items-center gap-3 p-4">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-40" />
              </div>
            </div>
          ) : foundProfile ? (
            <div className="flex items-center gap-3 p-4">
              <UserAvatar profile={foundProfile} size="md" />
              <div className="flex-1 min-w-0">
                <Link
                  to="/profile/$username"
                  params={{ username: foundProfile.username }}
                  className="font-display font-semibold text-sm text-foreground hover:text-primary transition-colors"
                >
                  @{foundProfile.username}
                </Link>
                {foundProfile.bio && (
                  <p className="text-xs text-muted-foreground truncate">
                    {foundProfile.bio}
                  </p>
                )}
              </div>
              {hasSentRequest ? (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                  Sent
                </div>
              ) : (
                <AddFriendButton
                  profile={foundProfile}
                  onSent={() =>
                    setSentTo(
                      (prev) => new Set([...prev, foundProfile.username]),
                    )
                  }
                />
              )}
            </div>
          ) : (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No user found with username "{debouncedQuery}"
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ------ Main FriendsPage ------

export function FriendsPage() {
  const { data: pendingRequests, isLoading: pendingLoading } =
    useGetPendingFriendRequests();
  const { data: sentRequests, isLoading: sentLoading } =
    useGetSentFriendRequests();
  const { data: friends, isLoading: friendsLoading } = useGetAcceptedFriends();

  const pendingCount = pendingRequests?.length ?? 0;
  const sentCount = sentRequests?.length ?? 0;
  const friendsCount = friends?.length ?? 0;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="max-w-2xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="font-display font-bold text-2xl text-foreground">
            Friends
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage your circle
          </p>
        </div>

        <div className="space-y-6">
          {/* Find Friends */}
          <section>
            <h2 className="font-display font-semibold text-base text-foreground mb-3 flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              Find Friends
            </h2>
            <FindFriends />
          </section>

          <Separator />

          {/* Sent Requests */}
          <section>
            <h2 className="font-display font-semibold text-base text-foreground mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Sent Requests
              {sentCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {sentCount}
                </Badge>
              )}
            </h2>

            {sentLoading ? (
              <div className="space-y-1">
                {PENDING_SKELETON_KEYS.map((key) => (
                  <div key={key} className="flex items-center gap-3 py-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-3 w-36" />
                    </div>
                    <Skeleton className="h-6 w-28 rounded-full" />
                  </div>
                ))}
              </div>
            ) : sentRequests && sentRequests.length > 0 ? (
              <div className="divide-y divide-border/40">
                {sentRequests.map((p) => (
                  <SentRequestRow key={p.toString()} principal={p} />
                ))}
              </div>
            ) : (
              <div className="py-6 text-center">
                <p className="text-sm text-muted-foreground">
                  No outgoing friend requests
                </p>
              </div>
            )}
          </section>

          <Separator />

          {/* Pending Requests */}
          <section>
            <h2 className="font-display font-semibold text-base text-foreground mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Pending Requests
              {pendingCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {pendingCount}
                </Badge>
              )}
            </h2>

            {pendingLoading ? (
              <div className="space-y-1">
                {PENDING_SKELETON_KEYS.map((key) => (
                  <div key={key} className="flex items-center gap-3 py-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-3 w-36" />
                    </div>
                    <Skeleton className="h-8 w-20" />
                  </div>
                ))}
              </div>
            ) : pendingRequests && pendingRequests.length > 0 ? (
              <div className="divide-y divide-border/40">
                {pendingRequests.map((p) => (
                  <PendingRequestRow key={p.toString()} principal={p} />
                ))}
              </div>
            ) : (
              <div className="py-6 text-center">
                <p className="text-sm text-muted-foreground">
                  No pending friend requests
                </p>
              </div>
            )}
          </section>

          <Separator />

          {/* Your Friends */}
          <section>
            <h2 className="font-display font-semibold text-base text-foreground mb-3 flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              Your Friends
              {friendsCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {friendsCount}
                </Badge>
              )}
            </h2>

            {friendsLoading ? (
              <div className="space-y-1">
                {FRIENDS_SKELETON_KEYS.map((key) => (
                  <div key={key} className="flex items-center gap-3 py-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-40" />
                    </div>
                  </div>
                ))}
              </div>
            ) : friends && friends.length > 0 ? (
              <div className="divide-y divide-border/40">
                {friends.map((p) => (
                  <FriendRow key={p.toString()} principal={p} />
                ))}
              </div>
            ) : (
              <div className="py-6 text-center">
                <Users className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No friends yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Search for people to add them to your circle
                </p>
              </div>
            )}
          </section>
        </div>
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
