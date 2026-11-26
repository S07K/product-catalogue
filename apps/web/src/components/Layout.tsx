import { useEffect } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router';
import { useCategories } from '../api/hooks';
import { SearchBar } from './SearchBar';

function CategoryNav() {
  const { data: categories } = useCategories();
  // Navigation is progressive: if categories fail to load, the rest of the page still works.
  if (!categories?.length) return null;

  return (
    <nav aria-label="Categories" className="border-t border-border">
      <ul className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4">
        {categories.map((category) => (
          <li key={category.slug}>
            <NavLink
              to={`/categories/${category.slug}`}
              className={({ isActive }) =>
                `block whitespace-nowrap border-b-2 px-3 py-3 text-sm font-medium ${
                  isActive
                    ? 'border-brand text-brand'
                    : 'border-transparent text-text-muted hover:text-text'
                }`
              }
            >
              {category.name}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function Layout() {
  const { pathname, search } = useLocation();

  // Client-side navigation keeps scroll position by default; start each page at the top.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname, search]);

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-10 focus:rounded-control focus:bg-surface focus:px-4 focus:py-2"
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-[1] border-b border-border bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:gap-6">
          <Link
            to="/"
            className="shrink-0 font-display text-xl font-bold tracking-tight text-brand"
          >
            Product Catalogue
          </Link>
          {/* key resets the input when the URL query changes (e.g. browser back). */}
          <SearchBar key={search} />
        </div>
        <CategoryNav />
      </header>
      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:py-14">
        <Outlet />
      </main>
      <footer className="mt-16 border-t border-border">
        <p className="mx-auto max-w-6xl px-4 py-6 text-sm text-text-muted">
          Questions about a product? Open it and use the Enquire button.
        </p>
      </footer>
    </div>
  );
}
