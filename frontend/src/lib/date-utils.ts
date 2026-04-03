import type { PeriodPreset } from '@/types';

export function getDefaultPeriod(preset: PeriodPreset): { from: string; to: string } {
  const today = new Date();
  const to = formatToISODate(today);

  switch (preset) {
    case '3m': {
      const from = new Date(today);
      from.setMonth(from.getMonth() - 3);
      return { from: formatToISODate(from), to };
    }
    case '6m': {
      const from = new Date(today);
      from.setMonth(from.getMonth() - 6);
      return { from: formatToISODate(from), to };
    }
    case '12m': {
      const from = new Date(today);
      from.setMonth(from.getMonth() - 12);
      return { from: formatToISODate(from), to };
    }
    case 'custom':
      return { from: to, to };
  }
}

function formatToISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatDate(date: string): string {
  const [y, m, d] = date.split('-');
  return `${y}.${m}.${d}`;
}

export function formatDateRange(from: string, to: string): string {
  const [fy, fm] = from.split('-');
  const [ty, tm] = to.split('-');
  return `${fy}.${fm} ~ ${ty}.${tm}`;
}
