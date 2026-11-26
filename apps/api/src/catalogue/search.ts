import type { Product } from '@catalogue/shared';

/**
 * In-memory product search: a deliberately small version of what search
 * engines (OpenSearch, Algolia) do. It is fine for a catalogue of this size,
 * and is the piece to replace with a real engine behind `ProductSource` later.
 *
 * 1. Tokenise: text is split into whole words. "ring" never matches inside
 *    "spring", "earrings" or "drawstring".
 * 2. Prefix match: a query word matches words that start with it, so "ring"
 *    finds "rings" and "jack" finds "jacket" (useful while typing).
 * 3. Every query word must match somewhere (AND), so results narrow as you type more.
 * 4. Rank by relevance: title beats category beats description, and an exact
 *    word beats a prefix. Ties keep catalogue order.
 *
 * Not included (would come with a real engine): stemming, typo tolerance, synonyms.
 */

const FIELD_WEIGHTS = { title: 3, category: 2, description: 1 } as const;
type Field = keyof typeof FIELD_WEIGHTS;

/** Lower-case, drop apostrophes ("Men's" -> "mens") and split into words. */
export function tokenise(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/['’]/g, '')
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
}

/** Best score for one query word in one field: exact word > prefix > no match. */
function termScore(term: string, words: string[]): number {
  let best = 0;
  for (const word of words) {
    if (word === term) return 1;
    if (word.startsWith(term)) best = 0.5;
  }
  return best;
}

export function searchProducts(products: Product[], query: string): Product[] {
  const terms = [...new Set(tokenise(query))];
  if (terms.length === 0) return [];

  const scored: Array<{ product: Product; score: number; index: number }> = [];
  products.forEach((product, index) => {
    const fields: Record<Field, string[]> = {
      title: tokenise(product.title),
      category: tokenise(product.category.name),
      description: tokenise(product.description),
    };

    let score = 0;
    for (const term of terms) {
      // A term's score is its best field; a term matching no field excludes the product.
      const best = Math.max(
        ...(Object.keys(FIELD_WEIGHTS) as Field[]).map(
          (field) => termScore(term, fields[field]) * FIELD_WEIGHTS[field],
        ),
      );
      if (best === 0) return;
      score += best;
    }
    scored.push({ product, score, index });
  });

  return scored
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map(({ product }) => product);
}
