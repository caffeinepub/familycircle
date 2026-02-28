import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Camera,
  FlipHorizontal,
  Image,
  Loader2,
  Upload,
  Video,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { ExternalBlob } from "../backend";
import { MediaType } from "../backend";
import { useCamera } from "../camera/useCamera";
import { useCreatePost } from "../hooks/useQueries";
import { fileToUint8Array, getMediaType } from "../utils/media";

interface CreatePostModalProps {
  open: boolean;
  onClose: () => void;
}

function CameraCapture({
  onCapture,
}: {
  onCapture: (file: File) => void;
}) {
  const {
    isActive,
    isSupported,
    error,
    isLoading,
    startCamera,
    stopCamera,
    capturePhoto,
    switchCamera,
    videoRef,
    canvasRef,
  } = useCamera({ facingMode: "environment" });

  const handleCapture = async () => {
    const file = await capturePhoto();
    if (file) {
      void stopCamera();
      onCapture(file);
    } else {
      toast.error("Failed to capture photo");
    }
  };

  if (isSupported === false) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center p-6">
        <Camera className="h-10 w-10 text-muted-foreground/40 mb-3" />
        <p className="text-sm text-muted-foreground">
          Camera not supported in this browser
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative rounded-xl overflow-hidden bg-black aspect-[4/3] w-full min-h-[240px]">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          playsInline
          muted
        />
        <canvas ref={canvasRef} className="hidden" />
        {!isActive && !isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Button onClick={startCamera} variant="secondary">
              <Camera className="mr-2 h-4 w-4" />
              Start Camera
            </Button>
          </div>
        )}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-white" />
          </div>
        )}
        {isActive && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 text-white hover:bg-white/20 h-8 w-8"
            onClick={() => switchCamera()}
            title="Switch camera"
            disabled={isLoading}
          >
            <FlipHorizontal className="h-4 w-4" />
          </Button>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error.message}</p>}

      <Button
        onClick={handleCapture}
        disabled={!isActive || isLoading}
        className="w-full"
      >
        <Camera className="mr-2 h-4 w-4" />
        Capture Photo
      </Button>
    </div>
  );
}

export function CreatePostModal({ open, onClose }: CreatePostModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const createPost = useCreatePost();

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleClose = useCallback(() => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    setCaption("");
    setUploadProgress(0);
    onClose();
  }, [previewUrl, onClose]);

  const handleSubmit = async () => {
    if (!selectedFile) {
      toast.error("Please select a photo or video");
      return;
    }

    try {
      setUploadProgress(0);
      const bytes = await fileToUint8Array(selectedFile);
      const blob = ExternalBlob.fromBytes(bytes).withUploadProgress((pct) => {
        setUploadProgress(pct);
      });
      const mediaType = getMediaType(selectedFile);

      await createPost.mutateAsync({
        caption: caption.trim(),
        media: blob,
        mediaType,
      });
      toast.success("Post created!");
      handleClose();
    } catch {
      toast.error("Failed to create post");
      setUploadProgress(0);
    }
  };

  const isVideo = selectedFile?.type.startsWith("video/");

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-lg rounded-2xl p-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-0">
          <DialogTitle className="font-display text-lg">New Post</DialogTitle>
        </DialogHeader>

        <div className="px-5 pb-5 pt-4 space-y-4">
          {!selectedFile ? (
            <Tabs defaultValue="upload">
              <TabsList className="w-full">
                <TabsTrigger value="upload" className="flex-1">
                  <Upload className="mr-2 h-4 w-4" />
                  Upload
                </TabsTrigger>
                <TabsTrigger value="camera" className="flex-1">
                  <Camera className="mr-2 h-4 w-4" />
                  Camera
                </TabsTrigger>
              </TabsList>

              <TabsContent value="upload" className="mt-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-border rounded-xl h-52 flex flex-col items-center justify-center gap-3 hover:border-primary/50 hover:bg-primary/5 transition-all group"
                >
                  <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                    <Image className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-foreground">
                      Choose photo or video
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      JPG, PNG, GIF, MP4, MOV
                    </p>
                  </div>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </TabsContent>

              <TabsContent value="camera" className="mt-3">
                <CameraCapture onCapture={handleFileSelect} />
              </TabsContent>
            </Tabs>
          ) : (
            <div className="space-y-3">
              {/* Preview */}
              <div className="relative rounded-xl overflow-hidden bg-black max-h-72 flex items-center justify-center">
                {isVideo ? (
                  // biome-ignore lint/a11y/useMediaCaption: preview in creation modal
                  <video
                    src={previewUrl ?? ""}
                    controls
                    className="w-full max-h-72 object-contain"
                  />
                ) : (
                  <img
                    src={previewUrl ?? ""}
                    alt="Preview"
                    className="w-full max-h-72 object-contain"
                  />
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    if (previewUrl) URL.revokeObjectURL(previewUrl);
                    setSelectedFile(null);
                    setPreviewUrl(null);
                  }}
                  className="absolute top-2 right-2 h-7 w-7 bg-black/50 hover:bg-black/70 text-white rounded-full"
                >
                  <X className="h-4 w-4" />
                </Button>
                <div className="absolute top-2 left-2">
                  {isVideo ? (
                    <span className="bg-black/50 text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Video className="h-3 w-3" /> Video
                    </span>
                  ) : (
                    <span className="bg-black/50 text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Image className="h-3 w-3" /> Photo
                    </span>
                  )}
                </div>
              </div>

              {/* Caption */}
              <Textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Add a caption..."
                className="resize-none min-h-[80px] text-sm"
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground text-right">
                {caption.length}/500
              </p>

              {/* Upload progress */}
              <AnimatePresence>
                {createPost.isPending && uploadProgress > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-1"
                  >
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Uploading...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <Progress value={uploadProgress} className="h-1.5" />
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleClose}
                  disabled={createPost.isPending}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleSubmit}
                  disabled={createPost.isPending}
                >
                  {createPost.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Posting...
                    </>
                  ) : (
                    "Share Post"
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
