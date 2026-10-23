"use client";

import { useRouter } from "next/navigation";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FILTER_CHIPS, hrefForFilter, type FilterKey } from "@/lib/filters";
import { cn } from "@/lib/utils";

/**
 * Filter chips (04-ui-design-system.md §6.3, US-02): one row, scrolls
 * horizontally on mobile with the scrollbar hidden, wraps on desktop. The
 * selected chip is the only indicator of the active filter (no heading). The
 * filter lives in the URL (`?filter=`), so reload and share keep it. The row
 * sticks just below the sticky header while the catalog scrolls (US-02 AC5;
 * `top-18`/`lg:top-20` = the header height); the
 * `-mt-1 pt-1` / `-mb-4 pb-4` pairs keeps the spacing of the approved layout while giving the
 * opaque background some margin over the cards scrolling beneath it.
 */
export function FilterChips({ selected }: { selected: FilterKey | null }) {
  const router = useRouter();

  return (
    <div
      role="group"
      aria-label="Filtrar cupcakes"
      className="sticky top-18 z-10 -mx-4 -mt-1 -mb-4 flex gap-2 overflow-x-auto bg-background px-4 pt-1 pb-4 [scrollbar-width:none] lg:top-20 lg:mx-0 lg:flex-wrap lg:px-0"
    >
      {FILTER_CHIPS.map(({ key, label }) => {
        const isSelected = key === selected;
        return (
          <Button
            key={label}
            type="button"
            variant="ghost"
            aria-pressed={isSelected}
            onClick={() => router.replace(hrefForFilter(key), { scroll: false })}
            className={cn(
              "h-10 shrink-0 border-input px-4 font-semibold",
              isSelected &&
                "bg-foreground text-background hover:bg-foreground/90 hover:text-background",
            )}
          >
            {key === "bestsellers" && <Star className="size-4" aria-hidden={true} />}
            {label}
          </Button>
        );
      })}
    </div>
  );
}
