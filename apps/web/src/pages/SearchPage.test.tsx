import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import { renderApp } from '../test/render';

describe('Search', () => {
  it('shows only matching products after clicking the search button', async () => {
    const { user } = renderApp('/');
    await user.type(screen.getByRole('searchbox', { name: 'Search products' }), 'ssd');
    await user.click(screen.getByRole('button', { name: 'Search' }));

    expect(await screen.findByRole('heading', { name: /results for/i })).toHaveTextContent('ssd');
    const results = await screen.findByRole('list', { name: 'Search results' });
    const tiles = within(results).getAllByRole('link');
    expect(tiles).toHaveLength(1);
    expect(tiles[0]).toHaveTextContent('Gaming SSD');
    expect(screen.getByRole('status')).toHaveTextContent('1 product found');
  });

  it('does not search for a blank term', async () => {
    const { user } = renderApp('/');
    await user.type(screen.getByRole('searchbox', { name: 'Search products' }), '   ');
    await user.click(screen.getByRole('button', { name: 'Search' }));
    // Still on the home page: no navigation happened.
    expect(screen.getByRole('heading', { level: 1, name: 'Top rated' })).toBeInTheDocument();
    expect(screen.queryByText('Enter a search term')).not.toBeInTheDocument();
  });

  it('tells the user when nothing matches', async () => {
    renderApp('/search?q=trampoline');
    expect(await screen.findByText('No products match “trampoline”')).toBeInTheDocument();
  });

  it('keeps the search term in the search box', async () => {
    renderApp('/search?q=ring');
    expect(screen.getByRole('searchbox', { name: 'Search products' })).toHaveValue('ring');
  });
});
