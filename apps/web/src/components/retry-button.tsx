"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

/**
 * "Tentar de novo". Server-rendered screens re-run their server component
 * (default); client-fetched screens pass their own `onRetry`.
 */
export function RetryButton({ onRetry }: { onRetry?: () => void }) {
  const router = useRouter();
  return (
    <Button size="lg" className="h-12" onClick={onRetry ?? (() => router.refresh())}>
      Tentar de novo
    </Button>
  );
}
