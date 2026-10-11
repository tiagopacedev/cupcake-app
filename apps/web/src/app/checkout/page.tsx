import { AppHeader } from "@/components/app-header";
import { CheckoutView } from "@/components/checkout-view";

/** SCR-03 Finalizar pedido (docs/04-ui-design-system.md §7.3). The cart lives in the browser, so the body is a client component. */
export default function CheckoutPage() {
  return (
    <>
      <AppHeader variant="checkout" />
      <CheckoutView />
    </>
  );
}
