'use client';

import { useCallback, useMemo } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import type { PeriodPreset, InfoTab } from '@/types';
import { getDefaultPeriod } from '@/lib/date-utils';

interface MapFilters {
  period: PeriodPreset;
  from: string;
  to: string;
  regionId: number | null;
  tab: InfoTab;
}

export function useMapFilters() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const filters: MapFilters = useMemo(() => {
    const preset = (searchParams.get('period') as PeriodPreset) || '3m';
    const defaultDates = getDefaultPeriod(preset);

    return {
      period: preset,
      from: searchParams.get('from') || defaultDates.from,
      to: searchParams.get('to') || defaultDates.to,
      regionId: searchParams.get('region') ? Number(searchParams.get('region')) : null,
      tab: (searchParams.get('tab') as InfoTab) || 'noise',
    };
  }, [searchParams]);

  const setFilter = useCallback(
    (updates: Partial<Pick<MapFilters, 'period' | 'from' | 'to' | 'regionId' | 'tab'>>) => {
      const params = new URLSearchParams(searchParams.toString());

      if (updates.period !== undefined) {
        params.set('period', updates.period);
        if (updates.period !== 'custom') {
          const dates = getDefaultPeriod(updates.period);
          params.set('from', dates.from);
          params.set('to', dates.to);
        }
      }
      if (updates.from !== undefined) params.set('from', updates.from);
      if (updates.to !== undefined) params.set('to', updates.to);
      if (updates.regionId !== undefined) {
        if (updates.regionId === null) {
          params.delete('region');
        } else {
          params.set('region', String(updates.regionId));
        }
      }
      if (updates.tab !== undefined) params.set('tab', updates.tab);

      router.push(`${pathname}?${params.toString()}`);
    },
    [searchParams, router, pathname],
  );

  return { filters, setFilter };
}
