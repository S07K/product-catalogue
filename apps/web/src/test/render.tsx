import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import { App } from '../App';
import { createQueryClient } from '../query-client';

/** Renders the whole app at a URL, with real routing and data fetching (API mocked by MSW). */
export function renderApp(url = '/') {
  const user = userEvent.setup();
  const utils = render(
    <QueryClientProvider client={createQueryClient({ retry: false })}>
      <MemoryRouter initialEntries={[url]}>
        <App />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return { user, ...utils };
}
