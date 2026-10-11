export { createPrismaClient, getPrisma } from "./client.js";
export type { PrismaClient } from "./client.js";
export { seedCatalog } from "./seed.js";

// Re-export the generated model/enum types other packages need to reference
// (e.g. `apps/api`'s repositories), without reaching into the generated
// client's internal file layout from outside this package.
export type {
  Category,
  Tag,
  Product,
  ProductTag,
  Customer,
  Order,
  OrderItem,
  PickupStatus,
} from "./generated/client/client.js";
