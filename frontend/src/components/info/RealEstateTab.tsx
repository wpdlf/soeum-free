import type { RealEstateSummary } from '@/types';
import { formatPrice } from '@/lib/format';
import { NaverLinkButton } from '@/components/ui/NaverLinkButton';

interface Props {
  realEstate: RealEstateSummary[];
  districtName: string;
  dongName: string;
}

const TRADE_LABELS: Record<string, string> = {
  sale: '매매',
  jeonse: '전세',
  monthly: '월세',
};

const TRADE_COLORS: Record<string, string> = {
  sale: 'border-l-violet-500',
  jeonse: 'border-l-cyan-500',
  monthly: 'border-l-orange-500',
};

export function RealEstateTab({ realEstate, districtName, dongName }: Props) {
  if (realEstate.length === 0) {
    return <p className="text-sm text-neutral-400">부동산 데이터가 없습니다</p>;
  }

  return (
    <div>
      <div className="space-y-3">
        {realEstate.map((summary) => {
          const label = TRADE_LABELS[summary.tradeType] ?? summary.tradeType;
          const borderColor = TRADE_COLORS[summary.tradeType] ?? 'border-l-neutral-300';

          return (
            <div
              key={summary.tradeType}
              className={`border-l-4 ${borderColor} bg-neutral-50 rounded-r-lg p-3`}
            >
              <div className="flex items-baseline justify-between mb-1">
                <span className="text-xs font-medium text-neutral-500">{label}</span>
                <span className="text-lg font-bold tabular-nums">
                  {formatPrice(summary.avgPrice)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-neutral-400">
                <span>
                  {formatPrice(summary.minPrice)} ~ {formatPrice(summary.maxPrice)}
                </span>
                <span className="tabular-nums">{summary.tradeCount.toLocaleString()}건</span>
              </div>
            </div>
          );
        })}
      </div>

      <NaverLinkButton districtName={districtName} dongName={dongName} />
    </div>
  );
}
