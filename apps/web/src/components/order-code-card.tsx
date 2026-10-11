"use client";

import { useRef } from "react";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

/**
 * The order code block of Meu pedido (04-ui-design-system.md §6.11, US-16):
 * hint, the code large and centered, "Copiar código" and the meta line.
 * Copying uses the Clipboard API with a toast; when the clipboard is
 * unavailable or refuses, the code text is selected instead (AC3).
 */
export function OrderCodeCard({ code, meta }: { code: string; meta: string }) {
  const codeElement = useRef<HTMLParagraphElement>(null);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      toast("Código copiado");
    } catch {
      const selection = window.getSelection();
      if (selection && codeElement.current) selection.selectAllChildren(codeElement.current);
    }
  }

  return (
    <section className="flex flex-col items-center gap-1.5 rounded-lg border border-input py-5 text-center">
      <p className="text-xs text-muted-foreground">Mostre este código no balcão</p>
      <p ref={codeElement} className="text-3xl font-extrabold tracking-wider tabular-nums">
        {code}
      </p>
      <Button type="button" variant="ghost" size="sm" onClick={() => void copy()}>
        <Copy aria-hidden={true} />
        Copiar código
      </Button>
      <p className="text-sm text-muted-foreground tabular-nums">{meta}</p>
    </section>
  );
}
