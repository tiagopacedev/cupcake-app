import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { AxeBuilder } from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { createOrderViaApi, expect, seedCart, test } from "../support/test.js";

/**
 * E8-02 quality checks on every screen, in both projects:
 *  - NFR-01 no horizontal overflow at 360, 390, 768, 1280 and 1440 px;
 *  - NFR-03 axe (WCAG 2.1 A and AA) finds no serious or critical violation;
 *  - screenshots of each screen, for the visual comparison with
 *    docs/design/screenshots/ (artifacts/screens, uploaded by CI).
 */
const artifacts = join(import.meta.dirname, "..", "artifacts");
const WIDTHS = [360, 390, 768, 1280, 1440];

interface Screen {
  name: string;
  open: (page: Page) => Promise<void>;
}

const screens: Screen[] = [
  {
    name: "01-catalog",
    open: async (page) => {
      await page.goto("/");
      await expect(page.getByRole("heading", { level: 2 })).toHaveCount(6);
    },
  },
  {
    name: "02-catalog-filtered",
    open: async (page) => {
      await page.goto("/?filter=chocolate");
      await expect(page.getByRole("heading", { name: "Chocolate Crush" })).toBeVisible();
    },
  },
  {
    name: "03-cart",
    open: async (page) => {
      await seedCart(page, [
        { slug: "chocolate-crush", quantity: 2 },
        { slug: "strawberry-kiss", quantity: 1 },
        { slug: "birthday-vanilla", quantity: 1 },
      ]);
      await page.goto("/cart");
      await expect(page.getByRole("heading", { name: "Birthday Vanilla" })).toBeVisible();
    },
  },
  {
    name: "04-checkout",
    open: async (page) => {
      await seedCart(page, [
        { slug: "chocolate-crush", quantity: 2 },
        { slug: "strawberry-kiss", quantity: 1 },
        { slug: "birthday-vanilla", quantity: 1 },
      ]);
      await page.goto("/checkout");
      await expect(page.getByRole("heading", { name: "Resumo do pedido" })).toBeVisible();
    },
  },
  {
    name: "05-my-order",
    open: async (page) => {
      const code = await createOrderViaApi(page, [
        { slug: "chocolate-crush", quantity: 2 },
        { slug: "strawberry-kiss", quantity: 1 },
        { slug: "birthday-vanilla", quantity: 1 },
      ]);
      await page.goto(`/orders/${code}?new=1`);
      await expect(page.getByText("Pedido feito!")).toBeVisible();
    },
  },
  {
    name: "07-empty-cart",
    open: async (page) => {
      await page.goto("/cart");
      await expect(page.getByRole("heading", { name: "Carrinho vazio" })).toBeVisible();
    },
  },
  {
    name: "07-order-not-found",
    open: async (page) => {
      await page.goto("/orders/CUP-ZZZZZZ");
      await expect(page.getByRole("heading", { name: "Pedido não encontrado" })).toBeVisible();
    },
  },
  {
    name: "07-page-not-found",
    open: async (page) => {
      await page.goto("/rota-que-nao-existe");
      await expect(page.getByRole("heading", { name: "Página não encontrada" })).toBeVisible();
    },
  },
];

for (const screen of screens) {
  test.describe(screen.name, () => {
    test("NFR-01 has no horizontal overflow from 360 to 1440 px", async ({ page }) => {
      await screen.open(page);
      for (const width of WIDTHS) {
        await page.setViewportSize({ width, height: 900 });
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - window.innerWidth,
        );
        expect(
          overflow,
          `${screen.name} overflows by ${overflow}px at ${width}px`,
        ).toBeLessThanOrEqual(0);
      }
    });

    test("NFR-03 axe finds no serious or critical violation", async ({ page }, testInfo) => {
      await screen.open(page);
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();

      mkdirSync(join(artifacts, "axe"), { recursive: true });
      writeFileSync(
        join(artifacts, "axe", `${testInfo.project.name}-${screen.name}.json`),
        JSON.stringify(
          results.violations.map((violation) => ({
            id: violation.id,
            impact: violation.impact,
            help: violation.help,
            nodes: violation.nodes.map((node) => node.target.join(" ")),
          })),
          null,
          2,
        ),
      );

      const blocking = results.violations.filter(
        (violation) => violation.impact === "serious" || violation.impact === "critical",
      );
      expect(
        blocking.map(
          (violation) =>
            `${violation.id}: ${violation.nodes.map((n) => n.target.join(" ")).join(" | ")}`,
        ),
      ).toEqual([]);
    });

    test("captures a screenshot for the visual comparison", async ({ page }, testInfo) => {
      await screen.open(page);
      await page.waitForLoadState("networkidle");
      mkdirSync(join(artifacts, "screens"), { recursive: true });
      // A tall viewport instead of fullPage: a full-page capture stitches a
      // sticky action bar at the top of the page and overlaps the content.
      const { width } = page.viewportSize() ?? { width: 390 };
      await page.setViewportSize({ width, height: width < 768 ? 1700 : 1000 });
      await page.screenshot({
        path: join(artifacts, "screens", `${testInfo.project.name}-${screen.name}.png`),
      });
    });
  });
}
