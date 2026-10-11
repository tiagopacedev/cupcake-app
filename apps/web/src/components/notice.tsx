import type { ReactNode } from "react";
import { CircleAlert } from "lucide-react";
import { Alert } from "@/components/ui/alert";

/**
 * One-line notice (04-ui-design-system.md §6.12). Only the warning tone is
 * needed so far (stock adjusted, E5-11); success and error arrive with the
 * checkout and Meu pedido screens. Status changes use `role="status"` (§8.5).
 */
export function Notice({ children }: { children: ReactNode }) {
  return (
    <Alert role="status" className="border-0 bg-amber-100">
      <CircleAlert className="text-amber-800" aria-hidden={true} />
      <div className="col-start-2">{children}</div>
    </Alert>
  );
}
