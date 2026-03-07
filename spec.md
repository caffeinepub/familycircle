# MyCircle

## Current State
Full-stack social media app with:
- User registration with unique usernames
- Friend requests (send, accept, decline) with sent/received distinction
- Profile pages with profile photo, bio, and cover photo UI
- Photo/video posts with captions, visible only to friends
- Likes, comments, and likers modal
- In-app notifications
- Edit profile page with cover photo upload UI

The `UserProfile` type in the backend has no `coverPhoto` field. There is no `removeFriend` function in the backend. There is no `updateCoverPhoto` function in the backend. Both were wired up in the frontend via `(actor as any)` casts but never implemented, causing runtime errors.

## Requested Changes (Diff)

### Add
- `coverPhoto: ?Storage.ExternalBlob` field to `UserProfile` type
- `removeFriend(friend: Principal)` backend function — removes both sides of an accepted friendship from the `friendships` map
- `updateCoverPhoto(photo: ?Storage.ExternalBlob)` backend function — updates the `coverPhoto` field on the caller's profile

### Modify
- All places that construct a `UserProfile` record must include the new `coverPhoto` field (register, updateProfilePhoto, updateBio, saveCallerUserProfile, createUserProfile)

### Remove
- Nothing

## Implementation Plan
1. Add `coverPhoto: ?Storage.ExternalBlob` to the `UserProfile` type
2. Update all `UserProfile` record literals to include `coverPhoto` (default `null` for existing construction paths)
3. Add `removeFriend(friend: Principal)` public shared function that:
   - Requires caller to have `#user` role
   - Asserts both profiles exist
   - Asserts friendship is `#accepted`
   - Removes the friendship entry for both `caller` and `friend` from the `friendships` map
4. Add `updateCoverPhoto(photo: ?Storage.ExternalBlob)` public shared function that:
   - Requires caller to have `#user` role
   - Asserts profile exists
   - Updates the caller's profile with the new `coverPhoto` value, preserving all other fields
