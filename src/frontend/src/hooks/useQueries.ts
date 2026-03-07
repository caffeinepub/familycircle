import type { Principal } from "@icp-sdk/core/principal";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Comment, Notification, Post, UserProfile } from "../backend";
import { MediaType } from "../backend";
import type { ExternalBlob } from "../backend";
import { useActor } from "./useActor";

// Re-export for convenience
export { MediaType };
export type { Comment };

// ─── Profile Queries ────────────────────────────────────────────────────────

export function useGetCallerUserProfile() {
  const { actor, isFetching: actorFetching } = useActor();

  const query = useQuery<UserProfile | null>({
    queryKey: ["currentUserProfile"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.getCallerUserProfile();
    },
    enabled: !!actor && !actorFetching,
    retry: false,
  });

  return {
    ...query,
    isLoading: actorFetching || query.isLoading,
    isFetched: !!actor && query.isFetched,
  };
}

export function useGetUserProfile(user: Principal | undefined) {
  const { actor, isFetching: actorFetching } = useActor();
  return useQuery<UserProfile | null>({
    queryKey: ["userProfile", user?.toString()],
    queryFn: async () => {
      if (!actor || !user) return null;
      return actor.getUserProfile(user);
    },
    enabled: !!actor && !actorFetching && !!user,
  });
}

export function useGetProfileByUsername(username: string | undefined) {
  const { actor, isFetching: actorFetching } = useActor();
  return useQuery<UserProfile | null>({
    queryKey: ["profileByUsername", username],
    queryFn: async () => {
      if (!actor || !username) return null;
      return actor.getProfileByUsername(username);
    },
    enabled: !!actor && !actorFetching && !!username,
  });
}

export function useGetPrincipalByUsername(username: string | undefined) {
  const { actor, isFetching: actorFetching } = useActor();
  return useQuery<Principal | null>({
    queryKey: ["principalByUsername", username],
    queryFn: async () => {
      if (!actor || !username) return null;
      return actor.getPrincipalByUsername(username);
    },
    enabled: !!actor && !actorFetching && !!username,
    staleTime: 60_000,
  });
}

export function useIsUsernameAvailable(username: string) {
  const { actor, isFetching: actorFetching } = useActor();
  return useQuery<boolean>({
    queryKey: ["usernameAvailable", username],
    queryFn: async () => {
      if (!actor || !username) return false;
      return actor.isUsernameAvailable(username);
    },
    enabled: !!actor && !actorFetching && username.length >= 3,
    staleTime: 10_000,
  });
}

// ─── Post Queries ────────────────────────────────────────────────────────────

export function useGetMainFeed() {
  const { actor, isFetching: actorFetching } = useActor();
  return useQuery<Post[]>({
    queryKey: ["mainFeed"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getMainFeed();
    },
    enabled: !!actor && !actorFetching,
  });
}

export function useGetProfilePosts(user: Principal | undefined) {
  const { actor, isFetching: actorFetching } = useActor();
  return useQuery<Post[]>({
    queryKey: ["profilePosts", user?.toString()],
    queryFn: async () => {
      if (!actor || !user) return [];
      return actor.getProfilePosts(user);
    },
    enabled: !!actor && !actorFetching && !!user,
  });
}

export function useGetPostById(id: bigint | undefined) {
  const { actor, isFetching: actorFetching } = useActor();
  return useQuery<Post | null>({
    queryKey: ["post", id?.toString()],
    queryFn: async () => {
      if (!actor || id === undefined) return null;
      return actor.getPostById(id);
    },
    enabled: !!actor && !actorFetching && id !== undefined,
  });
}

// ─── Likes & Comments Queries ────────────────────────────────────────────────

export function useGetLikes(postId: bigint | undefined) {
  const { actor, isFetching: actorFetching } = useActor();
  return useQuery<Principal[]>({
    queryKey: ["likes", postId?.toString()],
    queryFn: async () => {
      if (!actor || postId === undefined) return [];
      return actor.getLikes(postId);
    },
    enabled: !!actor && !actorFetching && postId !== undefined,
    staleTime: 15_000,
  });
}

export function useGetComments(postId: bigint | undefined) {
  const { actor, isFetching: actorFetching } = useActor();
  return useQuery<Comment[]>({
    queryKey: ["comments", postId?.toString()],
    queryFn: async () => {
      if (!actor || postId === undefined) return [];
      return actor.getComments(postId);
    },
    enabled: !!actor && !actorFetching && postId !== undefined,
    staleTime: 15_000,
  });
}

export function useLikePost() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (postId: bigint) => {
      if (!actor) throw new Error("Not authenticated");
      await actor.likePost(postId);
    },
    onSuccess: (_data, postId) => {
      queryClient.invalidateQueries({ queryKey: ["likes", postId.toString()] });
    },
  });
}

export function useAddComment() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ postId, text }: { postId: bigint; text: string }) => {
      if (!actor) throw new Error("Not authenticated");
      return actor.addComment(postId, text);
    },
    onSuccess: (_data, { postId }) => {
      queryClient.invalidateQueries({
        queryKey: ["comments", postId.toString()],
      });
    },
  });
}

