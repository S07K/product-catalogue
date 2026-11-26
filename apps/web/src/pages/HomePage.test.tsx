import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { renderApp } from '../test/render';
import { server } from '../test/server';

describe('Home page', () => {
  it('shows the 5 featured (top rated) products', async () => {
    renderApp('/');
    const list = await screen.findByRole('list', { name: 'Top rated products' });
    const tiles = within(list).getAllByRole('link');
    expect(tiles).toHaveLength(5);
    expect(tiles[0]).toHaveTextContent('Gaming SSD');
    expect(tiles[0]).toHaveTextContent('$19.99');
  });

  it('shows category links in the navigation', async () => {
    renderApp('/');
    const nav = await screen.findByRole('navigation', { name: 'Categories' });
    expect(await within(nav).findByRole('link', { name: 'Jewellery' })).toHaveAttribute(
      'href',
      '/categories/jewellery',
    );
  });

  it('shows each category with its image and product count', async () => {
    renderApp('/');
    const section = await screen.findByRole('region', { name: 'Shop by category' });
    const link = await within(section).findByRole('link', { name: /Electronics/ });
    expect(link).toHaveAttribute('href', '/categories/electronics');
    expect(link).toHaveTextContent('4 products');
    expect(link.querySelector('img')).toHaveAttribute('src', 'https://images.test/1.png');
  });

  it('shows an error with a retry when the API is unavailable', async () => {
    server.use(
      http.get('/api/products/featured', () =>
        HttpResponse.json(
          { error: { code: 'UPSTREAM_UNAVAILABLE', message: 'Product source is unavailable' } },
          { status: 502 },
        ),
      ),
    );
    const { user } = renderApp('/');
    expect(await screen.findByRole('alert')).toHaveTextContent('Product source is unavailable');

    server.resetHandlers();
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('list', { name: 'Top rated products' })).toBeInTheDocument();
  });
});
