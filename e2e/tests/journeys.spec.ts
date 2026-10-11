import { addFromCatalog, expect, fillCustomer, price, seedCart, test } from "../support/test.js";

/**
 * The five journeys of 05-testing-strategy.md §3.6, on both projects (mobile
 * 390 px and desktop 1280 px). Each test starts from a freshly seeded database.
 */
const CODE = /CUP-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{6}/;

test.describe("E2E-1 purchase journey", () => {
  test("filter, add, cart, checkout, place the order, reopen it", async ({ page, db }) => {
    await page.goto("/");

    // US-02: filter Chocolate; the URL carries the filter and no heading repeats it.
    await page.getByRole("button", { name: "Chocolate", exact: true }).click();
    await expect(page).toHaveURL(/\?filter=chocolate$/);
    await expect(page.getByRole("heading", { name: "Chocolate Crush" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Birthday Vanilla" })).toHaveCount(0);

    // US-05: 2 x Chocolate Crush.
    await addFromCatalog(page, "Chocolate Crush", 2);
    await expect(page.getByRole("link", { name: "Carrinho, 2 itens" })).toBeVisible();

    // Cart (US-08) and checkout (US-11).
    await page.getByRole("link", { name: "Carrinho, 2 itens" }).click();
    await expect(page).toHaveURL(/\/cart$/);
    await expect(page.getByText(price("23,80")).first()).toBeVisible();
    await page.getByRole("link", { name: "Continuar" }).click();
    await expect(page).toHaveURL(/\/checkout$/);
    await expect(page.getByText("Pagamento na loja")).toBeVisible();

    await fillCustomer(page, "Ana Souza", "11912345678");
    await expect(page.getByLabel("Celular")).toHaveValue("(11) 91234-5678");
    await page.getByRole("button", { name: "Fazer pedido" }).click();

    // Meu pedido (US-15, US-16, US-14).
    await expect(page).toHaveURL(/\/orders\/CUP-/);
    await expect(page.getByText("Pedido feito!")).toBeVisible();
    const code = (await page.getByText(CODE).first().textContent())?.match(CODE)?.[0] ?? "";
    expect(code).toMatch(CODE);
    await expect(page.getByText("Chocolate Crush")).toBeVisible();
    await expect(page.getByText(/2 × R\$\s11,90/)).toBeVisible();
    await expect(page.getByText("Total a pagar na loja")).toBeVisible();
    await expect(page.getByText(price("23,80")).first()).toBeVisible();
    await expect(page.getByText(/^Ana · /)).toBeVisible();
    expect(await db.stockOf("chocolate-crush")).toBe(33);

    // US-18 AC3: a refresh shows the reopened order, without the notice.
    await page.reload();
    await expect(page.getByText(code).first()).toBeVisible();
    await expect(page.getByText("Pedido feito!")).toHaveCount(0);

    // US-22: back home, the latest-order card is there and opens the order.
    await page.getByRole("main").getByRole("link", { name: "Voltar ao início" }).click();
    const card = page.getByRole("link", {
      name: new RegExp(`Seu pedido ${code}, aguardando retirada`),
    });
    await expect(card).toBeVisible();
    await card.click();
    await expect(page).toHaveURL(new RegExp(`/orders/${code}$`));
    await expect(page.getByText("Pedido feito!")).toHaveCount(0);
  });
});

test.describe("E2E-2 stock conflict", () => {
  test("ordering 2 when 1 is left shows the notice and 'Revisar' fixes the cart", async ({
    page,
    db,
  }) => {
    await seedCart(page, [{ slug: "chocolate-crush", quantity: 2 }]);
    await page.goto("/checkout");
    await expect(page.getByRole("heading", { name: "Resumo do pedido" })).toBeVisible();

    // Someone else buys all but one unit after the checkout opened.
    await db.setStock("chocolate-crush", 1);
    await fillCustomer(page, "Ana Souza", "11912345678");
    await page.getByRole("button", { name: "Fazer pedido" }).click();

    // Next.js also renders a (hidden) route announcer with role="alert".
    const notice = page.getByRole("alert").filter({ hasText: "só 1 disponível" });
    await expect(notice).toContainText("Chocolate Crush: só 1 disponível.");
    await expect(page.getByText(/2 × R\$\s11,90 · só 1 disponível/)).toBeVisible();
    expect(await db.countOrders()).toBe(0);
    expect(await db.stockOf("chocolate-crush")).toBe(1);

    await notice.getByRole("link", { name: "Revisar" }).click();
    await expect(page).toHaveURL(/\/cart$/);
    await expect(
      page.getByText("Chocolate Crush: só 1 disponível. Quantidade ajustada."),
    ).toBeVisible();
    await expect(page.getByRole("group", { name: "Quantidade de Chocolate Crush" })).toContainText(
      "1",
    );
  });
});

test.describe("E2E-3 invalid data", () => {
  test("shows the field messages and creates no order", async ({ page, db }) => {
    await seedCart(page, [{ slug: "birthday-vanilla", quantity: 1 }]);
    await page.goto("/checkout");

    await page.getByRole("button", { name: "Fazer pedido" }).click();
    await expect(page.getByText("Informe seu nome.")).toBeVisible();
    await expect(page.getByText("Celular inválido. Ex.: (11) 91234-5678")).toBeVisible();

    await fillCustomer(page, "A", "1131234567"); // too short; a landline
    await page.getByRole("button", { name: "Fazer pedido" }).click();
    await expect(page.getByText("Informe seu nome.")).toBeVisible();
    await expect(page.getByText("Celular inválido. Ex.: (11) 91234-5678")).toBeVisible();

    expect(await db.countOrders()).toBe(0);
    expect(await db.stockOf("birthday-vanilla")).toBe(40);
  });
});

test.describe("E2E-4 desktop checkout", () => {
  test("the summary sits beside the form with the total and the order succeeds", async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, "desktop layout only");
    await seedCart(page, [
      { slug: "chocolate-crush", quantity: 2 },
      { slug: "birthday-vanilla", quantity: 1 },
    ]);
    await page.goto("/checkout");

    const summary = page
      .getByRole("heading", { name: "Resumo do pedido" })
      .locator("xpath=ancestor::section[1]");
    await expect(summary).toBeVisible();
    await expect(summary.getByText(price("33,70")).first()).toBeVisible();
    // The button lives inside the summary on desktop (ref 09).
    await expect(summary.getByRole("button", { name: "Fazer pedido" })).toBeVisible();
    const form = await page.getByLabel("Nome").boundingBox();
    const aside = await summary.boundingBox();
    expect(aside!.x).toBeGreaterThan(form!.x + form!.width);

    await fillCustomer(page, "Ana Souza", "(11) 91234-5678");
    await summary.getByRole("button", { name: "Fazer pedido" }).click();
    await expect(page).toHaveURL(/\/orders\/CUP-/);
    await expect(page.getByText("Pedido feito!")).toBeVisible();
  });
});

test.describe("E2E-5 order not found", () => {
  test("an unknown code shows 'Pedido não encontrado' with a way back", async ({ page }) => {
    await page.goto("/orders/CUP-ZZZZZZ");
    await expect(page.getByRole("heading", { name: "Pedido não encontrado" })).toBeVisible();
    await expect(page.getByText("Confira o código (CUP-XXXXXX).")).toBeVisible();
    await page.getByRole("main").getByRole("link", { name: "Voltar ao início" }).click();
    await expect(page).toHaveURL(/\/$/);
  });
});
