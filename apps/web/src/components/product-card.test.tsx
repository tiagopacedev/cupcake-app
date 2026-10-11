import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProductCard } from "./product-card";
import { bestsellerTag, makeProduct } from "@/test-utils/fixtures";

describe("US-01 product card", () => {
  it("shows name, formatted price, descriptor and photo", () => {
    render(<ProductCard product={makeProduct()} />);
    expect(screen.getByRole("heading", { level: 2, name: "Birthday Vanilla" })).toBeInTheDocument();
    expect(screen.getByText(/^R\$\s9,90$/)).toBeInTheDocument();
    expect(screen.getByText("Baunilha · confeitos")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Birthday Vanilla" })).toBeInTheDocument();
  });

  it("shows no stock badge when stock is available", () => {
    render(<ProductCard product={makeProduct()} />);
    expect(screen.queryByText(/Restam/)).not.toBeInTheDocument();
    expect(screen.queryByText("Esgotado")).not.toBeInTheDocument();
  });
});

describe("US-03 bestseller badge", () => {
  it("shows 'Mais vendido' only for products with the bestseller tag", () => {
    const { rerender } = render(<ProductCard product={makeProduct({ tags: [bestsellerTag] })} />);
    expect(screen.getByText("Mais vendido")).toBeInTheDocument();
    rerender(<ProductCard product={makeProduct({ tags: [] })} />);
    expect(screen.queryByText("Mais vendido")).not.toBeInTheDocument();
  });
});

describe("US-04 / BR-04 stock states", () => {
  it("shows 'Restam N' for low stock", () => {
    render(
      <ProductCard
        product={makeProduct({ stockQuantity: 3, stockState: "LOW", maxQuantity: 3 })}
      />,
    );
    expect(screen.getByText("Restam 3")).toBeInTheDocument();
    expect(screen.queryByText("Esgotado")).not.toBeInTheDocument();
  });

  it("marks a sold-out product: badge, dimmed photo, muted name and price", () => {
    render(
      <ProductCard
        product={makeProduct({ stockQuantity: 0, stockState: "SOLD_OUT", maxQuantity: 0 })}
        action={<button>Adicionar</button>}
      />,
    );
    expect(screen.getByText("Esgotado")).toBeInTheDocument();
    expect(screen.getByRole("img")).toHaveClass("opacity-50", "grayscale");
    expect(screen.getByRole("heading", { level: 2 })).toHaveClass("text-muted-foreground");
  });

  it("never renders the add control for a sold-out product (BR-04)", () => {
    render(
      <ProductCard
        product={makeProduct({ stockQuantity: 0, stockState: "SOLD_OUT", maxQuantity: 0 })}
        action={<button>Adicionar</button>}
      />,
    );
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("renders the action slot for an available product", () => {
    render(<ProductCard product={makeProduct()} action={<button>Adicionar</button>} />);
    expect(screen.getByRole("button", { name: "Adicionar" })).toBeInTheDocument();
  });
});
