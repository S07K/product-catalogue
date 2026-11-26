import { useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { SEARCH_QUERY_MAX_LENGTH } from '@catalogue/shared';
import { Button } from './ui/Button';

/** Search runs when the search button is clicked (or Enter pressed), per the acceptance criteria. */
export function SearchBar() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [query, setQuery] = useState(params.get('q') ?? '');

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const q = query.trim();
    if (!q) return;
    navigate(`/search?${new URLSearchParams({ q })}`);
  }

  return (
    <form role="search" onSubmit={onSubmit} className="flex w-full gap-2">
      <label htmlFor="site-search" className="sr-only">
        Search products
      </label>
      <input
        id="site-search"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        maxLength={SEARCH_QUERY_MAX_LENGTH}
        placeholder="Search products"
        className="w-full min-w-0 rounded-control border border-border bg-surface px-3 py-2.5 text-sm text-text placeholder:text-text-muted"
      />
      <Button type="submit">Search</Button>
    </form>
  );
}
