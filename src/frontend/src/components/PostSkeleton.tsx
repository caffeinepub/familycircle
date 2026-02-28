import { Skeleton } from "@/components/ui/skeleton";

export function PostSkeleton() {
  return (
    <div className="bg-card rounded-2xl overflow-hidden shadow-card border border-border/50">
      <div className="flex items-center gap-3 px-4 py-3">
        <Skeleton className="h-8 w-8 rounded-full" />
        <div className="space-y-1.5">
          <Skeleton className="h-3.5 w-28" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
      <Skeleton className="w-full h-64" />
      <div className="px-4 py-3 space-y-1.5">
        <Skeleton className="h-3.5 w-full" />
        <Skeleton className="h-3.5 w-3/4" />
      </div>
    </div>
  );
}

const SKELETON_KEYS = ["sk-0", "sk-1", "sk-2"];

export function FeedSkeleton() {
  return (
    <div className="space-y-4">
      {SKELETON_KEYS.map((key) => (
        <PostSkeleton key={key} />
      ))}
    </div>
  );
}
