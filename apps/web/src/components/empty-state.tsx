import type { ComponentType, ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Icon tile, title, one line and one action (04-ui-design-system.md §6.15). */
export function EmptyState({
  icon: Icon,
  tone = "default",
  title,
  description,
  children,
}: {
  icon: ComponentType<{ className?: string }>;
  tone?: "default" | "error";
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <div
        className={cn(
          "flex size-16 items-center justify-center rounded-lg",
          tone === "error" ? "bg-destructive/10 text-destructive" : "bg-secondary",
        )}
      >
        <Icon className="size-7" aria-hidden={true} />
      </div>
      <h2 className="text-xl font-bold">{title}</h2>
      <p className="text-muted-foreground">{description}</p>
      {children}
    </div>
  );
}
