import type { FastifyRequest } from "fastify";
import { z } from "zod";
import type { CatalogService } from "../services/catalog.service.js";

const slug = z
  .string()
  .max(80)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Invalid slug");

/** `category` and `tag` are mutually exclusive (07-api-spec.md §3.3). */
const listProductsQuery = z
  .object({ category: slug.optional(), tag: slug.optional() })
  .refine((query) => !(query.category && query.tag), {
    message: "category and tag are mutually exclusive",
  });

/**
 * HTTP mapping for the catalog endpoints: validate input, call one service
 * method, return the body (02-architecture.md §3). A ZodError thrown here is
 * mapped to 400 VALIDATION_ERROR by the global error handler.
 */
export function createCatalogController(service: CatalogService) {
  return {
    listProducts: async (request: FastifyRequest) => {
      const { category, tag } = listProductsQuery.parse(request.query);
      return { products: await service.listProducts({ categorySlug: category, tagSlug: tag }) };
    },
    listFilters: async () => service.listFilters(),
  };
}
