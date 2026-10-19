import type { FastifyInstance } from "fastify";
import { createCatalogController } from "../controllers/catalog.controller.js";
import { CategoryRepository } from "../repositories/category.repository.js";
import { ProductRepository } from "../repositories/product.repository.js";
import { TagRepository } from "../repositories/tag.repository.js";
import { CatalogService } from "../services/catalog.service.js";
import type { OrderExpiry } from "../services/order-expiry.service.js";

/** GET /api/catalog/filters and GET /api/products (07-api-spec.md §3.2, §3.3). */
export default async function catalogRoutes(
  app: FastifyInstance,
  opts: { expiry: OrderExpiry },
): Promise<void> {
  const service = new CatalogService(
    new ProductRepository(app.prisma),
    new CategoryRepository(app.prisma),
    new TagRepository(app.prisma),
    opts.expiry,
  );
  const controller = createCatalogController(service);

  app.get("/catalog/filters", controller.listFilters);
  app.get("/products", controller.listProducts);
}
