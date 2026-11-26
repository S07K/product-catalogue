import { readFileSync } from 'node:fs';
import { z } from 'zod';
import type { FeaturedRepository } from './featured-repository';

/** The acceptance criteria specify exactly five featured products on the home page. */
export const HOME_FEATURED_COUNT = 5;

const productIds = z.array(z.string().min(1));

export const FeaturedConfigSchema = z.object({
  home: productIds.length(
    HOME_FEATURED_COUNT,
    `"home" must list exactly ${HOME_FEATURED_COUNT} product ids`,
  ),
  categories: z.record(z.string().min(1), productIds).default({}),
});
export type FeaturedConfig = z.infer<typeof FeaturedConfigSchema>;

/**
 * Loaded and validated once at startup so a broken config fails fast,
 * rather than at the first page view.
 */
export class JsonFileFeaturedRepository implements FeaturedRepository {
  constructor(private readonly config: FeaturedConfig) {}

  static fromFile(path: string): JsonFileFeaturedRepository {
    const raw: unknown = JSON.parse(readFileSync(path, 'utf8'));
    const result = FeaturedConfigSchema.safeParse(raw);
    if (!result.success) {
      throw new Error(`Invalid featured config at ${path}: ${z.prettifyError(result.error)}`);
    }
    return new JsonFileFeaturedRepository(result.data);
  }

  async getHomeProductIds(): Promise<string[]> {
    return this.config.home;
  }

  async getCategoryProductIds(categorySlug: string): Promise<string[] | undefined> {
    return this.config.categories[categorySlug];
  }
}
