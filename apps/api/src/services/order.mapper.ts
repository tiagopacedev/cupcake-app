import { STORE } from "shared";

/** Shape of `Order` in docs/openapi.yaml: the public view, never the phone (BR-16). */
export interface OrderDto {
  code: string;
  pickupStatus: "AWAITING_PICKUP" | "PICKED_UP";
  customerFirstName: string;
  createdAt: string;
  readyAt: string;
  items: OrderItemDto[];
  totalCents: number;
}

export interface OrderItemDto {
  productId: string;
  slug: string;
  name: string;
  imageUrl: string;
  quantity: number;
  unitPriceCents: number;
  lineTotalCents: number;
}

export interface OrderView {
  code: string;
  pickupStatus: "AWAITING_PICKUP" | "PICKED_UP";
  customerName: string;
  createdAt: Date;
  totalCents: number;
  items: {
    product: { id: string; slug: string; name: string; imageUrl: string };
    quantity: number;
    unitPriceCents: number;
  }[];
}

/** First word of the stored name (BR-16). */
export function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? "";
}

/** `createdAt` plus the configured preparation time (BR-12). */
export function readyAt(createdAt: Date): Date {
  return new Date(createdAt.getTime() + STORE.readyMinutes * 60_000);
}

/**
 * Builds the public order from stored data. Items keep the unit price paid
 * (BR-07) with the product's current name and photo, sorted by name so POST
 * and GET list them the same way.
 */
export function toOrderDto(order: OrderView): OrderDto {
  return {
    code: order.code,
    pickupStatus: order.pickupStatus,
    customerFirstName: firstName(order.customerName),
    createdAt: order.createdAt.toISOString(),
    readyAt: readyAt(order.createdAt).toISOString(),
    items: order.items
      .map((item) => ({
        productId: item.product.id,
        slug: item.product.slug,
        name: item.product.name,
        imageUrl: item.product.imageUrl,
        quantity: item.quantity,
        unitPriceCents: item.unitPriceCents,
        lineTotalCents: item.unitPriceCents * item.quantity,
      }))
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
    totalCents: order.totalCents,
  };
}
