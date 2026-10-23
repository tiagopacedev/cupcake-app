import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { STORE } from "shared";
import { Button } from "@/components/ui/button";
import { ConnectedCartLink } from "@/components/connected-cart-link";

type AppHeaderProps =
  | { variant: "catalog" }
  | { variant: "checkout" }
  | { variant: "inner"; title: string; backHref: string; backLabel?: string };

/**
 * App header (04-ui-design-system.md §6.1). `catalog`: wordmark and cart
 * button, centered in the desktop container. `inner`: back arrow and page
 * title, in the same `max-w-6xl` container as the catalog header. `checkout`: the inner header on mobile; on desktop the wordmark and
 * "Continuar comprando" instead of the cart. No history or account icon, by design. Every variant is sticky; the
 * catalog header has a fixed height (`h-18`, `lg:h-20`) so the filter chips can
 * stick exactly below it (`top-18`, `lg:top-20`). The wordmark is the store name from
 * the shared STORE config.
 */
export function AppHeader(props: AppHeaderProps) {
  if (props.variant === "checkout") {
    return (
      <header className="sticky top-0 z-20 bg-background">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-1 py-2 pr-4 pl-2 lg:hidden">
          <Button asChild variant="ghost" size="icon" className="size-11">
            <Link href="/cart" aria-label="Voltar">
              <ArrowLeft className="size-5" aria-hidden="true" />
            </Link>
          </Button>
          <h1 className="text-xl font-extrabold tracking-tight">Finalizar pedido</h1>
        </div>
        <div className="mx-auto hidden w-full max-w-6xl items-center justify-between gap-3 px-6 py-4 lg:flex">
          <Link href="/" className="text-2xl font-extrabold tracking-tight">
            {STORE.name}
          </Link>
          <Button asChild variant="ghost">
            <Link href="/">
              <ArrowLeft className="size-4" aria-hidden="true" />
              Continuar comprando
            </Link>
          </Button>
        </div>
      </header>
    );
  }

  if (props.variant === "inner") {
    return (
      <header className="sticky top-0 z-20 bg-background">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-1 py-2 pr-4 pl-2 lg:px-6">
          <Button asChild variant="ghost" size="icon" className="size-11">
            <Link href={props.backHref} aria-label={props.backLabel ?? "Voltar"}>
              <ArrowLeft className="size-5" aria-hidden="true" />
            </Link>
          </Button>
          <h1 className="text-xl font-extrabold tracking-tight">{props.title}</h1>
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-20 h-18 bg-background lg:h-20">
      <div className="mx-auto flex h-full w-full max-w-6xl items-center justify-between gap-3 px-4 lg:px-6">
        <Link href="/" className="text-xl font-extrabold tracking-tight lg:text-2xl">
          {STORE.name}
        </Link>
        <ConnectedCartLink />
      </div>
    </header>
  );
}
