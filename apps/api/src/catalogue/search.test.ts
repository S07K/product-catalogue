import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Product } from '@catalogue/shared';
import { product } from '../test-support';
import { searchProducts, tokenise } from './search';

const ids = (products: Product[]) => products.map((p) => p.id);

const catalogue: Product[] = JSON.parse(
  readFileSync(new URL('../../data/products.fixture.json', import.meta.url), 'utf8'),
);

describe('searchProducts', () => {
  describe('on the real catalogue (regression)', () => {
    it('"ring" finds the ring, not spring / wearing / drawstring / earrings', () => {
      // Substring matching used to return 6 products here (ids 2, 3, 7, 8, 17, 20).
      const results = searchProducts(catalogue, 'ring');
      expect(ids(results)).toEqual(['7']);
      expect(results[0]?.title).toBe('White Gold Plated Princess');
    });
  });

  it('matches whole words only', () => {
    const products = [
      product({ id: '1', title: 'Spring Jacket' }),
      product({ id: '2', title: 'Drawstring Bag' }),
      product({ id: '3', title: 'Gold Ring' }),
    ];
    expect(ids(searchProducts(products, 'ring'))).toEqual(['3']);
  });

  it('matches word prefixes, so partial words and plurals work', () => {
    const products = [
      product({ id: '1', title: 'Cotton Jacket' }),
      product({ id: '2', title: 'Silver Rings' }),
    ];
    expect(ids(searchProducts(products, 'jack'))).toEqual(['1']);
    expect(ids(searchProducts(products, 'ring'))).toEqual(['2']);
  });

  it('requires every query word to match', () => {
    const products = [
      product({ id: '1', title: 'Gaming SSD' }),
      product({ id: '2', title: 'Portable Hard Drive' }),
      product({ id: '3', title: 'Gaming Hard Drive' }),
    ];
    expect(ids(searchProducts(products, 'gaming drive'))).toEqual(['3']);
  });

  it('ranks title matches above category and description matches', () => {
    const products = [
      product({ id: '1', title: 'Tote Bag', description: 'Fits a laptop' }),
      product({ id: '2', title: 'Sleeve', category: { slug: 'laptop', name: 'Laptop Gear' } }),
      product({ id: '3', title: 'Laptop Stand' }),
    ];
    expect(ids(searchProducts(products, 'laptop'))).toEqual(['3', '2', '1']);
  });

  it('ranks an exact word above a prefix match in the same field', () => {
    const products = [
      product({ id: '1', title: 'Rings Set' }),
      product({ id: '2', title: 'Ring' }),
    ];
    expect(ids(searchProducts(products, 'ring'))).toEqual(['2', '1']);
  });

  it('keeps catalogue order for equally relevant results', () => {
    const products = [
      product({ id: '1', title: 'Blue SSD' }),
      product({ id: '2', title: 'Red SSD' }),
    ];
    expect(ids(searchProducts(products, 'ssd'))).toEqual(['1', '2']);
  });

  it('ignores case, apostrophes and repeated words', () => {
    const products = [product({ id: '1', title: "Men's Jacket" })];
    expect(ids(searchProducts(products, 'MENS mens jacket'))).toEqual(['1']);
  });

  it('returns nothing for a query with no words', () => {
    expect(searchProducts([product({ id: '1' })], ' -- ')).toEqual([]);
  });
});

describe('tokenise', () => {
  it('splits on punctuation and drops apostrophes', () => {
    expect(tokenise('Men\'s 3-in-1 Snowboard Jacket, 15"')).toEqual([
      'mens',
      '3',
      'in',
      '1',
      'snowboard',
      'jacket',
      '15',
    ]);
  });
});
