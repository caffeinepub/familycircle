import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { UserProfile } from "../backend";
import { getInitials } from "../utils/media";

interface UserAvatarProps {
  profile: UserProfile | null | undefined;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeMap = {
  xs: "h-6 w-6 text-[10px]",
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-base",
  xl: "h-20 w-20 text-xl",
};

export function UserAvatar({
  profile,
  size = "md",
  className,
}: UserAvatarProps) {
  const fallback = profile ? getInitials(profile.username) : "?";
  const photoUrl = profile?.profilePhoto?.getDirectURL();

  return (
    <Avatar className={cn(sizeMap[size], "ring-2 ring-border/40", className)}>
      {photoUrl && <AvatarImage src={photoUrl} alt={profile?.username} />}
      <AvatarFallback className="bg-primary/10 text-primary font-display font-semibold">
        {fallback}
      </AvatarFallback>
    </Avatar>
  );
}
