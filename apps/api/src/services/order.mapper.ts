import type { PickupStatus } from "shared";

/** Shape of `Order` in docs/openapi.yaml: the public view, never the phone (BR-16). */
export interface OrderDto {
  code: string;
  pickupStatus: PickupStatus;
  customerFirstName: string;
  createdAt: string;
  readyAt: string;
  expiresAt: string;
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
  pickupStatus: PickupStatus;
  customerName: string;
  createdAt: Date;
  readyAt: Date;
  expiresAt: Date;
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

/**
 * Builds the public order from stored data. Items keep the unit price paid
 * (BR-07) with the product's current name and photo, sorted by name so POST
 * and GET list them the same way. `readyAt` and `expiresAt` are the stored
 * pickup schedule (BR-12, BR-20).
 */
export function toOrderDto(order: OrderView): OrderDto {
  return {
    code: order.code,
    pickupStatus: order.pickupStatus,
    customerFirstName: firstName(order.customerName),
    createdAt: order.createdAt.toISOString(),
    readyAt: order.readyAt.toISOString(),
    expiresAt: order.expiresAt.toISOString(),
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
