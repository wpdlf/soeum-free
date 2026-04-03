import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useRegionSearch(query: string) {
  const [debouncedQuery, setDebouncedQuery] = useState(query);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const { data, isLoading } = useQuery({
    queryKey: ['regions', 'search', debouncedQuery],
    queryFn: () => api.regions.search(debouncedQuery),
    enabled: debouncedQuery.length >= 1,
  });

  return { data, isLoading };
}
