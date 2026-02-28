import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import type { Notification } from "../backend";
import { NotificationType } from "../backend";
import {
  useGetNotifications,
  useGetUserProfile,
  useMarkAllNotificationsRead,
} from "../hooks/useQueries";
import { formatRelativeTime } from "../utils/time";
import { UserAvatar } from "./UserAvatar";

const NOTIFICATION_SKELETON_KEYS = ["ns-0", "ns-1", "ns-2"];

function NotificationItem({ notification }: { notification: Notification }) {
  const navigate = useNavigate();
  const { data: relatedProfile } = useGetUserProfile(notification.relatedUser);

  const getMessage = () => {
    const username = relatedProfile?.username ?? "Someone";
    switch (notification.notificationType) {
      case NotificationType.friendRequestReceived:
        return `${username} sent you a friend request`;
      case NotificationType.friendRequestAccepted:
        return `${username} accepted your friend request`;
      case NotificationType.newPostFromFriend:
        return `${username} shared a new post`;
      default:
        return "New notification";
    }
  };

  const handleClick = () => {
    switch (notification.notificationType) {
      case NotificationType.friendRequestReceived:
        navigate({ to: "/friends" });
        break;
      case NotificationType.friendRequestAccepted:
        if (relatedProfile?.username) {
          navigate({
            to: "/profile/$username",
            params: { username: relatedProfile.username },
          });
        }
        break;
      case NotificationType.newPostFromFriend:
        if (notification.postId !== undefined) {
          navigate({
            to: "/post/$postId",
            params: { postId: notification.postId.toString() },
          });
        }
        break;
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-muted/60 transition-colors ${
        !notification.read ? "bg-primary/5" : ""
      }`}
    >
      <UserAvatar profile={relatedProfile} size="sm" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground leading-snug">{getMessage()}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {formatRelativeTime(notification.createdAt)}
        </p>
      </div>
      {!notification.read && (
        <div className="mt-1.5 h-2 w-2 rounded-full bg-primary flex-shrink-0" />
      )}
    </button>
  );
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { data: notifications, isLoading } = useGetNotifications();
  const markRead = useMarkAllNotificationsRead();

  const unreadCount = notifications?.filter((n) => !n.read).length ?? 0;
  const doMarkRead = markRead.mutate;

  useEffect(() => {
    if (open && unreadCount > 0) {
      doMarkRead();
    }
  }, [open, unreadCount, doMarkRead]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 rounded-full"
          aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
        >
          <Bell className="h-5 w-5" />
          <AnimatePresence>
            {unreadCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute -top-0.5 -right-0.5 h-4 min-w-4 rounded-full bg-primary flex items-center justify-center"
              >
                <span className="text-[10px] font-bold text-primary-foreground px-0.5 leading-none">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              </motion.span>
            )}
          </AnimatePresence>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-80 p-0 rounded-2xl shadow-card-hover border-border/50"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
          <h3 className="font-display font-semibold text-sm">Notifications</h3>
          {unreadCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {unreadCount} new
            </Badge>
          )}
        </div>
        <ScrollArea className="max-h-[360px]">
          {isLoading ? (
            <div className="space-y-1 p-2">
              {NOTIFICATION_SKELETON_KEYS.map((key) => (
                <div key={key} className="flex items-center gap-3 px-2 py-2">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-3.5 w-full" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
              ))}
            </div>
          ) : notifications && notifications.length > 0 ? (
            <div className="divide-y divide-border/30">
              {notifications
                .slice()
                .sort((a, b) => Number(b.createdAt - a.createdAt))
                .map((n) => (
                  <NotificationItem key={n.id.toString()} notification={n} />
                ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center px-4">
              <Bell className="h-8 w-8 text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">
                No notifications yet
              </p>
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
