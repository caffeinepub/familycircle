# MyCircle

## Current State
MyCircle is a social media app for friends and family. Users can post photos/videos, add friends, like/comment on posts, and receive notifications. The app uses Internet Identity for authentication and a Motoko backend with role-based access control.

The app has a recurring profile-loading bug: after sign-in, users get stuck on the loading screen. The root cause is in the authorization flow:

1. `useActor.ts` always calls `_initializeAccessControlWithSecret("")` for regular users (with empty string since no admin token is in the URL).
2. In `MixinAuthorization.mo`, this function reads `CAFFEINE_ADMIN_TOKEN` from env vars. If the env var is not set, it traps with "CAFFEINE_ADMIN_TOKEN environment variable is not set", causing the actor query to fail.
3. When the actor fails, `actor` stays null, `getCallerUserProfile` never runs, and the app hangs on the loading screen indefinitely (until the 6-second timeout, at which point it may redirect to SetupPage or stay stuck).

Secondary issue: `getCallerUserProfile` calls `AccessControl.hasPermission` which calls `getUserRole`, which calls `Runtime.trap("User is not registered")` if the user is not in the roles map. This means a user who is in the `profiles` map but not in the `userRoles` map (due to data inconsistency) would be permanently locked out.

## Requested Changes (Diff)

### Add
- Nothing new to add

### Modify
- **Backend `MixinAuthorization.mo`**: Make `_initializeAccessControlWithSecret` gracefully handle empty/missing tokens without trapping. If the env var is not set or the token is empty, the function should still safely register the caller as a `#user` (not trap).
- **Backend `access-control.mo`**: The `getUserRole` function currently traps if a user is not found. Add a fallback that returns `#guest` for unregistered principals instead of trapping, so `hasPermission` checks can fail gracefully rather than causing a canister trap.
- **Backend `getCallerUserProfile`**: Instead of requiring `#user` permission (which traps if user not registered), use a softer check that returns null for unregistered users.

### Remove
- Nothing to remove

## Implementation Plan
1. Regenerate backend Motoko code with the above fixes applied
2. Update frontend `App.tsx` to handle the case where actor initialization fails more gracefully (shorten timeout, add error recovery)
3. Validate and deploy
