'use client';

import type { NoiseLevel } from '@/types';

const STYLES: Record<NoiseLevel, { bg: string; text: string; label: string }> = {
  quiet: { bg: 'bg-green-500/20', text: 'text-green-700', label: '조용' },
  normal: { bg: 'bg-yellow-500/20', text: 'text-yellow-700', label: '보통' },
  loud: { bg: 'bg-red-500/20', text: 'text-red-700', label: '시끄러움' },
  very_loud: { bg: 'bg-neutral-900/20', text: 'text-neutral-900', label: '매우 시끄러움' },
};

interface Props {
  level: NoiseLevel;
  avgNoise?: number;
  size?: 'sm' | 'md' | 'lg';
}

export function NoiseLevelBadge({ level, avgNoise, size = 'md' }: Props) {
  const style = STYLES[level];
  const sizeClass = { sm: 'px-2 py-0.5 text-xs', md: 'px-3 py-1 text-sm', lg: 'px-4 py-1.5 text-base' }[size];

  return (
    <span className={`inline-flex items-center gap-1 rounded-lg font-medium ${style.bg} ${style.text} ${sizeClass}`}>
      {style.label}
      {avgNoise != null && <span className="tabular-nums">{avgNoise}dB</span>}
    </span>
  );
}
