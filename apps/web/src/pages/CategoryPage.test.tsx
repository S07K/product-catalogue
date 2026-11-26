import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import { renderApp } from '../test/render';

describe('Category page', () => {
  it('shows top rated products and additional products when a category link is clicked', async () => {
    const { user } = renderApp('/');
    const nav = await screen.findByRole('navigation', { name: 'Categories' });
    await user.click(await within(nav).findByRole('link', { name: 'Electronics' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Electronics' }),
    ).toBeInTheDocument();
    const topRated = screen.getByRole('list', { name: 'Top rated in Electronics' });
    expect(
      within(topRated)
        .getAllByRole('link')
        .map((a) => a.textContent),
    ).toEqual([
      expect.stringContaining('Gaming SSD'),
      expect.stringContaining('Portable Hard Drive'),
    ]);
    const more = screen.getByRole('list', { name: 'More in Electronics' });
    expect(within(more).getAllByRole('link')).toHaveLength(2);
  });

  it('shows not found for an unknown category', async () => {
    renderApp('/categories/garden');
    expect(await screen.findByRole('heading', { name: 'Category not found' })).toBeInTheDocument();
  });
});
