/**
 * The order code block of Meu pedido (04-ui-design-system.md §6.11, US-16):
 * hint, the code large and centered, and the meta line. No copy or share
 * action (owner decision, 22 Oct 2026, G-13).
 */
export function OrderCodeCard({ code, meta }: { code: string; meta: string }) {
  return (
    <section className="flex flex-col items-center gap-1.5 rounded-lg border border-input py-5 text-center">
      <p className="text-xs text-muted-foreground">Mostre este código no balcão</p>
      <p className="text-3xl font-extrabold tracking-wider tabular-nums">{code}</p>
      <p className="text-sm text-muted-foreground tabular-nums">{meta}</p>
    </section>
  );
}