export function useDeleteComment() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      postId,
      commentId,
    }: {
      postId: bigint;
      commentId: bigint;
    }) => {
      if (!actor) throw new Error("Not authenticated");
      await actor.deleteComment(postId, commentId);
    },
    onSuccess: (_data, { postId }) => {
      queryClient.invalidateQueries({
        queryKey: ["comments", postId.toString()],
      });
    },
  });
}

// ─── Friends Queries ─────────────────────────────────────────────────────────

export function useGetAcceptedFriends() {
  const { actor, isFetching: actorFetching } = useActor();
  return useQuery<Principal[]>({
    queryKey: ["acceptedFriends"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAcceptedFriends();
    },
    enabled: !!actor && !actorFetching,
  });
}

export function useGetPendingFriendRequests() {
  const { actor, isFetching: actorFetching } = useActor();
  return useQuery<Principal[]>({
    queryKey: ["pendingFriendRequests"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getPendingFriendRequests();
    },
    enabled: !!actor && !actorFetching,
  });
}

export function useGetSentFriendRequests() {
  const { actor, isFetching: actorFetching } = useActor();
  return useQuery<Principal[]>({
    queryKey: ["sentFriendRequests"],
    queryFn: async () => {
      if (!actor) return [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (actor as any).getSentFriendRequests() as Promise<Principal[]>;
    },
    enabled: !!actor && !actorFetching,
  });
}

// ─── Notifications Queries ────────────────────────────────────────────────────

export function useGetNotifications() {
  const { actor, isFetching: actorFetching } = useActor();
  return useQuery<Notification[]>({
    queryKey: ["notifications"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getNotifications();
    },
    enabled: !!actor && !actorFetching,
    refetchInterval: 30_000,
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useRegister() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      username,
      bio,
    }: {
      username: string;
      bio: string;
    }) => {
      if (!actor) throw new Error("Not authenticated");
      await actor.register(username, bio);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["currentUserProfile"] });
    },
  });
}

export function useUpdateBio() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (bio: string) => {
      if (!actor) throw new Error("Not authenticated");
      await actor.updateBio(bio);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["currentUserProfile"] });
    },
  });
}

export function useUpdateProfilePhoto() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (photo: ExternalBlob | null) => {
      if (!actor) throw new Error("Not authenticated");
      await actor.updateProfilePhoto(photo);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["currentUserProfile"] });
    },
  });
}

export function useCreatePost() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      caption,
      media,
      mediaType,
    }: {
      caption: string;
      media: ExternalBlob;
      mediaType: MediaType;
    }) => {
      if (!actor) throw new Error("Not authenticated");
      return actor.createPost(caption, media, mediaType);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mainFeed"] });
      queryClient.invalidateQueries({ queryKey: ["profilePosts"] });
    },
  });
}

export function useEditPost() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      caption,
    }: {
      id: bigint;
      caption: string;
    }) => {
      if (!actor) throw new Error("Not authenticated");
      await actor.editPost(id, caption);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mainFeed"] });
      queryClient.invalidateQueries({ queryKey: ["profilePosts"] });
      queryClient.invalidateQueries({ queryKey: ["post"] });
    },
  });
}

export function useDeletePost() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("Not authenticated");
      await actor.deletePost(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mainFeed"] });
      queryClient.invalidateQueries({ queryKey: ["profilePosts"] });
    },
  });
}

export function useSendFriendRequest() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (friend: Principal) => {
      if (!actor) throw new Error("Not authenticated");
      await actor.sendFriendRequest(friend);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["acceptedFriends"] });
      queryClient.invalidateQueries({ queryKey: ["pendingFriendRequests"] });
      queryClient.invalidateQueries({ queryKey: ["sentFriendRequests"] });
    },
  });
}

export function useAcceptFriendRequest() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (friend: Principal) => {
      if (!actor) throw new Error("Not authenticated");
      await actor.acceptFriendRequest(friend);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["acceptedFriends"] });
      queryClient.invalidateQueries({ queryKey: ["pendingFriendRequests"] });
    },
  });
}

export function useDeclineFriendRequest() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (friend: Principal) => {
      if (!actor) throw new Error("Not authenticated");
      await actor.declineFriendRequest(friend);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pendingFriendRequests"] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("Not authenticated");
      await actor.markAllNotificationsAsRead();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useRemoveFriend() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (friend: Principal) => {
      if (!actor) throw new Error("Not authenticated");
      await actor.removeFriend(friend);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["acceptedFriends"] });
      queryClient.invalidateQueries({ queryKey: ["pendingFriendRequests"] });
      queryClient.invalidateQueries({ queryKey: ["sentFriendRequests"] });
      queryClient.invalidateQueries({ queryKey: ["mainFeed"] });
    },
  });
}

export function useUpdateCoverPhoto() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (photo: ExternalBlob | null) => {
      if (!actor) throw new Error("Not authenticated");
      await actor.updateCoverPhoto(photo);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["currentUserProfile"] });
    },
  });
}
