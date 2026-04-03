import type { ConstructionPermit } from '@/types';

interface Props {
  totalCount: number;
  activeConstructions: ConstructionPermit[];
}

const STATUS_LABELS: Record<string, { label: string; class: string }> = {
  permitted: { label: '허가', class: 'bg-amber-100 text-amber-700' },
  in_progress: { label: '진행중', class: 'bg-red-100 text-red-700' },
  completed: { label: '완료', class: 'bg-neutral-100 text-neutral-600' },
};

export function ConstructionTab({ totalCount, activeConstructions }: Props) {
  return (
    <div>
      {/* Summary */}
      <div className="flex items-baseline gap-2 mb-4">
        <span className="text-3xl font-bold tabular-nums">{totalCount}</span>
        <span className="text-sm text-neutral-500">건</span>
        {activeConstructions.length > 0 && (
          <span className="text-sm text-red-500 font-medium">
            (진행중 {activeConstructions.filter((c) => c.status === 'in_progress').length}건)
          </span>
        )}
      </div>

      {/* Active construction list */}
      {activeConstructions.length === 0 ? (
        <p className="text-sm text-neutral-400">진행 중인 공사가 없습니다</p>
      ) : (
        <ul className="space-y-3">
          {activeConstructions.slice(0, 5).map((c) => {
            const statusInfo = STATUS_LABELS[c.status] ?? STATUS_LABELS.permitted;
            return (
              <li key={c.id} className="border border-neutral-100 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-sm truncate flex-1">{c.projectName}</span>
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusInfo.class}`}
                  >
                    {statusInfo.label}
                  </span>
                </div>
                <p className="text-xs text-neutral-500 truncate">{c.address}</p>
                <p className="text-xs text-neutral-400 mt-0.5">
                  {c.startDate ?? '미정'} ~ {c.endDate ?? '진행중'}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
