/**
 * Maps a category to one of the theme's plate colours via a stable hash of
 * its slug. No category names are hard-coded, so categories from any product
 * source get a consistent colour, and a rebrand only touches theme.css.
 *
 * Full class names are listed literally so Tailwind can detect them.
 */
const PLATE_CLASSES = [
  'bg-plate-1',
  'bg-plate-2',
  'bg-plate-3',
  'bg-plate-4',
  'bg-plate-5',
] as const;

export function plateClass(categorySlug: string): string {
  let hash = 0;
  for (const char of categorySlug) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return PLATE_CLASSES[hash % PLATE_CLASSES.length] ?? PLATE_CLASSES[0];
}
