import { z } from 'zod';

/**
 * Domain types owned by this application. Product sources (Fake Store today)
 * are mapped into these shapes inside the API, so neither the web app nor the
 * services ever depend on a vendor's data format.
 */

export const CategorySchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
});
export type Category = z.infer<typeof CategorySchema>;

export const MoneySchema = z.object({
  /** Integer minor units avoid floating-point rounding issues with prices. */
  amountCents: z.number().int().nonnegative(),
  currency: z.string().length(3),
});
export type Money = z.infer<typeof MoneySchema>;

export const RatingSchema = z.object({
  average: z.number().min(0).max(5),
  count: z.number().int().nonnegative(),
});
export type Rating = z.infer<typeof RatingSchema>;

export const ProductSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string(),
  price: MoneySchema,
  imageUrl: z.url(),
  category: CategorySchema,
  rating: RatingSchema.nullable(),
});
export type Product = z.infer<typeof ProductSchema>;

export const CategoryProductsSchema = z.object({
  category: CategorySchema,
  topRated: z.array(ProductSchema),
  others: z.array(ProductSchema),
});
export type CategoryProducts = z.infer<typeof CategoryProductsSchema>;

export const SEARCH_QUERY_MAX_LENGTH = 100;

export const SearchQuerySchema = z.object({
  q: z
    .string()
    .trim()
    .min(1, 'Enter a search term')
    .max(
      SEARCH_QUERY_MAX_LENGTH,
      `Search terms are limited to ${SEARCH_QUERY_MAX_LENGTH} characters`,
    ),
});
export type SearchQuery = z.infer<typeof SearchQuerySchema>;
