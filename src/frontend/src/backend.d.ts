import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export class ExternalBlob {
    getBytes(): Promise<Uint8Array<ArrayBuffer>>;
    getDirectURL(): string;
    static fromURL(url: string): ExternalBlob;
    static fromBytes(blob: Uint8Array<ArrayBuffer>): ExternalBlob;
    withUploadProgress(onProgress: (percentage: number) => void): ExternalBlob;
}
export interface Comment {
    id: bigint;
    createdAt: bigint;
    text: string;
    author: Principal;
    postId: bigint;
}
export interface Post {
    id: bigint;
    media: ExternalBlob;
    owner: Principal;
    createdAt: bigint;
    updatedAt: bigint;
    caption: string;
    mediaType: MediaType;
}
export interface Notification {
    id: bigint;
    notificationType: NotificationType;
    createdAt: bigint;
    read: boolean;
    user: Principal;
    relatedUser?: Principal;
    postId?: bigint;
}
export interface UserProfile {
    bio: string;
    username: string;
    createdAt: bigint;
    profilePhoto?: ExternalBlob;
    coverPhoto?: ExternalBlob;
}
export enum MediaType {
    video = "video",
    photo = "photo"
}
export enum NotificationType {
    newPostFromFriend = "newPostFromFriend",
    friendRequestAccepted = "friendRequestAccepted",
    friendRequestReceived = "friendRequestReceived"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    acceptFriendRequest(friend: Principal): Promise<void>;
    addComment(postId: bigint, text: string): Promise<bigint>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    createPost(caption: string, media: ExternalBlob, mediaType: MediaType): Promise<bigint>;
    declineFriendRequest(friend: Principal): Promise<void>;
    deleteComment(postId: bigint, commentId: bigint): Promise<void>;
    deletePost(id: bigint): Promise<void>;
    editPost(id: bigint, newCaption: string): Promise<void>;
    getAcceptedFriends(): Promise<Array<Principal>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getComments(postId: bigint): Promise<Array<Comment>>;
    getLikes(postId: bigint): Promise<Array<Principal>>;
    getMainFeed(): Promise<Array<Post>>;
    getNotifications(): Promise<Array<Notification>>;
    getPendingFriendRequests(): Promise<Array<Principal>>;
    getPostById(id: bigint): Promise<Post>;
    getPrincipalByUsername(username: string): Promise<Principal | null>;
    getProfileByUsername(username: string): Promise<UserProfile | null>;
    getProfilePosts(user: Principal): Promise<Array<Post>>;
    getSentFriendRequests(): Promise<Array<Principal>>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    isCallerAdmin(): Promise<boolean>;
    isUsernameAvailable(username: string): Promise<boolean>;
    likePost(postId: bigint): Promise<void>;
    markAllNotificationsAsRead(): Promise<void>;
    register(username: string, bio: string): Promise<void>;
    removeFriend(friend: Principal): Promise<void>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    sendFriendRequest(friend: Principal): Promise<void>;
    updateBio(bio: string): Promise<void>;
    updateCoverPhoto(photo: ExternalBlob | null): Promise<void>;
    updateProfilePhoto(photo: ExternalBlob | null): Promise<void>;
}
