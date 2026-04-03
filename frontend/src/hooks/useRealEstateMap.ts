'use client';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useRealEstateMap(params?: { district?: string; dong?: string }) {
  return useQuery({
    queryKey: ['realEstate', 'list', params],
    queryFn: () => api.realEstate.list({ ...params, page: 1, size: 1000 }),
    staleTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
