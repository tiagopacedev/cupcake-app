import { createOrderViaApi, expect, price, seedCart, test } from "../support/test.js";

/** Acceptance criteria that 05 §5 assigns to the E level beyond the five journeys. */

test("US-02 AC4: a reload keeps the selected filter", async ({ page }) => {
  await page.goto("/?filter=fruity");
  await expect(page.getByRole("heading", { name: "Strawberry Kiss" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Chocolate Crush" })).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("button", { name: "Frutados" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.getByRole("heading", { name: "Strawberry Kiss" })).toBeVisible();
});

test("US-01 / US-04: the catalog shows every state from the seed", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 2 })).toHaveCount(6);
  await expect(page.getByText("Restam 3")).toBeVisible(); // Cookies & Cream
  await expect(page.getByText("Esgotado")).toBeVisible(); // Lemon Cream
  await expect(page.getByRole("button", { name: "Adicionar Lemon Cream" })).toHaveCount(0);
  await expect(page.getByText("Mais vendido", { exact: true })).toHaveCount(3);
});

test("US-06 / US-10: the cart survives a reload and stops at the stock limit", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Adicionar Cookies & Cream" }).click(); // stock 3
  const stepper = page.getByRole("group", { name: "Quantidade de Cookies & Cream" });
  await stepper.getByRole("button", { name: "Aumentar" }).click();
  await stepper.getByRole("button", { name: "Aumentar" }).click();
  await expect(stepper.getByRole("button", { name: "Aumentar" })).toBeDisabled();
  await expect(page.getByText("Máximo disponível.")).toBeVisible();

  await page.reload();
  await expect(page.getByRole("link", { name: "Carrinho, 3 itens" })).toBeVisible();
  await expect(stepper).toContainText("3");
});

test("US-08 AC2 / AC4: an empty cart offers a way back, checkout redirects to the cart", async ({
  page,
}) => {
  await page.goto("/cart");
  await expect(page.getByRole("heading", { name: "Carrinho vazio" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Continuar" })).toHaveCount(0);
  await page.goto("/checkout");
  await expect(page).toHaveURL(/\/cart$/);
});

test("US-09: removing an item asks for confirmation", async ({ page }) => {
  await seedCart(page, [
    { slug: "chocolate-crush", quantity: 2 },
    { slug: "birthday-vanilla", quantity: 1 },
  ]);
  await page.goto("/cart");
  await page.getByRole("button", { name: "Remover Birthday Vanilla" }).click();
  await expect(page.getByText("Remover Birthday Vanilla?")).toBeVisible();
  await page.getByRole("button", { name: "Cancelar" }).click();
  await expect(page.getByRole("heading", { name: "Birthday Vanilla" })).toBeVisible();

  await page.getByRole("button", { name: "Remover Birthday Vanilla" }).click();
  await page.getByRole("button", { name: "Remover", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Birthday Vanilla" })).toHaveCount(0);
  await expect(page.getByText(price("23,80")).first()).toBeVisible();
});

test("US-18 / US-20: an order opens by its code, in lowercase too, with no phone", async ({
  page,
}) => {
  const code = await createOrderViaApi(page, [
    { slug: "chocolate-crush", quantity: 2 },
    { slug: "birthday-vanilla", quantity: 1 },
  ]);
  await page.goto(`/orders/${code.toLowerCase()}`);
  await expect(page.getByText(code).first()).toBeVisible();
  await expect(page.getByText("Pedido feito!")).toHaveCount(0);
  await expect(page.getByText("Chocolate Crush")).toBeVisible();
  await expect(page.getByText("Birthday Vanilla")).toBeVisible();
  await expect(page.getByText("Total a pagar na loja")).toBeVisible();
  await expect(page.getByText("Onde retirar")).toBeVisible();
  const text = await page.locator("body").innerText();
  expect(text).not.toMatch(/\+55|91234|Souza/);
});

test("US-22 AC4: a stored code the server doesn't know is removed", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() =>
    localStorage.setItem(
      "cupcake.lastOrder",
      JSON.stringify({ code: "CUP-ZZZZZZ", createdAt: new Date().toISOString() }),
    ),
  );
  await page.reload();
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("cupcake.lastOrder")))
    .toBeNull();
  await expect(page.getByRole("link", { name: /Seu pedido/ })).toHaveCount(0);
});

test("US-22 AC3: a stored order from a previous day shows no card", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() =>
    localStorage.setItem(
      "cupcake.lastOrder",
      JSON.stringify({ code: "CUP-ABCDEF", createdAt: "2020-01-01T15:00:00.000Z" }),
    ),
  );
  await page.reload();
  await expect(page.getByRole("heading", { level: 2 })).toHaveCount(6);
  await expect(page.getByRole("link", { name: /Seu pedido/ })).toHaveCount(0);
});

test("US-14 AC3 / NFR-12: no payment field or status anywhere in the journey", async ({ page }) => {
  await seedCart(page, [{ slug: "chocolate-crush", quantity: 1 }]);
  const forbidden = /pix|cartão|cartao|boleto|cvv|crédito|débito|\bpago\b/i;
  for (const path of ["/", "/cart", "/checkout"]) {
    await page.goto(path);
    await expect(page.locator("main").first()).toBeVisible();
    expect(await page.locator("body").innerText()).not.toMatch(forbidden);
    await expect(page.locator('input[autocomplete^="cc-"]')).toHaveCount(0);
  }
});

test("US-02 AC5: the filter chips stay at the top of the screen while the catalog scrolls", async ({
  page,
}) => {
  await page.goto("/");
  const chips = page.getByRole("group", { name: "Filtrar cupcakes" });
  await expect(chips).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  // The sticky header sits at the top; the chips pin directly below it.
  const header = page.locator("header").first();
  await expect.poll(async () => (await header.boundingBox())?.y ?? 9999).toBeLessThanOrEqual(1);
  await expect
    .poll(async () => {
      const [bar, row] = await Promise.all([header.boundingBox(), chips.boundingBox()]);
      return Math.abs((row?.y ?? 9999) - ((bar?.y ?? 0) + (bar?.height ?? 0)));
    })
    .toBeLessThanOrEqual(2);
  await expect(chips).toBeInViewport();

  // Still usable from down the page.
  await chips.getByRole("button", { name: "Chocolate", exact: true }).click();
  await expect(page).toHaveURL(/\?filter=chocolate$/);
});

test("US-01: every product photo loads (a broken image shows only its alt text)", async ({
  page,
}) => {
  await page.goto("/");
  const photos = page.locator("article img");
  await expect(photos).toHaveCount(6);
  for (let index = 0; index < 6; index += 1) {
    const photo = photos.nth(index);
    await photo.scrollIntoViewIfNeeded();
    await expect
      .poll(() => photo.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0))
      .toBe(true);
  }
});
