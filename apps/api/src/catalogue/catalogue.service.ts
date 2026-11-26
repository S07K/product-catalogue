import type { Logger } from 'pino';
import type { Category, CategoryProducts, Product } from '@catalogue/shared';
import type { ProductSource } from '../adapters/product-source/product-source';
import type { FeaturedRepository } from '../adapters/featured/featured-repository';
import { AppError } from '../errors';

/** Used when the owner has not curated a category. */
export const CATEGORY_TOP_RATED_FALLBACK_COUNT = 3;

export class CatalogueService {
  constructor(
    private readonly products: ProductSource,
    private readonly featured: FeaturedRepository,
    private readonly logger: Logger,
  ) {}

  async listCategories(): Promise<Category[]> {
    const bySlug = new Map<string, Category>();
    for (const p of await this.products.listProducts()) bySlug.set(p.category.slug, p.category);
    return [...bySlug.values()].sort((a, b) => a.name.localeCompare(b.name));
  }

  async getHomeFeatured(): Promise<Product[]> {
    const [ids, products] = await Promise.all([
      this.featured.getHomeProductIds(),
      this.products.listProducts(),
    ]);
    return this.resolveIds(ids, products, 'home');
  }

  async getCategoryProducts(slug: string): Promise<CategoryProducts> {
    const inCategory = (await this.products.listProducts()).filter((p) => p.category.slug === slug);
    const category = inCategory[0]?.category;
    if (!category) throw AppError.notFound(`Category "${slug}" not found`);

    const curatedIds = await this.featured.getCategoryProductIds(slug);
    const curated = curatedIds ? this.resolveIds(curatedIds, inCategory, `category:${slug}`) : [];
    const topRated = curated.length > 0 ? curated : topByRating(inCategory);

    const topIds = new Set(topRated.map((p) => p.id));
    return { category, topRated, others: inCategory.filter((p) => !topIds.has(p.id)) };
  }

  /**
   * Case-insensitive match on title, description and category name. Every
   * word of the query must appear somewhere, so "mens jacket" finds
   * "Mens Cotton Jacket"; apostrophes are ignored (see DECISIONS.md).
   */
  async search(query: string): Promise<Product[]> {
    const terms = normalise(query).split(/\s+/).filter(Boolean);
    if (terms.length === 0) return [];
    return (await this.products.listProducts()).filter((p) => {
      const haystack = normalise(`${p.title} ${p.description} ${p.category.name}`);
      return terms.every((t) => haystack.includes(t));
    });
  }

  async getProduct(id: string): Promise<Product> {
    const product = await this.products.getProductById(id);
    if (!product) throw AppError.notFound(`Product "${id}" not found`);
    return product;
  }

  /** Keeps the curated order; ids missing from the source are skipped and logged. */
  private resolveIds(ids: string[], products: Product[], context: string): Product[] {
    const byId = new Map(products.map((p) => [p.id, p]));
    const resolved: Product[] = [];
    for (const id of ids) {
      const product = byId.get(id);
      if (product) resolved.push(product);
      else this.logger.warn({ id, context }, 'Featured product id not found in product source');
    }
    return resolved;
  }
}

/** Lower-case and drop apostrophes so "mens" matches "Men's". */
function normalise(text: string): string {
  return text.toLowerCase().replace(/['’]/g, '');
}

function topByRating(products: Product[]): Product[] {
  return [...products]
    .sort(
      (a, b) =>
        (b.rating?.average ?? 0) - (a.rating?.average ?? 0) ||
        (b.rating?.count ?? 0) - (a.rating?.count ?? 0),
    )
    .slice(0, CATEGORY_TOP_RATED_FALLBACK_COUNT);
}
