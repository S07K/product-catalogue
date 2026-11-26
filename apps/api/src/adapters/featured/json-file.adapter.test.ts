import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { FeaturedConfigSchema, JsonFileFeaturedRepository } from './json-file.adapter';
import { FixtureProductSource } from '../product-source/fixture.adapter';

const dataDir = fileURLToPath(new URL('../../../data/', import.meta.url));

describe('featured config', () => {
  it('requires exactly 5 home products', () => {
    expect(FeaturedConfigSchema.safeParse({ home: ['1', '2', '3', '4'] }).success).toBe(false);
    expect(FeaturedConfigSchema.safeParse({ home: ['1', '2', '3', '4', '5'] }).success).toBe(true);
  });

  it('returns undefined for categories without curated products', async () => {
    const repo = new JsonFileFeaturedRepository({
      home: ['1', '2', '3', '4', '5'],
      categories: {},
    });
    expect(await repo.getCategoryProductIds('electronics')).toBeUndefined();
  });

  // Guards the shipped config: every curated id must exist in the bundled catalogue
  // and belong to the category it is curated for.
  it('shipped featured.json references real products in the right categories', async () => {
    const repo = JsonFileFeaturedRepository.fromFile(`${dataDir}featured.json`);
    const products = await FixtureProductSource.fromFile(
      `${dataDir}products.fixture.json`,
    ).listProducts();
    const byId = new Map(products.map((p) => [p.id, p]));

    for (const id of await repo.getHomeProductIds()) expect(byId.has(id)).toBe(true);
    for (const slug of new Set(products.map((p) => p.category.slug))) {
      for (const id of (await repo.getCategoryProductIds(slug)) ?? []) {
        expect(byId.get(id)?.category.slug).toBe(slug);
      }
    }
  });
});
