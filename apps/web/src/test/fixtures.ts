import type { Category, Product } from '@catalogue/shared';

export const electronics: Category = { slug: 'electronics', name: 'Electronics' };
export const jewellery: Category = { slug: 'jewellery', name: 'Jewellery' };

export function product(id: string, title: string, category: Category = electronics): Product {
  return {
    id,
    title,
    description: `${title} description`,
    price: { amountCents: 1999, currency: 'AUD' },
    imageUrl: `https://images.test/${id}.png`,
    category,
    rating: { average: 4.5, count: 10 },
  };
}

export const products = [
  product('1', 'Gaming SSD'),
  product('2', 'Portable Hard Drive'),
  product('3', 'Curved Monitor'),
  product('4', 'Gold Ring', jewellery),
  product('5', 'Silver Bracelet', jewellery),
  product('6', 'USB Cable'),
];
