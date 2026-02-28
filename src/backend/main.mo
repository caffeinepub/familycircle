import Array "mo:core/Array";
import Iter "mo:core/Iter";
import Text "mo:core/Text";
import Map "mo:core/Map";
import Time "mo:core/Time";
import Order "mo:core/Order";
import List "mo:core/List";
import Nat64 "mo:core/Nat64";
import Runtime "mo:core/Runtime";
import Set "mo:core/Set";
import Principal "mo:core/Principal";
import Blob "mo:core/Blob";
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

  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  public shared ({ caller }) func register(username : Text, bio : Text) : async () {
    assertValidUsername(username);
    if (not isUsernameAvailableInternal(username)) {
      Runtime.trap("Username already taken");
    };

    let profile = createUserProfile(caller, username, bio, null);
    if (profile == null) { Runtime.trap("Failed to create user profile") };
    
    // Assign user role after successful registration
    AccessControl.assignRole(accessControlState, caller, caller, #user);
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
        };
        profiles.add(caller, updatedProfile);
      };
      case (null) { Runtime.trap("Profile does not exist") };
    };
  };

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can get their profile");
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

  public query ({ caller }) func isUsernameAvailable(username : Text) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can check username availability");
    };
    isUsernameAvailableInternal(username);
  };

  func isUsernameAvailableInternal(username : Text) : Bool {
    usernameToPrincipal.get(username.trim(#char ' ')) == null;
  };

  public shared ({ caller }) func sendFriendRequest(friend : Principal) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can send friend requests");
    };
    assertProfileExists(caller);
    assertProfileExists(friend);
    assertNotFriends(caller, friend);
    if (caller == friend) { Runtime.trap("Cannot send friend request to yourself.") };

    updateFriendshipStatus(caller, friend, #pending);
    updateFriendshipStatus(friend, caller, #pending);

    sendNotification(friend, #friendRequestReceived, caller, null);
  };

  public shared ({ caller }) func acceptFriendRequest(friend : Principal) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can accept friend requests");
    };
    assertProfileExists(caller);
    assertProfileExists(friend);
    assertFriendshipStatus(caller, friend, #pending);
    updateFriendshipStatus(friend, caller, #accepted);
    updateFriendshipStatus(caller, friend, #accepted);

    sendNotification(friend, #friendRequestAccepted, caller, null);
  };

  public shared ({ caller }) func declineFriendRequest(friend : Principal) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can decline friend requests");
    };
    assertProfileExists(caller);
    assertProfileExists(friend);
    assertFriendshipStatus(caller, friend, #pending);

    updateFriendshipStatus(caller, friend, #declined);
    updateFriendshipStatus(friend, caller, #declined);
  };

  public query ({ caller }) func getPendingFriendRequests() : async [Principal] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view friend requests");
    };
    assertProfileExists(caller);

    switch (friendships.get(caller)) {
      case (?userFriendships) {
        userFriendships.filter(func(_, status) { status == #pending })
        .keys().toArray();
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

    // Allow if user is the owner or they're friends
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

  public query ({ caller }) func getNotifications() : async [Notification] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view notifications");
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
      Runtime.trap("Unauthorized: Only users can mark notifications as read");
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

  // Helper functions
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
        isDigit or isLowercase or isUppercase
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

  func assertNotFriends(user1 : Principal, user2 : Principal) {
    switch (getFriendshipStatusInternal(user1, user2)) {
      case (?#accepted) { Runtime.trap("Already friends") };
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

  func createDefaultFriendsStatus(p1 : Principal, p2 : Principal) : Map.Map<Principal, FriendshipStatus> {
    Map.empty<Principal, FriendshipStatus>();
  };

  func friendsStatusMap(p : Principal) : ?Map.Map<Principal, FriendshipStatus> {
    friendships.get(p);
  };
};
