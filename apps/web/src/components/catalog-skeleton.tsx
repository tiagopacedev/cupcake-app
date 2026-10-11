import { Skeleton } from "@/components/ui/skeleton";

/** Loading state mirroring the catalog layout (04-ui-design-system.md §6.15, ref 07 "Catálogo · carregando"). */
export function CatalogSkeleton() {
  return (
    <div aria-busy="true" className="flex flex-col gap-5">
      <Skeleton className="h-12 w-3/4 bg-muted lg:max-w-md" />
      <div className="flex gap-2">
        <Skeleton className="h-10 w-20 bg-muted" />
        <Skeleton className="h-10 w-36 bg-muted" />
        <Skeleton className="h-10 w-28 bg-muted" />
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-6 lg:grid-cols-3 lg:gap-x-6 lg:gap-y-10">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="flex min-w-0 flex-col gap-3">
            <Skeleton className="aspect-square w-full bg-muted" />
            <Skeleton className="h-5 w-4/5 bg-muted" />
            <Skeleton className="h-5 w-1/3 bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}
