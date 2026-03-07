import Array "mo:core/Array";
import Text "mo:core/Text";
import Iter "mo:core/Iter";
import Time "mo:core/Time";
import Blob "mo:core/Blob";
import Map "mo:core/Map";
import Set "mo:core/Set";
import List "mo:core/List";
import Int "mo:core/Int";
import Nat "mo:core/Nat";
import Order "mo:core/Order";
import Nat64 "mo:core/Nat64";
import Runtime "mo:core/Runtime";
import Principal "mo:core/Principal";
import Storage "blob-storage/Storage";
import MixinStorage "blob-storage/Mixin";
import AccessControl "authorization/access-control";
import MixinAuthorization "authorization/MixinAuthorization";



actor {
  include MixinStorage();

  type FriendshipStatus = {
    #pending;
    #accepted;
    #declined;
  };

  type MediaType = {
    #photo;
    #video;
  };

  type NotificationType = {
    #friendRequestReceived;
    #friendRequestAccepted;
    #newPostFromFriend;
  };

  public type UserProfile = {
    username : Text;
    profilePhoto : ?Storage.ExternalBlob;
    bio : Text;
    createdAt : Int;
    coverPhoto : ?Storage.ExternalBlob;
  };

  type Friendship = {
    user1 : Principal;
    user2 : Principal;
    status : FriendshipStatus;
    createdAt : Int;
    updatedAt : Int;
  };

  type Post = {
    id : Nat64;
    owner : Principal;
    caption : Text;
    media : Storage.ExternalBlob;
    mediaType : MediaType;
    createdAt : Int;
    updatedAt : Int;
  };

  type Notification = {
    id : Nat;
    user : Principal;
    notificationType : NotificationType;
    relatedUser : ?Principal;
    postId : ?Nat64;
    createdAt : Int;
    read : Bool;
  };

  type Comment = {
    id : Nat;
    postId : Nat64;
    author : Principal;
    text : Text;
    createdAt : Int;
  };

  module UserProfile {
    public func compare(profile1 : UserProfile, profile2 : UserProfile) : Order.Order {
      Text.compare(profile1.username, profile2.username);
    };
  };

  module Post {
    public func compare(post1 : Post, post2 : Post) : Order.Order {
      Nat64.compare(post1.id, post2.id);
    };

    public func compareByOwner(post1 : Post, post2 : Post) : Order.Order {
      switch (Principal.compare(post1.owner, post2.owner)) {
        case (#equal) { Nat64.compare(post1.id, post2.id) };
        case (order) { order };
      };
    };
  };

  module Notification {
    public func compare(notification1 : Notification, notification2 : Notification) : Order.Order {
      Nat.compare(notification1.id, notification2.id);
    };
  };

  let profiles = Map.empty<Principal, UserProfile>();
  let posts = Map.empty<Nat64, Post>();
  var nextPostId : Nat64 = 1;
  let friendships = Map.empty<Principal, Map.Map<Principal, FriendshipStatus>>();
  let notifications = Map.empty<Principal, List.List<Notification>>();
  let usernameToPrincipal = Map.empty<Text, Principal>();

  // Tracks who *sent* each pending friend request.
  // Key: (recipient, sender) encoded as "recipient:sender" text.
  // When A sends to B: we store key "B_A" = true.
  // This lets us distinguish sent-by-caller from received-by-caller
  // without changing the FriendshipStatus variant type.
  let pendingRequestSenders = Map.empty<Text, Bool>();

  // New for comments/likes:
  var nextCommentId = 1;
  let likes = Map.empty<Nat64, Set.Set<Principal>>();
  let comments = Map.empty<Nat64, List.List<Comment>>();

  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  func pendingKey(recipient : Principal, sender : Principal) : Text {
    recipient.toText() # "_" # sender.toText();
  };

  // Friendship system - record who sent pending requests
  func recordSender(recipient : Principal, sender : Principal) {
    pendingRequestSenders.add(pendingKey(recipient, sender), true);
  };

  func clearSender(recipient : Principal, sender : Principal) {
    pendingRequestSenders.remove(pendingKey(recipient, sender));
  };

  func isSenderOf(principal : Principal, other : Principal) : Bool {
    // principal sent to other => key is "other_principal"
    switch (pendingRequestSenders.get(pendingKey(other, principal))) {
      case (?_) { true };
      case (null) { false };
    };
  };

  public shared ({ caller }) func removeFriend(friend : Principal) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can remove friends");
    };
    assertProfileExists(caller);
    assertProfileExists(friend);
    assertFriendshipStatus(caller, friend, #accepted);

    // Remove caller's entry for this friend
    switch (friendships.get(caller)) {
      case (?userFriendships) {
        let updatedFriendships = Map.empty<Principal, FriendshipStatus>();
        for ((principal, status) in userFriendships.entries()) {
          if (principal != friend) {
            updatedFriendships.add(principal, status);
          };
        };
        friendships.add(caller, updatedFriendships);
      };
      case (null) {};
    };

    // Remove friend's entry for caller
    switch (friendships.get(friend)) {
      case (?friendFriendships) {
        let updatedFriendships = Map.empty<Principal, FriendshipStatus>();
        for ((principal, status) in friendFriendships.entries()) {
          if (principal != caller) {
            updatedFriendships.add(principal, status);
          };
        };
        friendships.add(friend, updatedFriendships);
      };
      case (null) {};
    };
  };

  // --- Profile/User --- //

  public shared ({ caller }) func register(username : Text, bio : Text) : async () {
    assertValidUsername(username);
    if (not isUsernameAvailableInternal(username)) {
      Runtime.trap("Username already taken");
    };

    let profile = createUserProfile(caller, username, bio, null);
    if (profile == null) { Runtime.trap("Failed to create user profile") };

    accessControlState.userRoles.add(caller, #user);
  };

  func createUserProfile(p : Principal, username : Text, bio : Text, profilePhoto : ?Storage.ExternalBlob) : ?UserProfile {
    let normalizedUsername = username.trim(#char ' ');
    if (normalizedUsername.size() < 4 or normalizedUsername.size() > 16) {
      Runtime.trap("Username must be 4-16 characters");
    };

    switch (profiles.get(p)) {
      case (?_) { Runtime.trap("Principal already exists") };
      case (null) {
        let newUser : UserProfile = {
          username = normalizedUsername;
          bio;
          profilePhoto;
          createdAt = Time.now();
          coverPhoto = null;
        };

        usernameToPrincipal.add(normalizedUsername, p);
        profiles.add(p, newUser);

        return ?newUser;
      };
    };
  };

  public shared ({ caller }) func updateProfilePhoto(photo : ?Storage.ExternalBlob) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update profile photo");
    };
    assertProfileExists(caller);

    switch (profiles.get(caller)) {
      case (?profile) {
        let updatedProfile : UserProfile = {
          username = profile.username;
          bio = profile.bio;
          profilePhoto = photo;
          createdAt = profile.createdAt;
          coverPhoto = profile.coverPhoto;
        };
        profiles.add(caller, updatedProfile);
      };
      case (null) { Runtime.trap("Profile does not exist") };
    };
  };

  public shared ({ caller }) func updateCoverPhoto(photo : ?Storage.ExternalBlob) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update cover photo");
    };
    assertProfileExists(caller);

    switch (profiles.get(caller)) {
      case (?profile) {
        let updatedProfile : UserProfile = {
          username = profile.username;
          bio = profile.bio;
          profilePhoto = profile.profilePhoto;
          createdAt = profile.createdAt;
          coverPhoto = photo;
        };
        profiles.add(caller, updatedProfile);
      };
      case (null) { Runtime.trap("Profile does not exist") };
    };
  };

  public shared ({ caller }) func updateBio(bio : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update bio");
    };
    assertProfileExists(caller);

    switch (profiles.get(caller)) {
      case (?profile) {
        let updatedProfile : UserProfile = {
          username = profile.username;
          bio;
          profilePhoto = profile.profilePhoto;
          createdAt = profile.createdAt;
          coverPhoto = profile.coverPhoto;
        };
        profiles.add(caller, updatedProfile);
      };
      case (null) { Runtime.trap("Profile does not exist") };
    };
  };

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can get profile");
    };
    profiles.get(caller);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    profiles.add(caller, profile);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view profiles");
    };
    assertProfileExists(user);
    profiles.get(user);
  };

  public query ({ caller }) func getProfileByUsername(username : Text) : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can search profiles");
    };

    switch (usernameToPrincipal.get(username)) {
      case (?owner) { profiles.get(owner) };
      case (null) { Runtime.trap("Username not found") };
    };
  };

  public query ({ caller }) func getPrincipalByUsername(username : Text) : async ?Principal {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view usernames");
    };
    usernameToPrincipal.get(username);
  };

  public query func isUsernameAvailable(username : Text) : async Bool {
    isUsernameAvailableInternal(username);
  };

  func isUsernameAvailableInternal(username : Text) : Bool {
    usernameToPrincipal.get(username.trim(#char ' ')) == null;
  };

  // --- Friendships --- //
  public shared ({ caller }) func sendFriendRequest(friend : Principal) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can send friend requests");
    };
    assertProfileExists(caller);
    assertProfileExists(friend);
    if (caller == friend) { Runtime.trap("Cannot send friend request to yourself.") };
    assertNotFriendsOrPending(caller, friend);

    // Both sides get #pending in the friendship map (stable type unchanged),
    // but we separately record the sender so we can distinguish direction.
    updateFriendshipStatus(caller, friend, #pending);
    updateFriendshipStatus(friend, caller, #pending);
    recordSender(friend, caller); // caller sent to friend

    sendNotification(friend, #friendRequestReceived, caller, null);
  };

  public shared ({ caller }) func acceptFriendRequest(friend : Principal) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can accept friend requests");
    };
    assertProfileExists(caller);
    assertProfileExists(friend);
    assertFriendshipStatus(caller, friend, #pending);
    // Ensure the caller is the recipient, not the sender
    if (isSenderOf(caller, friend)) {
      Runtime.trap("Cannot accept a request you sent.");
    };
    updateFriendshipStatus(caller, friend, #accepted);
    updateFriendshipStatus(friend, caller, #accepted);
    clearSender(caller, friend); // clear tracking

    sendNotification(friend, #friendRequestAccepted, caller, null);
  };

  public shared ({ caller }) func declineFriendRequest(friend : Principal) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can decline friend requests");
    };
    assertProfileExists(caller);
    assertProfileExists(friend);
    assertFriendshipStatus(caller, friend, #pending);
    // Ensure the caller is the recipient, not the sender
    if (isSenderOf(caller, friend)) {
      Runtime.trap("Cannot decline a request you sent.");
    };
    updateFriendshipStatus(caller, friend, #declined);
    updateFriendshipStatus(friend, caller, #declined);
    clearSender(caller, friend); // clear tracking
  };

  // Returns principals who sent a friend request TO the caller (received requests)
  public query ({ caller }) func getPendingFriendRequests() : async [Principal] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view requests");
    };
    assertProfileExists(caller);

    switch (friendships.get(caller)) {
      case (?userFriendships) {
        // Only include if status is #pending AND the caller is NOT the sender
        userFriendships.filter(func(other, status) {
          status == #pending and not isSenderOf(caller, other)
        }).keys().toArray();
      };
      case (null) { [] };
    };
  };

  public query ({ caller }) func getSentFriendRequests() : async [Principal] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view sent requests");
    };
    assertProfileExists(caller);

    switch (friendships.get(caller)) {
      case (?userFriendships) {
        // Only include if status is #pending AND the caller IS the sender
        userFriendships.filter(func(other, status) {
          status == #pending and isSenderOf(caller, other)
        }).keys().toArray();
      };
      case (null) { [] };
    };
  };

  public query ({ caller }) func getAcceptedFriends() : async [Principal] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view friends");
    };
    assertProfileExists(caller);

    switch (friendships.get(caller)) {
      case (?userFriendships) {
        userFriendships.filter(func(_, status) { status == #accepted })
        .keys().toArray();
      };
      case (null) { [] };
    };
  };

  // --- Posts --- //
  public shared ({ caller }) func createPost(caption : Text, media : Storage.ExternalBlob, mediaType : MediaType) : async Nat64 {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create posts");
    };
    assertProfileExists(caller);

    let post : Post = {
      id = nextPostId;
      owner = caller;
      caption;
      media;
      mediaType;
      createdAt = Time.now();
      updatedAt = Time.now();
    };

    posts.add(nextPostId, post);
    let currentPostId = nextPostId;
    nextPostId += 1;

    sendPostsToFriends(caller, currentPostId);

    currentPostId;
  };

  func sendPostsToFriends(owner : Principal, postId : Nat64) {
    switch (friendships.get(owner)) {
      case (?userFriendships) {
        for ((friend, status) in userFriendships.entries()) {
          if (status == #accepted) {
            sendNotification(friend, #newPostFromFriend, owner, ?postId);
          };
        };
      };
      case (null) {};
    };
  };

  public shared ({ caller }) func editPost(id : Nat64, newCaption : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can edit posts");
    };
    let post = assertPostExists(id).0;
    if (post.owner != caller) { Runtime.trap("Post owner must update post.") };

    let updatedPost : Post = {
      id = post.id;
      owner = post.owner;
      media = post.media;
      mediaType = post.mediaType;
      caption = newCaption;
      createdAt = post.createdAt;
      updatedAt = Time.now();
    };
    posts.add(id, updatedPost);
  };

  public shared ({ caller }) func deletePost(id : Nat64) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete posts");
    };
    let post = assertPostExists(id).0;

    if (post.owner != caller) { Runtime.trap("Post owner must delete posts.") };
    posts.remove(id);
  };

  func filterPosts(filterFunc : (Post) -> Bool) : [Post] {
    let iter = posts.values();
    iter.filter(filterFunc).toArray();
  };

  public query ({ caller }) func getMainFeed() : async [Post] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view feed");
    };
    assertProfileExists(caller);

    func filterByAcceptedFriends(post : Post) : Bool {
      if (post.owner == caller) { return true };

      switch (friendships.get(caller)) {
        case (?userFriendships) {
          switch (userFriendships.get(post.owner)) {
            case (?status) { return status == #accepted };
            case (null) { return false };
          };
        };
        case (null) { return false };
      };
    };

    filterPosts(filterByAcceptedFriends).sort(Post.compareByOwner);
  };

  public query ({ caller }) func getProfilePosts(user : Principal) : async [Post] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view profile posts");
    };
    assertProfileExists(caller);
    assertProfileExists(user);

    if (caller == user) { return getPostsByOwner(user) };
    assertFriendshipStatus(caller, user, #accepted);

    let postsForUser = filterPosts(func(post) { post.owner == user });
    postsForUser.sort();
  };

  func getPostsByOwner(owner : Principal) : [Post] {
    filterPosts(func(post) { post.owner == owner });
  };

  public query ({ caller }) func getPostById(id : Nat64) : async Post {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view posts");
    };
    assertProfileExists(caller);
    let post = assertPostExists(id).0;

    if (post.owner != caller) {
      assertFriendshipStatus(caller, post.owner, #accepted);
    };

    post;
  };

  func canViewPost(caller : Principal, postId : Nat64) {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: User permission required to view posts");
    };
    switch (posts.get(postId)) {
      case (?post) {
        if (post.owner == caller) { return () };
        switch (friendships.get(caller)) {
          case (?userFriendships) {
            switch (userFriendships.get(post.owner)) {
              case (?status) {
                if (status == #accepted) { return () };
              };
              case (null) {};
            };
          };
          case (null) {};
        };
      };
      case (null) {};
    };
    Runtime.trap("No permission to view post with id " # postId.toText());
  };

  // --- Likes/Comments --- //
  public shared ({ caller }) func likePost(postId : Nat64) : async () {
    canViewPost(caller, postId);

    switch (likes.get(postId)) {
      case (?currentLikes) {
        if (currentLikes.contains(caller)) {
          // Unlike
          let updatedLikes = Set.empty<Principal>();
          for (principal in currentLikes.values()) {
            if (principal != caller) {
              updatedLikes.add(principal);
            };
          };
          likes.add(postId, updatedLikes);
        } else {
          // Like
          let newLikes = Set.fromIter(currentLikes.values());
          newLikes.add(caller);
          likes.add(postId, newLikes);
        };
      };
      case (null) {
        // No likes yet, add first like
        let newLikes = Set.empty<Principal>();
        newLikes.add(caller);
        likes.add(postId, newLikes);
      };
    };
  };

  public query ({ caller }) func getLikes(postId : Nat64) : async [Principal] {
    canViewPost(caller, postId);
    switch (likes.get(postId)) {
      case (?currentLikes) {
        currentLikes.toArray();
      };
      case (null) { [] };
    };
  };

  public shared ({ caller }) func addComment(postId : Nat64, text : Text) : async Nat {
    canViewPost(caller, postId);

    let comment : Comment = {
      id = nextCommentId;
      postId;
      author = caller;
      text;
      createdAt = Time.now();
    };

    switch (comments.get(postId)) {
      case (?existingComments) {
        existingComments.add(comment);
        comments.add(postId, existingComments);
      };
      case (null) {
        let newComments = List.empty<Comment>();
        newComments.add(comment);
        comments.add(postId, newComments);
      };
    };

    nextCommentId += 1;
    comment.id;
  };

  public shared ({ caller }) func deleteComment(postId : Nat64, commentId : Nat) : async () {
    canViewPost(caller, postId);

    switch (comments.get(postId)) {
      case (?postComments) {
        let comment = postComments.find(func(comment) { comment.id == commentId });
        switch (comment) {
          case (?c) {
            if (c.author != caller) { Runtime.trap("Only comment author can delete.") };
            // Remove comment
            let updatedComments = postComments.filter(
              func(comment) { comment.id != commentId }
            );
            comments.add(postId, updatedComments);
          };
          case (null) {
            Runtime.trap("Comment does not exist");
          };
        };
      };
      case (null) {
        Runtime.trap("Comment does not exist");
      };
    };
  };

  public query ({ caller }) func getComments(postId : Nat64) : async [Comment] {
    canViewPost(caller, postId);
    switch (comments.get(postId)) {
      case (?postComments) {
        postComments.toArray();
      };
      case (null) {
        [];
      };
    };
  };

  // --- Notifications --- //
  public query ({ caller }) func getNotifications() : async [Notification] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can get notifications");
    };
    assertProfileExists(caller);

    switch (notifications.get(caller)) {
      case (?userNotifications) {
        userNotifications.toArray().sort();
      };
      case (null) { [] };
    };
  };

  public shared ({ caller }) func markAllNotificationsAsRead() : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can mark as read");
    };
    assertProfileExists(caller);

    switch (notifications.get(caller)) {
      case (?userNotifications) {
        let updatedNotifications = userNotifications.map<Notification, Notification>(
          func(notification) {
            {
              id = notification.id;
              user = notification.user;
              notificationType = notification.notificationType;
              relatedUser = notification.relatedUser;
              postId = notification.postId;
              createdAt = notification.createdAt;
              read = true;
            };
          }
        );
        notifications.add(caller, updatedNotifications);
      };
      case (null) {};
    };
  };

  // --- Internal functions (unchanged) --- //

  func getCurrentUserInternal(p : Principal) : UserProfile {
    switch (profiles.get(p)) {
      case (?profile) { profile };
      case (null) { Runtime.trap("Profile does not exist") };
    };
  };

  func assertProfileExists(p : Principal) {
    switch (profiles.get(p)) {
      case (null) { Runtime.trap("Requested user profile does not exist") };
      case (_) { return };
    };
  };

  func assertUsernameValid(username : Text) {
    let trimmedUsername = username.trim(#char ' ');
    let pattern = "[a-zA-Z0-9]*";
    if (trimmedUsername.size() < 4 or trimmedUsername.size() > 16) {
      Runtime.trap("Username must be 4-16 characters and contain only alphanumeric characters.");
    };
    if (not containsOnlyAlphanumeric(trimmedUsername, pattern)) {
      Runtime.trap("Username must be 4-16 characters and contain only alphanumeric characters.");
    };
  };

  func containsOnlyAlphanumeric(username : Text, pattern : Text) : Bool {
    username.toArray().all(
      func(c) {
        let codePoint = c.toNat32();
        let isDigit = codePoint >= 48 and codePoint <= 57;
        let isLowercase = codePoint >= 97 and codePoint <= 122;
        let isUppercase = codePoint >= 65 and codePoint <= 90;
        isDigit or isLowercase or isUppercase;
      }
    );
  };

  func assertValidUsername(username : Text) {
    let trimmedUsername = username.trim(#char ' ');
    if (trimmedUsername.size() < 4 or trimmedUsername.size() > 16) {
      Runtime.trap("Username must be 4-16 characters and contain only alphanumeric characters!.");
    };
    assertUsernameValid(trimmedUsername);
  };

  // Prevents duplicate/conflicting requests
  func assertNotFriendsOrPending(user1 : Principal, user2 : Principal) {
    switch (getFriendshipStatusInternal(user1, user2)) {
      case (?#accepted) { Runtime.trap("Already friends") };
      case (?#pending) { Runtime.trap("A friend request already exists between these users") };
      case (_) { return };
    };
  };

  func assertFriendshipStatus(user1 : Principal, user2 : Principal, status : FriendshipStatus) {
    switch (getFriendshipStatusInternal(user1, user2)) {
      case (?s) {
        if (s != status) {
          Runtime.trap("Friendship must be status " # getStatusText(status));
        };
      };
      case (null) { Runtime.trap("No friendship found") };
    };
  };

  func updateFriendshipStatus(user1 : Principal, user2 : Principal, status : FriendshipStatus) {
    let user1Status = switch (friendsStatusMap(user1)) {
      case (?existingMap) { existingMap };
      case (null) {
        let newUser1Status = Map.empty<Principal, FriendshipStatus>();
        friendships.add(user1, newUser1Status);
        newUser1Status;
      };
    };

    user1Status.add(user2, status);
  };

  func sendNotification(user : Principal, notificationType : NotificationType, relatedUser : Principal, postId : ?Nat64) {
    if (user.toText().isEmpty()) { return };

    let notificationId : Nat = switch (notifications.get(user)) {
      case (?userNotifications) { (userNotifications.size() + 1) };
      case (null) { 1 };
    };

    let notification : Notification = {
      id = notificationId;
      user;
      notificationType;
      relatedUser = ?relatedUser;
      postId;
      createdAt = Time.now();
      read = false;
    };

    let currentNotifications = switch (notifications.get(user)) {
      case (?userNotifications) { userNotifications };
      case (null) { List.empty<Notification>() };
    };

    currentNotifications.add(notification);
    notifications.add(user, currentNotifications);
  };

  func assertPostExists(id : Nat64) : (Post, Nat64) {
    switch (posts.get(id)) {
      case (?post) { (post, id) };
      case (null) { Runtime.trap("Post does not exist") };
    };
  };

  func getFriendshipStatusInternal(user1 : Principal, user2 : Principal) : ?FriendshipStatus {
    switch (friendships.get(user1)) {
      case (?userFriendships) { userFriendships.get(user2) };
      case (null) { null };
    };
  };

  func getFriends(user : Principal, status : FriendshipStatus) : [Principal] {
    switch (friendships.get(user)) {
      case (?userFriendships) {
        userFriendships.filter(func(_, s) { s == status }).keys().toArray();
      };
      case (null) { [] };
    };
  };

  func getStatusText(status : FriendshipStatus) : Text {
    switch (status) {
      case (#pending) { "pending" };
      case (#accepted) { "accepted" };
      case (#declined) { "declined" };
    };
  };

  func friendsStatusMap(p : Principal) : ?Map.Map<Principal, FriendshipStatus> {
    friendships.get(p);
  };
};

