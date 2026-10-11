import { AppHeader } from "@/components/app-header";
import { CartView } from "@/components/cart-view";

/** SCR-02 Carrinho (docs/04-ui-design-system.md §7.2). The cart lives in the browser, so the body is a client component. */
export default function CartPage() {
  return (
    <>
      <AppHeader variant="inner" title="Carrinho" backHref="/" />
      <CartView />
    </>
  );
}
