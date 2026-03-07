import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Storage "blob-storage/Storage";

module {
  // Old UserProfile definition without coverPhoto
  type OldUserProfile = {
    username : Text;
    profilePhoto : ?Storage.ExternalBlob;
    bio : Text;
    createdAt : Int;
  };

  // Old actor type
  type OldActor = {
    profiles : Map.Map<Principal, OldUserProfile>;
  };

  // New UserProfile definition with coverPhoto
  type NewUserProfile = {
    username : Text;
    profilePhoto : ?Storage.ExternalBlob;
    bio : Text;
    createdAt : Int;
    coverPhoto : ?Storage.ExternalBlob;
  };

  // New actor type
  type NewActor = {
    profiles : Map.Map<Principal, NewUserProfile>;
  };

  // Migration function called by the main actor via the with-clause
  public func run(old : OldActor) : NewActor {
    let newProfiles = old.profiles.map<Principal, OldUserProfile, NewUserProfile>(
      func(_, oldProfile) {
        { oldProfile with coverPhoto = null }; // Add coverPhoto field with default value
      }
    );

    { profiles = newProfiles };
  };
};
