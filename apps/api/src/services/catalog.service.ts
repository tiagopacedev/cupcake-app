import type { ProductFilter, ProductRecord } from "../repositories/product.repository.js";
import { maxQuantityOf, stockStateOf, type StockState } from "./stock.service.js";

interface NamedSlug {
  slug: string;
  name: string;
}

/** Shape of `Product` in docs/openapi.yaml. */
export interface ProductDto {
  id: string;
  slug: string;
  name: string;
  description: string;
  priceCents: number;
  imageUrl: string;
  category: NamedSlug;
  tags: NamedSlug[];
  stockQuantity: number;
  stockState: StockState;
  maxQuantity: number;
}

export interface CatalogFiltersDto {
  categories: NamedSlug[];
  tags: NamedSlug[];
}

function toProductDto(product: ProductRecord): ProductDto {
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    description: product.description,
    priceCents: product.priceCents,
    imageUrl: product.imageUrl,
    category: { slug: product.category.slug, name: product.category.name },
    tags: product.tags.map(({ tag }) => ({ slug: tag.slug, name: tag.name })),
    stockQuantity: product.stockQuantity,
    stockState: stockStateOf(product.stockQuantity),
    maxQuantity: maxQuantityOf(product.stockQuantity),
  };
}

/** What the service needs from the repositories (satisfied by the Prisma-backed classes). */
interface ProductSource {
  findActive(filter?: ProductFilter): PromiseLike<ProductRecord[]>;
}
interface CategorySource {
  findAllOrdered(): PromiseLike<NamedSlug[]>;
}
interface TagSource {
  findAll(): PromiseLike<NamedSlug[]>;
}

/** Catalog read rules: BR-02, BR-03, BR-04, BR-06 (US-01…US-04). */
export class CatalogService {
  constructor(
    private readonly products: ProductSource,
    private readonly categories: CategorySource,
    private readonly tags: TagSource,
  ) {}

  /** Active products, optionally narrowed by one category or one tag; an unknown slug yields []. */
  async listProducts(filter: ProductFilter = {}): Promise<ProductDto[]> {
    return (await this.products.findActive(filter)).map(toProductDto);
  }

  async listFilters(): Promise<CatalogFiltersDto> {
    const [categories, tags] = await Promise.all([
      this.categories.findAllOrdered(),
      this.tags.findAll(),
    ]);
    return {
      categories: categories.map(({ slug, name }) => ({ slug, name })),
      tags: tags.map(({ slug, name }) => ({ slug, name })),
    };
  }
}
