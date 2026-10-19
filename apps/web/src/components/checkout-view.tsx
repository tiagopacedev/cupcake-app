"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { LoadError } from "@/components/load-error";
import { Notice } from "@/components/notice";
import { OrderSummary, type SummaryLine } from "@/components/order-summary";
import { PickupInfo } from "@/components/pickup-info";
import { TextField } from "@/components/text-field";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api/client";
import { useCartStore } from "@/lib/cart-store";
import { interpretFailure, type CheckoutProblem } from "@/lib/checkout-errors";
import { validateName, validatePhone } from "@/lib/checkout-validation";
import { maskPhone } from "@/lib/phone-mask";
import { saveOrder } from "@/lib/recent-orders-store";
import { useCartRefresh } from "@/lib/use-cart-refresh";

/** Submit button shared by the mobile bar and the desktop summary: disabled with "Enviando…" while the order is in flight (US-11 AC5). */
function SubmitButton({ submitting }: { submitting: boolean }) {
  return (
    <Button type="submit" size="lg" className="h-12 w-full" disabled={submitting}>
      {submitting ? (
        <>
          <Loader2 className="animate-spin" aria-hidden={true} />
          Enviando…
        </>
      ) : (
        "Fazer pedido"
      )}
    </Button>
  );
}

/**
 * SCR-03 body (04-ui-design-system.md §7.3): Nome and Celular only (US-11 AC3),
 * pickup info, the order summary (never removed, US-13) and "Fazer pedido".
 * Refreshes the cart when it opens (US-10), redirects an empty cart to /cart
 * (US-11 AC4), validates on blur and on submit (US-12) and handles the API
 * errors of US-15 and US-19.
 */
/** Main landmark around every state of the checkout (loading, error, form). */
export function CheckoutView() {
  return (
    <main className="flex flex-1 flex-col">
      <CheckoutBody />
    </main>
  );
}

