import { expect, test as base, type Page } from "@playwright/test";
import { db } from "./db.js";

/** `test` with a database reset before every test (one shared database, one worker). */
export const test = base.extend<{ db: typeof db }>({
  db: [
    // Playwright fixtures must destructure their first argument, even when empty.
    // eslint-disable-next-line no-empty-pattern
    async ({}, use) => {
      await db.reset();
      await use(db);
    },
    { auto: true },
  ],
});

export { expect };

/** Prices are formatted with a non-breaking space (`R$ 11,90`). */
export const price = (amount: string) => new RegExp(`R\\$\\s${amount}`);

/** Adds `times` units of a product from the catalog card ("+", then the stepper's "+"). */
export async function addFromCatalog(page: Page, name: string, times: number): Promise<void> {
  await page.getByRole("button", { name: `Adicionar ${name}` }).click();
  const stepper = page.getByRole("group", { name: `Quantidade de ${name}` });
  for (let unit = 1; unit < times; unit += 1) {
    await stepper.getByRole("button", { name: "Aumentar" }).click();
  }
}

/** Puts products straight into the browser cart (ids come from the API), then leaves the page on `/`. */
export async function seedCart(
  page: Page,
  items: { slug: string; quantity: number }[],
): Promise<void> {
  const response = await page.request.get("/api/products");
  const { products } = (await response.json()) as { products: { id: string; slug: string }[] };
  const lines = items.map((item) => ({
    productId: products.find((product) => product.slug === item.slug)?.id ?? "",
    quantity: item.quantity,
  }));
  await page.goto("/");
  await page.evaluate(
    (value) => localStorage.setItem("cupcake.cart", JSON.stringify(value)),
    lines,
  );
}

export async function fillCustomer(page: Page, name: string, phone: string): Promise<void> {
  await page.getByLabel("Nome").fill(name);
  await page.getByLabel("Celular").fill(phone);
}

/** Places an order through the API (as a customer's browser would) and returns its code. */
export async function createOrderViaApi(
  page: Page,
  items: { slug: string; quantity: number }[],
): Promise<string> {
  const products = (await (await page.request.get("/api/products")).json()) as {
    products: { id: string; slug: string }[];
  };
  const response = await page.request.post("/api/orders", {
    data: {
      customer: { name: "Ana Souza", phone: "(11) 91234-5678" },
      items: items.map((item) => ({
        productId: products.products.find((product) => product.slug === item.slug)?.id,
        quantity: item.quantity,
      })),
    },
  });
  return ((await response.json()) as { code: string }).code;
}
