import { Skeleton } from "@/components/ui/skeleton";

export default function RessursplanLoading() {
  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32 mt-1" />
        </div>
      </div>

      <div className="flex-1 p-4">
        <Skeleton className="h-12 w-full mb-2" />
        <Skeleton className="h-8 w-full mb-1" />
        {Array.from({ length: 15 }).map((_, i) => (
          <Skeleton key={i} className="h-7 w-full mb-0.5" />
        ))}
      </div>
    </div>
  );
}
