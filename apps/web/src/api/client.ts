import { z } from 'zod';
import {
  ApiErrorSchema,
  CategoryProductsSchema,
  CategorySchema,
  EnquiryResponseSchema,
  ProductSchema,
  type EnquiryInput,
  type ErrorCode,
} from '@catalogue/shared';

/**
 * The only module that knows API URLs. Components call these functions
 * (through hooks.ts) and never use fetch directly.
 *
 * Default base is same-origin `/api`: nginx (docker) or the Vite proxy (dev)
 * forwards it to the backend. VITE_API_BASE_URL supports hosting them apart.
 */
const BASE_URL = `${import.meta.env.VITE_API_BASE_URL ?? ''}/api`;

export class ApiRequestError extends Error {
  constructor(
    readonly status: number,
    readonly code: ErrorCode | 'NETWORK_ERROR' | 'INVALID_RESPONSE',
    message: string,
    readonly details?: Record<string, string[]>,
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

async function request<T>(path: string, schema: z.ZodType<T>, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: { accept: 'application/json', ...init?.headers },
    });
  } catch {
    throw new ApiRequestError(
      0,
      'NETWORK_ERROR',
      'Could not reach the server. Check your connection.',
    );
  }

  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const parsed = ApiErrorSchema.safeParse(body);
    if (parsed.success) {
      const { code, message, details } = parsed.data.error;
      throw new ApiRequestError(response.status, code, message, details);
    }
    throw new ApiRequestError(response.status, 'INTERNAL_ERROR', 'Something went wrong.');
  }

  // Validate responses against the shared contract so drift fails loudly here, not deep in the UI.
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new ApiRequestError(
      response.status,
      'INVALID_RESPONSE',
      'Unexpected response from the server.',
    );
  }
  return parsed.data;
}

export const api = {
  getCategories: () => request('/categories', z.array(CategorySchema)),
  getFeaturedProducts: () => request('/products/featured', z.array(ProductSchema)),
  getCategoryProducts: (slug: string) =>
    request(`/categories/${encodeURIComponent(slug)}/products`, CategoryProductsSchema),
  searchProducts: (query: string) =>
    request(`/products?${new URLSearchParams({ q: query })}`, z.array(ProductSchema)),
  getProduct: (id: string) => request(`/products/${encodeURIComponent(id)}`, ProductSchema),
  submitEnquiry: (input: EnquiryInput) =>
    request('/enquiries', EnquiryResponseSchema, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input),
    }),
};
