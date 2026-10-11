import type { ReactNode } from "react";
import { Check, CircleAlert } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

type Tone = "success" | "warning" | "error";

const TONES: Record<Tone, { alert: string; icon: string }> = {
  success: { alert: "border-0 bg-emerald-50", icon: "text-emerald-700" },
  warning: { alert: "border-0 bg-amber-100", icon: "text-amber-800" },
  error: { alert: "border-0 bg-destructive/10", icon: "text-destructive" },
};

/**
 * One-line notice (04-ui-design-system.md §6.12), tone by palette classes with
 * an optional action button at the right. Status changes use `role="status"`
 * (success, warning), blocking errors `role="alert"` (§8.5).
 */
export function Notice({
  tone = "warning",
  action,
  children,
}: {
  tone?: Tone;
  action?: ReactNode;
  children: ReactNode;
}) {
  const Icon = tone === "success" ? Check : CircleAlert;
  return (
    <Alert
      role={tone === "error" ? "alert" : "status"}
      variant={tone === "error" ? "destructive" : "default"}
      className={cn(TONES[tone].alert, action && "items-center")}
    >
      <Icon className={TONES[tone].icon} aria-hidden={true} />
      <div className="col-start-2 flex items-center justify-between gap-3">
        <div className="min-w-0 text-foreground">{children}</div>
        {action}
      </div>
    </Alert>
  );
}
