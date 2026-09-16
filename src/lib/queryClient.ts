import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Local SQLite reads and the dirigeant's Supabase reads are both cheap
      // and get explicitly invalidated after every sync cycle / local write,
      // so we don't need aggressive background refetching here.
      retry: 1,
      staleTime: 5_000,
    },
  },
});
