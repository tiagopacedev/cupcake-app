"use client";

import { useEffect } from "react";
import { STORE } from "shared";
import { Notice } from "@/components/notice";

/**
 * "Pedido feito! Pronto em ~15 min." (04-ui-design-system.md §7.4). Rendered
 * only for `?new=1`; once shown, the flag is removed from the URL (without a
 * navigation, so the notice stays) so a reload or a later visit shows the
 * reopened order (US-18 AC3).
 */
export function OrderSuccessNotice() {
  useEffect(() => {
    window.history.replaceState(window.history.state, "", window.location.pathname);
  }, []);

  return (
    <Notice tone="success">
      <strong className="font-bold">Pedido feito!</strong> Pronto em ~{STORE.readyMinutes} min.
    </Notice>
  );
}
