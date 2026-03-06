import Map "mo:core/Map";
import List "mo:core/List";
import Principal "mo:core/Principal";
import Nat64 "mo:core/Nat64";
import Storage "blob-storage/Storage";
import AccessControl "authorization/access-control";

module {
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

  type UserProfile = {
    username : Text;
    profilePhoto : ?Storage.ExternalBlob;
    bio : Text;
    createdAt : Int;
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

  type OldActor = {
    profiles : Map.Map<Principal, UserProfile>;
    posts : Map.Map<Nat64, Post>;
    nextPostId : Nat64;
    friendships : Map.Map<Principal, Map.Map<Principal, FriendshipStatus>>;
    notifications : Map.Map<Principal, List.List<Notification>>;
    usernameToPrincipal : Map.Map<Text, Principal>;
    accessControlState : AccessControl.AccessControlState;
  };

  public type NewActor = OldActor;

  public func run(old : OldActor) : NewActor {
    old;
  };
};
