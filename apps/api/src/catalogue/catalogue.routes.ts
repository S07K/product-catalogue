import { Router } from 'express';
import { z } from 'zod';
import { SearchQuerySchema } from '@catalogue/shared';
import type { CatalogueService } from './catalogue.service';

const IdParams = z.object({ id: z.string().regex(/^[A-Za-z0-9_-]{1,64}$/, 'Invalid product id') });
const SlugParams = z.object({
  slug: z.string().regex(/^[a-z0-9-]{1,64}$/, 'Invalid category'),
});

/** Catalogue data changes rarely; let browsers and CDNs reuse responses briefly. */
const CACHE_HEADER = 'public, max-age=60';

export function catalogueRoutes(catalogue: CatalogueService): Router {
  const router = Router();

  router.get('/categories', async (_req, res) => {
    res.set('Cache-Control', CACHE_HEADER).json(await catalogue.listCategories());
  });

  router.get('/categories/:slug/products', async (req, res) => {
    const { slug } = SlugParams.parse(req.params);
    res.set('Cache-Control', CACHE_HEADER).json(await catalogue.getCategoryProducts(slug));
  });

  router.get('/products/featured', async (_req, res) => {
    res.set('Cache-Control', CACHE_HEADER).json(await catalogue.getHomeFeatured());
  });

  // Search is the only listing endpoint: a bare `GET /products` without `q` is rejected (400).
  router.get('/products', async (req, res) => {
    const { q } = SearchQuerySchema.parse(req.query);
    res.set('Cache-Control', CACHE_HEADER).json(await catalogue.search(q));
  });

  router.get('/products/:id', async (req, res) => {
    const { id } = IdParams.parse(req.params);
    res.set('Cache-Control', CACHE_HEADER).json(await catalogue.getProduct(id));
  });

  return router;
}
