'use client';
import { colors } from '@/lib/design-tokens';

const LEGEND_ITEMS = [
  { label: '조용 (<50dB)', color: colors.noise.quiet },
  { label: '보통 (50-60dB)', color: colors.noise.normal },
  { label: '시끄러움 (60-70dB)', color: colors.noise.loud },
  { label: '매우 시끄러움 (>70dB)', color: colors.noise.veryLoud },
];

export function MapLegend() {
  return (
    <div className="absolute bottom-4 right-4 z-10 rounded-lg bg-white/90 backdrop-blur-sm border border-neutral-200 p-3 shadow-md">
      <p className="text-xs font-semibold text-neutral-700 mb-2">소음 수준</p>
      <div className="space-y-1.5">
        {LEGEND_ITEMS.map(item => (
          <div key={item.label} className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-sm inline-block" style={{ backgroundColor: item.color, opacity: 0.7 }} />
            <span className="text-xs text-neutral-600">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
