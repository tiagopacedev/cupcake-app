"use client";

import { useEffect } from "react";
import { STORE } from "shared";
import { Notice } from "@/components/notice";
import { formatReadyLabel } from "@/lib/format";

/**
 * "Pedido feito! Pronto em ~15 min." or, outside opening hours, "Pedido feito!
 * Pronto amanhã às 10:15." (04-ui-design-system.md §7.4, BR-12). Rendered only
 * for `?new=1`; once shown, the flag is removed from the URL (without a
 * navigation, so the notice stays) so a reload or a later visit shows the
 * reopened order (US-18 AC3).
 */
export function OrderSuccessNotice({ createdAt, readyAt }: { createdAt: string; readyAt: string }) {
  useEffect(() => {
    window.history.replaceState(window.history.state, "", window.location.pathname);
  }, []);

  return (
    <Notice tone="success">
      <strong className="font-bold">Pedido feito!</strong>{" "}
      {formatReadyLabel(readyAt, new Date(createdAt), STORE.readyMinutes)}.
    </Notice>
  );
}
