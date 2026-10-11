import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * US-14 AC3 / NFR-12 / BR-09: the app takes and simulates no payment, so no
 * payment fields, payment codes or "paid" statuses may appear in any user-
 * facing source. "Pagamento na loja" and "Total a pagar na loja" are the only
 * payment wording allowed. Scans every non-test source file of the web app.
 */
const srcDir = import.meta.dirname;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return entry === "api" ? [] : sourceFiles(path);
    const isSource = /\.(ts|tsx)$/.test(entry) && !/\.test\.(ts|tsx)$/.test(entry);
    return isSource && !path.includes("test-utils") ? [path] : [];
  });
}

const FORBIDDEN =
  /\b(pix|boleto|cvv|cvc|paypal|stripe|mercado\s?pago)\b|cart[ãa]o de (cr[ée]dito|d[ée]bito)|n[úu]mero do cart[ãa]o|c[óo]digo de seguran[çc]a|pagamento (online|aprovado|confirmado|recusado)|\bpago\b|\bpaga\b|\bpaid\b|payment|checkout\.session/i;

describe("US-14 AC3 / NFR-12 no payment UI anywhere", () => {
  const files = sourceFiles(srcDir);

  it("scans the application sources", () => {
    expect(files.length).toBeGreaterThan(20);
  });

  it.each(files.map((file) => [file.slice(srcDir.length + 1), file]))(
    "%s has no payment wording or fields",
    (_name, file) => {
      const text = readFileSync(file as string, "utf8");
      expect(text.match(FORBIDDEN)?.[0]).toBeUndefined();
    },
  );

  it("keeps the two approved payment-at-store phrases", () => {
    const all = files.map((file) => readFileSync(file, "utf8")).join("\n");
    expect(all).toContain("Pagamento na loja");
    expect(all).toContain("Total a pagar na loja");
  });
});
