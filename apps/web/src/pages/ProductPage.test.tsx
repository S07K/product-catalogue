import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import { renderApp } from '../test/render';

describe('Product page', () => {
  it('opens the product details page when a product tile is clicked', async () => {
    const { user } = renderApp('/');
    const list = await screen.findByRole('list', { name: 'Top rated products' });
    await user.click(within(list).getByRole('link', { name: /Gold Ring/ }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Gold Ring' })).toBeInTheDocument();
    expect(screen.getByText('Gold Ring description')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Gold Ring' })).toBeInTheDocument();
    const main = screen.getByRole('main');
    expect(within(main).getByRole('link', { name: 'Jewellery' })).toHaveAttribute(
      'href',
      '/categories/jewellery',
    );
    expect(screen.getByRole('button', { name: 'Enquire' })).toBeInTheDocument();
  });

  it('shows not found for an unknown product', async () => {
    renderApp('/products/999');
    expect(await screen.findByRole('heading', { name: 'Product not found' })).toBeInTheDocument();
  });
});
