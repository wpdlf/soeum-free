'use client';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useConstructionMap() {
  return useQuery({
    queryKey: ['construction', 'map'],
    queryFn: () => api.construction.map(),
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
