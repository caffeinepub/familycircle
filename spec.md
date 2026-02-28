# FamilyCircle

## Current State
New project. No existing code.

## Requested Changes (Diff)

### Add
- User registration and login with unique username enforcement
- User profiles: username, profile photo (uploaded), and bio (editable)
- Friend system: send/receive/accept/decline friend requests by username; friendships are mutual
- Post creation: upload photo or video from device or camera, with a caption
- Post editing and deletion by the post creator only
- Main feed: chronological posts from all accepted friends
- Per-profile feed: posts visible on a user's profile page (friends-only)
- Post sharing via link: link resolves to the post, visible only to logged-in users who are friends with the post owner
- In-app notifications: friend request received, friend request accepted, new post from a friend
- Notification bell with unread count badge; mark as read on open
- Authorization: all post/friend/profile data is gated behind login; unauthenticated users see only login/signup

### Modify
N/A

### Remove
N/A

## Implementation Plan

### Backend (Motoko)
- `User` record: principalId, username (unique index), bio, profilePhotoId (blob ref), createdAt
- `FriendRequest` record: id, fromPrincipal, toPrincipal, status (pending/accepted/declined), createdAt
- `Post` record: id, ownerPrincipal, mediaId (blob ref), mediaType (photo/video), caption, createdAt, updatedAt
- `Notification` record: id, recipientPrincipal, type (friendRequest/friendAccepted/newPost), referenceId, read, createdAt
- APIs:
  - `registerUser(username, bio)` -- create profile, fail if username taken
  - `getMyProfile()` / `updateProfile(bio, photoId)`
  - `getUserByUsername(username)` -- returns public profile (friends-only guard)
  - `sendFriendRequest(username)` -- creates request, triggers notification
  - `respondFriendRequest(requestId, accept)` -- accept/decline, triggers notification if accepted
  - `getFriendRequests()` -- pending requests for current user
  - `getFriends()` -- list of accepted friends
  - `createPost(mediaId, mediaType, caption)` -- creates post, notifies all friends
  - `editPost(postId, caption)` -- owner only
  - `deletePost(postId)` -- owner only
  - `getPost(postId)` -- friends-only guard for shared link resolution
  - `getMyFeed()` -- posts from all friends, sorted by createdAt desc
  - `getProfilePosts(username)` -- posts for a given user, friends-only guard
  - `getNotifications()` -- all notifications for current user
  - `markNotificationsRead()` -- mark all as read

### Frontend (React + TypeScript)
- Auth pages: Sign Up (username + password via Internet Identity), Log In
- Main layout: top navbar with notification bell (unread badge), current user avatar, nav links
- Feed page (`/feed`): scrollable list of posts from friends; each post shows media, caption, author avatar+username, timestamp, edit/delete controls if owner, share button (copies link)
- Profile page (`/profile/:username`): profile photo, username, bio, friend request button (if not already friends), posts grid/list
- Edit Profile page: update bio and profile photo
- Friend Requests page or panel: list of incoming pending requests with accept/decline
- Notifications dropdown/panel: list of notifications, unread highlighted, mark as read on open
- Post creation modal/page: file picker (device) + camera capture option, caption input, submit
- Post detail page (`/post/:postId`): for shared links; shows single post (friends-only gate)
- Shared post links: `/post/:postId` -- redirect to login if not authenticated, show error if not friends

### Data & Access Control
- All queries check caller principal; unauthenticated calls return errors
- Friend guard: post/profile data only returned if caller is friends with owner, or caller is the owner
- Username uniqueness enforced at registration; case-insensitive check recommended
