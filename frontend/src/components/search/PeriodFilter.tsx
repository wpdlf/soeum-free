'use client';

import { useState } from 'react';
import type { PeriodPreset, PeriodFilter as PeriodFilterType } from '@/types';
import { getDefaultPeriod } from '@/lib/date-utils';

interface Props {
  value: PeriodFilterType;
  onChange: (filter: PeriodFilterType) => void;
}

const PRESETS: { key: PeriodPreset; label: string }[] = [
  { key: '3m', label: '3개월' },
  { key: '6m', label: '6개월' },
  { key: '12m', label: '12개월' },
  { key: 'custom', label: '커스텀' },
];

export function PeriodFilter({ value, onChange }: Props) {
  const [showCustom, setShowCustom] = useState(value.preset === 'custom');

  function handlePreset(preset: PeriodPreset) {
    if (preset === 'custom') {
      setShowCustom(true);
      onChange({ ...value, preset: 'custom' });
    } else {
      setShowCustom(false);
      const period = getDefaultPeriod(preset);
      onChange({ preset, ...period });
    }
  }

  return (
    <div>
      <div className="flex gap-2">
        {PRESETS.map(p => (
          <button
            key={p.key}
            onClick={() => handlePreset(p.key)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              value.preset === p.key
                ? 'bg-blue-600 text-white'
                : 'border border-neutral-300 bg-white text-neutral-600 hover:bg-neutral-50'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
      {showCustom && (
        <div className="mt-2 flex items-center gap-2">
          <input type="date" value={value.from} onChange={e => onChange({ ...value, from: e.target.value })}
            className="rounded-md border border-neutral-300 px-2 py-1 text-xs" />
          <span className="text-neutral-400 text-xs">~</span>
          <input type="date" value={value.to} onChange={e => onChange({ ...value, to: e.target.value })}
            className="rounded-md border border-neutral-300 px-2 py-1 text-xs" />
        </div>
      )}
    </div>
  );
}
