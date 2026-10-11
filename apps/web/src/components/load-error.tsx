import { CircleAlert } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { RetryButton } from "@/components/retry-button";

/** Failure state of any data screen (04-ui-design-system.md §7.1, §9.1 `catalog.error`). */
export function LoadError({ onRetry }: { onRetry?: () => void }) {
  return (
    <div role="alert">
      <EmptyState
        icon={CircleAlert}
        tone="error"
        title="Não foi possível carregar"
        description="Verifique sua conexão."
      >
        <RetryButton onRetry={onRetry} />
      </EmptyState>
    </div>
  );
}
