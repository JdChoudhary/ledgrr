import { Skeleton } from "@/components/ui/skeleton";

export function NetWorthLoading() {
  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-5">
      <Skeleton className="h-8 w-48 rounded-md" />
      <Skeleton className="h-32 rounded-2xl" />
      <div className="grid grid-cols-3 gap-3">
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-24 rounded-2xl" />
      </div>
      <Skeleton className="h-80 rounded-2xl" />
    </div>
  );
}
