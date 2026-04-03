import type { NoiseSummary } from '@/types';
import { NoiseLevelBadge } from '@/components/ui/NoiseLevelBadge';

interface Props {
  noise: NoiseSummary | null;
}

export function NoiseTab({ noise }: Props) {
  if (!noise) return <p className="text-sm text-neutral-400">소음 데이터가 없습니다</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-3xl font-bold tabular-nums">{noise.avgNoise}dB</span>
        <NoiseLevelBadge level={noise.noiseLevel} size="lg" />
      </div>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-neutral-500">측정 건수</span>
          <span className="font-medium tabular-nums">{noise.sampleCount.toLocaleString()}건</span>
        </div>
        <div className="flex justify-between">
          <span className="text-neutral-500">측정 기간</span>
          <span className="font-medium">{noise.periodStart} ~ {noise.periodEnd}</span>
        </div>
      </div>
      {/* Noise level bar */}
      <div className="mt-4">
        <div className="h-2 rounded-full bg-neutral-200 overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${Math.min((noise.avgNoise / 80) * 100, 100)}%`,
              backgroundColor: noise.noiseColor === 'green' ? '#22c55e' : noise.noiseColor === 'yellow' ? '#eab308' : noise.noiseColor === 'red' ? '#ef4444' : '#171717',
            }}
          />
        </div>
        <div className="flex justify-between mt-1 text-xs text-neutral-400">
          <span>0dB</span>
          <span>40</span>
          <span>60</span>
          <span>80dB</span>
        </div>
      </div>
    </div>
  );
}
