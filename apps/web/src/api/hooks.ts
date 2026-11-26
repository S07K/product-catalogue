import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from './client';

/** Query keys live in one place so cache invalidation stays predictable. */
export const queryKeys = {
  categories: ['categories'] as const,
  featured: ['products', 'featured'] as const,
  category: (slug: string) => ['categories', slug, 'products'] as const,
  search: (q: string) => ['products', 'search', q] as const,
  product: (id: string) => ['products', id] as const,
};

export const useCategories = () =>
  useQuery({ queryKey: queryKeys.categories, queryFn: api.getCategories });

export const useFeaturedProducts = () =>
  useQuery({ queryKey: queryKeys.featured, queryFn: api.getFeaturedProducts });

export const useCategoryProducts = (slug: string) =>
  useQuery({ queryKey: queryKeys.category(slug), queryFn: () => api.getCategoryProducts(slug) });

export const useSearchProducts = (q: string) =>
  useQuery({
    queryKey: queryKeys.search(q),
    queryFn: () => api.searchProducts(q),
    enabled: q.trim().length > 0,
  });

export const useProduct = (id: string) =>
  useQuery({ queryKey: queryKeys.product(id), queryFn: () => api.getProduct(id) });

export const useSubmitEnquiry = () => useMutation({ mutationFn: api.submitEnquiry });
