/**
 * Port for the owner's curated "top rated" selections. Backed by a JSON file
 * today; a CMS, database table or admin UI can implement it later.
 */
export interface FeaturedRepository {
  /** Product ids for the home page, in display order. */
  getHomeProductIds(): Promise<string[]>;
  /** Curated ids for a category, or `undefined` when none are configured. */
  getCategoryProductIds(categorySlug: string): Promise<string[] | undefined>;
}
