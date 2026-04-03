import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useNoiseMap() {
  return useQuery({
    queryKey: ['noise', 'map'],
    queryFn: () => api.noise.map(),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
