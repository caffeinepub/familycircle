import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useNavigate } from "@tanstack/react-router";
import { Camera, CheckCircle2, Loader2, Upload, XCircle } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ExternalBlob } from "../backend";
import { useDebounce } from "../hooks/useDebounce";
import {
  useGetCallerUserProfile,
  useIsUsernameAvailable,
  useRegister,
  useUpdateProfilePhoto,
} from "../hooks/useQueries";
import { fileToUint8Array } from "../utils/media";
import { getInitials } from "../utils/media";

export function SetupPage() {
  const navigate = useNavigate();

  // If the user already has a profile, redirect them straight to the feed
  const { data: existingProfile, isFetched: profileFetched } =
    useGetCallerUserProfile();

  useEffect(() => {
    if (profileFetched && existingProfile) {
      navigate({ to: "/feed" });
    }
  }, [profileFetched, existingProfile, navigate]);
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const register = useRegister();
  const updateProfilePhoto = useUpdateProfilePhoto();

  const debouncedUsername = useDebounce(username, 500);
  const { data: isAvailable, isLoading: checkingAvailability } =
    useIsUsernameAvailable(debouncedUsername);

  const isValidUsername = /^[a-z0-9_]{3,20}$/.test(username);
  const showAvailability = debouncedUsername.length >= 3 && isValidUsername;

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidUsername) {
      toast.error(
        "Username must be 3-20 chars, lowercase letters, numbers, underscores",
      );
      return;
    }
    if (!isAvailable) {
      toast.error("Username is not available");
      return;
    }

    try {
      await register.mutateAsync({ username, bio });

      if (photoFile) {
        const bytes = await fileToUint8Array(photoFile);
        const blob = ExternalBlob.fromBytes(bytes).withUploadProgress((pct) => {
          setUploadProgress(pct);
        });
        await updateProfilePhoto.mutateAsync(blob);
      }

      toast.success("Profile created! Welcome to MyCircle 🎉");
      navigate({ to: "/feed" });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Setup failed";
      toast.error(message);
      setUploadProgress(0);
    }
  };

  const isSubmitting = register.isPending || updateProfilePhoto.isPending;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-md"
      >
        <div className="bg-card rounded-3xl shadow-card-hover border border-border/50 p-8 card-grain">
          <div className="flex justify-center mb-2">
            <img
              src="/assets/generated/mycircle-logo-transparent.dim_120x120.png"
              alt="MyCircle"
              className="h-12 w-12"
            />
          </div>
          <h1 className="font-display font-bold text-2xl text-foreground mb-1 text-center">
            Create your profile
          </h1>
          <p className="text-muted-foreground text-sm text-center mb-8">
            Set up your MyCircle identity
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Profile photo */}
            <div className="flex flex-col items-center gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="relative h-24 w-24 rounded-full border-2 border-dashed border-border hover:border-primary/50 transition-colors overflow-hidden group"
                aria-label="Upload profile photo"
              >
                {photoPreview ? (
                  <img
                    src={photoPreview}
                    alt="Profile preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-muted flex flex-col items-center justify-center gap-1">
                    <span className="text-2xl font-display font-bold text-muted-foreground">
                      {username ? getInitials(username) : "?"}
                    </span>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="h-6 w-6 text-white" />
                </div>
              </button>
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
                {photoFile ? "Change photo" : "Add profile photo"}
              </button>
            </div>

            {/* Username */}
            <div className="space-y-1.5">
              <Label htmlFor="username">Username</Label>
              <div className="relative">
                <Input
                  id="username"
                  value={username}
                  onChange={(e) =>
                    setUsername(
                      e.target.value.toLowerCase().replace(/\s/g, "_"),
                    )
                  }
                  placeholder="your_username"
                  className="pr-9"
                  autoComplete="username"
                  disabled={isSubmitting}
                  maxLength={20}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {showAvailability && checkingAvailability && (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                  {showAvailability &&
                    !checkingAvailability &&
                    isAvailable === true && (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    )}
                  {showAvailability &&
                    !checkingAvailability &&
                    isAvailable === false && (
                      <XCircle className="h-4 w-4 text-destructive" />
                    )}
                </div>
              </div>
              <div className="flex justify-between">
                <p
                  className={cn("text-xs", {
                    "text-muted-foreground": !username,
                    "text-green-600":
                      showAvailability && !checkingAvailability && isAvailable,
                    "text-destructive":
                      (username && !isValidUsername) ||
                      (showAvailability &&
                        !checkingAvailability &&
                        isAvailable === false),
                  })}
                >
                  {!username &&
                    "3–20 chars, lowercase letters, numbers, underscores"}
                  {username && !isValidUsername && "Invalid format"}
                  {showAvailability &&
                    !checkingAvailability &&
                    isAvailable === true &&
                    "Username available ✓"}
                  {showAvailability &&
                    !checkingAvailability &&
                    isAvailable === false &&
                    "Username taken"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {username.length}/20
                </p>
              </div>
            </div>

            {/* Bio */}
            <div className="space-y-1.5">
              <Label htmlFor="bio">
                Bio{" "}
                <span className="text-muted-foreground text-xs">
                  (optional)
                </span>
              </Label>
              <Textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell your circle a bit about yourself..."
                className="resize-none min-h-[80px]"
                disabled={isSubmitting}
                maxLength={200}
              />
              <p className="text-xs text-muted-foreground text-right">
                {bio.length}/200
              </p>
            </div>

            {/* Upload progress */}
            {isSubmitting && uploadProgress > 0 && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Uploading photo...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="h-1.5" />
              </div>
            )}

            <Button
              type="submit"
              size="lg"
              className="w-full h-12 text-base font-semibold rounded-xl"
              disabled={
                isSubmitting ||
                !isValidUsername ||
                !isAvailable ||
                checkingAvailability
              }
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating profile...
                </>
              ) : (
                "Create Profile"
              )}
            </Button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
