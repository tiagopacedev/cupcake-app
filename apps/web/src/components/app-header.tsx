import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { STORE } from "shared";
import { Button } from "@/components/ui/button";
import { ConnectedCartLink } from "@/components/connected-cart-link";

type AppHeaderProps =
  | { variant: "catalog" }
  | { variant: "inner"; title: string; backHref: string; backLabel?: string };

/**
 * App header (04-ui-design-system.md §6.1). `catalog`: wordmark and cart
 * button, centered in the desktop container. `inner`: back arrow and page
 * title. No history or account icon, by design.
 */
export function AppHeader(props: AppHeaderProps) {
  if (props.variant === "inner") {
    return (
      <header className="flex items-center gap-1 border-b py-2 pr-4 pl-2">
        <Button asChild variant="ghost" size="icon" className="size-11">
          <Link href={props.backHref} aria-label={props.backLabel ?? "Voltar"}>
            <ArrowLeft className="size-5" aria-hidden="true" />
          </Link>
        </Button>
        <h1 className="text-xl font-extrabold tracking-tight">{props.title}</h1>
      </header>
    );
  }

  return (
    <header className="border-b">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 lg:px-6 lg:py-4">
        <Link href="/" className="text-xl font-extrabold tracking-tight lg:text-2xl">
          {STORE.name}
        </Link>
        <ConnectedCartLink />
      </div>
    </header>
  );
}
