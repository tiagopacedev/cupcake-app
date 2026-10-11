"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

/** "Tentar de novo": re-runs the server component that failed to load its data. */
export function RetryButton() {
  const router = useRouter();
  return (
    <Button size="lg" className="h-12" onClick={() => router.refresh()}>
      Tentar de novo
    </Button>
  );
}
