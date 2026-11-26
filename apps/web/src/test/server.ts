import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { electronics, jewellery, products } from './fixtures';

/** Default happy-path API. Individual tests override handlers with server.use(...). */
export const handlers = [
  http.get('/api/categories', () =>
    HttpResponse.json([
      { ...electronics, productCount: 4, imageUrl: 'https://images.test/1.png' },
      { ...jewellery, productCount: 2, imageUrl: 'https://images.test/4.png' },
    ]),
  ),
  http.get('/api/products/featured', () => HttpResponse.json(products.slice(0, 5))),
  http.get('/api/categories/:slug/products', ({ params }) => {
    const inCategory = products.filter((p) => p.category.slug === params.slug);
    if (inCategory.length === 0) {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Category not found' } },
        { status: 404 },
      );
    }
    return HttpResponse.json({
      category: inCategory[0]?.category,
      topRated: inCategory.slice(0, 2),
      others: inCategory.slice(2),
    });
  }),
  http.get('/api/products', ({ request }) => {
    const q = new URL(request.url).searchParams.get('q')?.toLowerCase() ?? '';
    return HttpResponse.json(products.filter((p) => p.title.toLowerCase().includes(q)));
  }),
  http.get('/api/products/:id', ({ params }) => {
    const found = products.find((p) => p.id === params.id);
    return found
      ? HttpResponse.json(found)
      : HttpResponse.json(
          { error: { code: 'NOT_FOUND', message: 'Product not found' } },
          { status: 404 },
        );
  }),
  http.post('/api/enquiries', () => HttpResponse.json({ enquiryId: 'ref-42' }, { status: 202 })),
];

export const server = setupServer(...handlers);
