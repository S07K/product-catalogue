import { useEffect } from 'react';

const SITE_NAME = 'Product Catalogue';

/** Distinct page titles help screen-reader users and browser history. */
export function useDocumentTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} | ${SITE_NAME}` : SITE_NAME;
  }, [title]);
}
