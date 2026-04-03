import { api } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { NoiseLevelBadge } from '@/components/ui/NoiseLevelBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import Link from 'next/link';

// NOTE: This is a Server Component (no 'use client')
// It fetches data on the server side

interface Props {
  params: Promise<{ id: string }>;
}

export default async function RegionDetailPage({ params }: Props) {
  const { id } = await params;

  let detail;
  try {
    detail = await api.regions.detail(Number(id));
  } catch {
    return (
      <main className="p-6">
        <EmptyState message="지역 정보를 불러올 수 없습니다" />
      </main>
    );
  }

  const { region, noise, constructionCount, activeConstructions, realEstate } = detail;

  return (
    <main className="flex-1 overflow-y-auto p-4 lg:p-8 max-w-6xl mx-auto w-full">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-neutral-500 mb-4">
        <Link href="/" className="hover:text-blue-600 transition-colors">메인</Link>
        <span>/</span>
        <span>{region.districtName}</span>
        <span>/</span>
        <span className="text-neutral-900 font-medium">{region.dongName}</span>
      </div>

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold">{region.dongName}</h1>
        <span className="text-lg text-neutral-500">{region.districtName}</span>
        {noise && <NoiseLevelBadge level={noise.noiseLevel} avgNoise={noise.avgNoise} size="lg" />}
      </div>

      {/* 3-column grid on desktop, single column on mobile */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Noise card */}
        <Card>
          <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            소음 정보
          </h2>
          {noise ? (
            <div>
              <p className="text-3xl font-bold tabular-nums">{noise.avgNoise}dB</p>
              <p className="text-sm text-neutral-500 mt-1">측정 건수: {noise.sampleCount.toLocaleString()}건</p>
              <p className="text-sm text-neutral-500">기간: {noise.periodStart} ~ {noise.periodEnd}</p>
              {/* Noise bar */}
              <div className="mt-3 h-2 rounded-full bg-neutral-200 overflow-hidden">
                <div className="h-full rounded-full" style={{
                  width: `${Math.min((noise.avgNoise / 80) * 100, 100)}%`,
                  backgroundColor: noise.noiseColor === 'green' ? '#22c55e' : noise.noiseColor === 'yellow' ? '#eab308' : noise.noiseColor === 'red' ? '#ef4444' : '#171717',
                }} />
              </div>
            </div>
          ) : (
            <p className="text-sm text-neutral-400">데이터 없음</p>
          )}
        </Card>

        {/* Construction card */}
        <Card>
          <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            공사장 현황
          </h2>
          <p className="text-3xl font-bold tabular-nums">{constructionCount}건</p>
          <p className="text-sm text-neutral-500 mt-1">진행 중: {activeConstructions.length}건</p>
          {activeConstructions.length > 0 && (
            <div className="mt-3 space-y-2">
              {activeConstructions.slice(0, 5).map(c => (
                <div key={c.id} className="p-2 bg-neutral-50 rounded-lg text-xs">
                  <p className="font-medium">{c.projectName}</p>
                  <p className="text-neutral-400 mt-0.5">{c.address}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <span className={`px-1.5 py-0.5 rounded text-xs ${
                      c.status === 'in_progress' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {c.status === 'in_progress' ? '진행중' : '허가'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Real estate card */}
        <Card>
          <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-violet-500" />
            부동산 실거래가
          </h2>
          {realEstate.length > 0 ? (
            <div className="space-y-3">
              {realEstate.map((re, i) => (
                <div key={i} className="flex justify-between items-center py-1 border-b border-neutral-100 last:border-0">
                  <span className="text-sm font-medium">
                    {re.tradeType === 'sale' ? '매매' : re.tradeType === 'jeonse' ? '전세' : '월세'}
                  </span>
                  <div className="text-right">
                    <span className="text-sm font-bold tabular-nums">
                      {re.avgPrice >= 10000 ? `${(re.avgPrice / 10000).toFixed(1)}억` : `${re.avgPrice.toLocaleString()}만`}
                    </span>
                    <span className="text-xs text-neutral-400 ml-1">({re.tradeCount}건)</span>
                  </div>
                </div>
              ))}
              {/* Naver link */}
              <a
                href={`https://land.naver.com/search/result.naver?query=${encodeURIComponent(region.districtName + ' ' + region.dongName)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-2 text-sm font-medium text-green-700 border border-green-200 rounded-lg hover:bg-green-50 transition-colors"
              >
                네이버 부동산에서 매물 보기
              </a>
            </div>
          ) : (
            <p className="text-sm text-neutral-400">데이터 없음</p>
          )}
        </Card>
      </div>

      {/* Back link */}
      <div className="mt-6">
        <Link href="/" className="text-sm text-blue-600 hover:text-blue-700 transition-colors">
          ← 메인으로 돌아가기
        </Link>
      </div>
    </main>
  );
}
