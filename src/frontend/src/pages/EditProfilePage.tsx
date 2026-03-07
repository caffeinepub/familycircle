import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Camera, ImageIcon, Loader2, Upload } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ExternalBlob } from "../backend";
import { Navbar } from "../components/Navbar";
import { UserAvatar } from "../components/UserAvatar";
import {
  useGetCallerUserProfile,
  useUpdateBio,
  useUpdateCoverPhoto,
  useUpdateProfilePhoto,
} from "../hooks/useQueries";
import { fileToUint8Array } from "../utils/media";

export function EditProfilePage() {
  const navigate = useNavigate();
  const { data: profile, isLoading } = useGetCallerUserProfile();
  const updateBio = useUpdateBio();
  const updatePhoto = useUpdateProfilePhoto();
  const updateCoverPhoto = useUpdateCoverPhoto();

  const [bio, setBio] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [coverPhotoFile, setCoverPhotoFile] = useState<File | null>(null);
  const [coverPhotoPreview, setCoverPhotoPreview] = useState<string | null>(
    null,
  );
  const [coverUploadProgress, setCoverUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverFileInputRef = useRef<HTMLInputElement>(null);

  // Initialize bio from profile
  useEffect(() => {
    if (profile) {
      setBio(profile.bio);
    }
  }, [profile]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    setPhotoFile(file);
    const url = URL.createObjectURL(file);
    setPhotoPreview(url);
  };

  useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview);
    };
  }, [photoPreview]);

  const handleCoverPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    setCoverPhotoFile(file);
    const url = URL.createObjectURL(file);
    setCoverPhotoPreview(url);
  };

  useEffect(() => {
    return () => {
      if (coverPhotoPreview) URL.revokeObjectURL(coverPhotoPreview);
    };
  }, [coverPhotoPreview]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const promises: Promise<void>[] = [];

    if (bio !== profile?.bio) {
      promises.push(updateBio.mutateAsync(bio));
    }

    if (photoFile) {
      promises.push(
        (async () => {
          const bytes = await fileToUint8Array(photoFile);
          const blob = ExternalBlob.fromBytes(bytes).withUploadProgress(
            (pct) => {
              setUploadProgress(pct);
            },
          );
          await updatePhoto.mutateAsync(blob);
        })(),
      );
    }

    if (coverPhotoFile) {
      promises.push(
        (async () => {
          const bytes = await fileToUint8Array(coverPhotoFile);
          const blob = ExternalBlob.fromBytes(bytes).withUploadProgress(
            (pct) => {
              setCoverUploadProgress(pct);
            },
          );
          await updateCoverPhoto.mutateAsync(blob);
        })(),
      );
    }

    try {
      await Promise.all(promises);
      toast.success("Profile updated!");
      navigate({
        to: "/profile/$username",
        params: { username: profile?.username ?? "" },
      });
    } catch {
      toast.error("Failed to update profile");
      setUploadProgress(0);
      setCoverUploadProgress(0);
    }
  };

  const isSubmitting =
    updateBio.isPending || updatePhoto.isPending || updateCoverPhoto.isPending;

  // Create a modified profile for preview
  const previewProfile = profile
    ? {
        ...profile,
        bio,
        profilePhoto: photoPreview
          ? ExternalBlob.fromURL(photoPreview)
          : profile.profilePhoto,
      }
    : null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-lg mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate({ to: -1 as never })}
            className="h-8 w-8"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="font-display font-bold text-xl text-foreground">
            Edit Profile
          </h1>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="bg-card rounded-3xl shadow-card border border-border/50 p-6 card-grain">
              <form onSubmit={handleSave} className="space-y-6">
                {/* Avatar */}
                <div className="flex flex-col items-center gap-3">
                  <div className="relative">
                    <UserAvatar profile={previewProfile} size="xl" />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors shadow-sm"
                      aria-label="Change photo"
                    >
                      <Camera className="h-4 w-4" />
                    </button>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoChange}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    <Upload className="h-3 w-3" />
                    {photoFile ? "Change photo" : "Change profile photo"}
                  </button>
                </div>

                {/* Cover Photo */}
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs uppercase tracking-wide">
                    Cover Photo
                  </Label>
                  <button
                    type="button"
                    data-ocid="edit_profile.cover_photo_dropzone"
                    onClick={() => coverFileInputRef.current?.click()}
                    className="relative w-full rounded-xl overflow-hidden border-2 border-dashed border-border hover:border-primary/60 transition-colors cursor-pointer text-left"
                    style={{ aspectRatio: "3 / 1" }}
                    aria-label="Upload cover banner"
                  >
                    {coverPhotoPreview ? (
                      <img
                        src={coverPhotoPreview}
                        alt="Cover banner preview"
                        className="w-full h-full object-cover"
                      />
                    ) : profile?.coverPhoto ? (
                      <img
                        src={profile.coverPhoto.getDirectURL()}
                        alt="Current cover banner"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div
                        className="w-full h-full flex flex-col items-center justify-center gap-2"
                        style={{
                          background:
                            "linear-gradient(135deg, oklch(0.88 0.06 75) 0%, oklch(0.93 0.04 55) 50%, oklch(0.85 0.08 42) 100%)",
                        }}
                      >
                        <ImageIcon className="h-6 w-6 text-muted-foreground/60" />
                        <span className="text-xs text-muted-foreground/80 font-medium">
                          Cover Photo
                        </span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 hover:opacity-100">
                      <div className="bg-black/50 text-white text-xs font-medium px-3 py-1.5 rounded-full flex items-center gap-1.5">
                        <Upload className="h-3 w-3" />
                        Change Cover
                      </div>
                    </div>
                  </button>
                  <input
                    ref={coverFileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleCoverPhotoChange}
                    data-ocid="edit_profile.cover_photo_upload_button"
                  />
                  <button
                    type="button"
                    onClick={() => coverFileInputRef.current?.click()}
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    <Upload className="h-3 w-3" />
                    {coverPhotoFile
                      ? "Change cover photo"
                      : "Upload cover photo"}
                  </button>
                </div>

                {/* Cover photo upload progress */}
                {isSubmitting && coverUploadProgress > 0 && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Uploading cover photo...</span>
                      <span>{coverUploadProgress}%</span>
                    </div>
                    <Progress value={coverUploadProgress} className="h-1.5" />
                  </div>
                )}

                {/* Username (read-only) */}
                <div>
                  <Label className="text-muted-foreground text-xs uppercase tracking-wide">
                    Username
                  </Label>
                  <p className="mt-1 font-display font-semibold text-foreground">
                    @{profile?.username}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Username cannot be changed
                  </p>
                </div>

                {/* Bio */}
                <div className="space-y-1.5">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell your circle about yourself..."
                    className="resize-none min-h-[100px]"
                    disabled={isSubmitting}
                    maxLength={200}
                  />
                  <p className="text-xs text-muted-foreground text-right">
                    {bio.length}/200
                  </p>
                </div>

                {/* Progress */}
                {isSubmitting && uploadProgress > 0 && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Uploading photo...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <Progress value={uploadProgress} className="h-1.5" />
                  </div>
                )}

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => navigate({ to: -1 as never })}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Changes"
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
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
