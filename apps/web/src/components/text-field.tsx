import type { ComponentProps } from "react";
import { useId } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/**
 * Label + input + error message (04-ui-design-system.md §6.8). 16 px text avoids
 * the iOS zoom on focus; the error is tied to the input with `aria-describedby`.
 */
export function TextField({
  label,
  error,
  className,
  ...inputProps
}: { label: string; error?: string | null } & Omit<ComponentProps<typeof Input>, "id">) {
  const id = useId();
  const errorId = `${id}-error`;
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="text-sm font-semibold">
        {label}
      </Label>
      <Input
        id={id}
        className={cn("h-12 text-base", className)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        {...inputProps}
      />
      {error && (
        <p id={errorId} className="text-sm font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