function CheckoutBody() {
  const router = useRouter();
  const refresh = useCartRefresh();
  const hydrated = useCartStore((state) => state.hydrated);
  const lines = useCartStore((state) => state.lines);
  const clearCart = useCartStore((state) => state.clear);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [touched, setTouched] = useState({ name: false, phone: false });
  const [serverErrors, setServerErrors] = useState<{ name?: string; phone?: string }>({});
  const [problem, setProblem] = useState<CheckoutProblem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const inFlight = useRef(false);
  const placed = useRef(false);
  const nameInput = useRef<HTMLInputElement>(null);
  const phoneInput = useRef<HTMLInputElement>(null);

  const emptyCart = hydrated && lines.length === 0;
  useEffect(() => {
    if (emptyCart && !placed.current) router.replace("/cart");
  }, [emptyCart, router]);

  if (!hydrated || emptyCart || refresh.status === "loading") {
    return (
      <div
        className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 px-4 pt-5"
        aria-busy="true"
      >
        <Skeleton className="h-8 w-40 bg-muted" />
        <Skeleton className="h-12 w-full bg-muted" />
        <Skeleton className="h-12 w-full bg-muted" />
      </div>
    );
  }
  if (refresh.status === "error") {
    return (
      <div className="mx-auto w-full max-w-6xl px-4">
        <LoadError onRetry={refresh.retry} />
      </div>
    );
  }

  const products = refresh.products;
  const nameOf = (productId: string) => products.get(productId)?.name ?? "Um item";
  const summaryLines: SummaryLine[] = lines.flatMap((line) => {
    const product = products.get(line.productId);
    return product
      ? [
          {
            id: product.id,
            name: product.name,
            imageUrl: product.imageUrl,
            quantity: line.quantity,
            unitPriceCents: product.priceCents,
          },
        ]
      : [];
  });

  const nameError = serverErrors.name ?? (touched.name ? validateName(name) : null);
  const phoneError = serverErrors.phone ?? (touched.phone ? validatePhone(phone) : null);

  async function submit() {
    if (inFlight.current) return;
    setTouched({ name: true, phone: true });
    setServerErrors({});
    const invalidName = validateName(name);
    const invalidPhone = validatePhone(phone);
    if (invalidName || invalidPhone) {
      (invalidName ? nameInput : phoneInput).current?.focus();
      return;
    }

    inFlight.current = true;
    setSubmitting(true);
    setProblem(null);
    try {
      const { data, error, response } = await api.POST("/api/orders", {
        body: {
          customer: { name: name.trim(), phone },
          items: lines.map((line) => ({ productId: line.productId, quantity: line.quantity })),
        },
      });
      if (data) {
        // Keep the button disabled while navigating: the order exists now.
        placed.current = true;
        saveOrder({ code: data.code, createdAt: data.createdAt });
        clearCart();
        router.replace(`/orders/${data.code}?new=1`);
        return;
      }
      const failure = interpretFailure(response.status, error, nameOf);
      setServerErrors(failure.fieldErrors);
      setProblem(failure.problem);
    } catch {
      setProblem({ kind: "network" });
    }
    inFlight.current = false;
    setSubmitting(false);
  }

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    void submit();
  };

  const notice = (() => {
    if (!problem) return null;
    if (problem.kind === "network") {
      return (
        <Notice
          tone="error"
          action={
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-input bg-background"
              onClick={() => void submit()}
            >
              Tentar de novo
            </Button>
          }
        >
          Não foi possível carregar. Verifique sua conexão.
        </Notice>
      );
    }
    return (
      <Notice
        tone="error"
        action={
          problem.kind === "rate" ? undefined : (
            <Button asChild variant="outline" size="sm" className="border-input bg-background">
              <Link href="/cart">Revisar</Link>
            </Button>
          )
        }
      >
        {problem.message}
      </Notice>
    );
  })();

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 pt-5 lg:grid lg:grid-cols-5 lg:items-start lg:gap-12 lg:px-6 lg:py-12"
    >
      <div className="flex flex-col gap-6 lg:col-span-3">
        <h1 className="hidden text-4xl font-extrabold tracking-tight lg:block">Finalizar pedido</h1>
        {notice}
        {refresh.notices.map((message) => (
          <Notice key={message}>{message}</Notice>
        ))}
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-bold">Seus dados</h2>
          <div className="flex flex-col gap-4 lg:grid lg:grid-cols-2 lg:gap-x-5">
            <TextField
              ref={nameInput}
              label="Nome"
              name="name"
              value={name}
              placeholder="Ex.: Maria Silva"
              autoComplete="name"
              maxLength={80}
              error={nameError}
              onChange={(event) => {
                setName(event.target.value);
                setServerErrors((current) => ({ ...current, name: undefined }));
              }}
              onBlur={() => setTouched((current) => ({ ...current, name: true }))}
            />
            <TextField
              ref={phoneInput}
              label="Celular"
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel-national"
              value={phone}
              placeholder="(11) 91234-5678"
              className="tabular-nums"
              error={phoneError}
              onChange={(event) => {
                setPhone(maskPhone(event.target.value));
                setServerErrors((current) => ({ ...current, phone: undefined }));
              }}
              onBlur={() => setTouched((current) => ({ ...current, phone: true }))}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Usamos seu nome e celular só para preparar e confirmar seu pedido na loja.
          </p>
        </section>
        <PickupInfo variant="checkout" />
      </div>

      <div className="contents lg:col-span-2 lg:block">
        <OrderSummary lines={summaryLines} variant="checkout" shortages={shortagesOf(problem)}>
          <div className="mt-2 hidden lg:block">
            <SubmitButton submitting={submitting} />
          </div>
        </OrderSummary>
        <div className="sticky bottom-0 mt-auto bg-background pt-3 pb-5 lg:hidden">
          <SubmitButton submitting={submitting} />
        </div>
      </div>
    </form>
  );
}

function shortagesOf(problem: CheckoutProblem | null): Record<string, number> {
  return problem?.kind === "stock" ? problem.shortages : {};
}
