'use client';

import type { MapLayerVisibility } from '@/types';

interface Props {
  visibility: MapLayerVisibility;
  onChange: (v: MapLayerVisibility) => void;
}

const LAYERS = [
  { key: 'noise' as const, label: '소음', color: 'bg-green-500' },
  { key: 'construction' as const, label: '공사장', color: 'bg-amber-500' },
  { key: 'realEstate' as const, label: '부동산', color: 'bg-violet-500' },
];

export function MapLayerToggle({ visibility, onChange }: Props) {
  return (
    <div className="flex gap-2">
      {LAYERS.map(layer => (
        <button
          key={layer.key}
          onClick={() => onChange({ ...visibility, [layer.key]: !visibility[layer.key] })}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            visibility[layer.key]
              ? `${layer.color} text-white`
              : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200'
          }`}
        >
          {layer.label}
        </button>
      ))}
    </div>
  );
}
