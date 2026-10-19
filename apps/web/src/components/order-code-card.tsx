"use client";

import { useRef } from "react";
import { Copy, Share2 } from "lucide-react";
import { toast } from "sonner";
import { STORE } from "shared";
import { Button } from "@/components/ui/button";

/**
 * The order code block of Meu pedido (04-ui-design-system.md §6.11, US-16,
 * US-23): hint, the code large and centered, "Copiar código" and
 * "Compartilhar", and the meta line. Copying uses the Clipboard API with a
 * toast; when the clipboard is unavailable or refuses, the code text is
 * selected instead (US-16 AC3). Sharing opens the Web Share API sheet with the
 * code and the link; where it does not exist, the text and link are copied.
 */
export function OrderCodeCard({ code, meta }: { code: string; meta: string }) {
  const codeElement = useRef<HTMLParagraphElement>(null);

  function selectCode() {
    const selection = window.getSelection();
    if (selection && codeElement.current) selection.selectAllChildren(codeElement.current);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      toast("Código copiado");
    } catch {
      selectCode();
    }
  }

  async function share() {
    const url = `${window.location.origin}/orders/${code}`;
    const text = `Meu pedido ${code} na ${STORE.name}`;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: STORE.name, text, url });
        return;
      } catch (error) {
        // Closing the share sheet is not an error (US-23 AC3).
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(`${text}: ${url}`);
      toast("Link copiado");
    } catch {
      selectCode();
    }
  }

  return (
    <section className="flex flex-col items-center gap-1.5 rounded-lg border border-input py-5 text-center">
      <p className="text-xs text-muted-foreground">Mostre este código no balcão</p>
      <p ref={codeElement} className="text-3xl font-extrabold tracking-wider tabular-nums">
        {code}
      </p>
      <div className="flex items-center gap-1">
        <Button type="button" variant="ghost" size="sm" onClick={() => void copy()}>
          <Copy aria-hidden={true} />
          Copiar código
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => void share()}>
          <Share2 aria-hidden={true} />
          Compartilhar
        </Button>
      </div>
      <p className="text-sm text-muted-foreground tabular-nums">{meta}</p>
    </section>
  );
}
