'use client';

import { useState } from 'react';
import { RegionSearch } from '@/components/search/RegionSearch';
import { Card } from '@/components/ui/Card';
import { NoiseLevelBadge } from '@/components/ui/NoiseLevelBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { api } from '@/lib/api';
import type { Region, RegionDetail } from '@/types';

export default function ComparePage() {
  const [regionA, setRegionA] = useState<RegionDetail | null>(null);
  const [regionB, setRegionB] = useState<RegionDetail | null>(null);
  const [loadingA, setLoadingA] = useState(false);
  const [loadingB, setLoadingB] = useState(false);

  async function handleSelectA(region: Region) {
    setLoadingA(true);
    try { setRegionA(await api.regions.detail(region.id)); } catch { setRegionA(null); }
    setLoadingA(false);
  }

  async function handleSelectB(region: Region) {
    setLoadingB(true);
    try { setRegionB(await api.regions.detail(region.id)); } catch { setRegionB(null); }
    setLoadingB(false);
  }

  function renderRegionCard(detail: RegionDetail | null, loading: boolean) {
    if (loading) return <Card className="animate-pulse"><div className="h-48 bg-neutral-200 rounded-lg" /></Card>;
    if (!detail) return <Card><EmptyState message="지역을 선택하세요" /></Card>;

    return (
      <Card>
        <h3 className="text-lg font-bold">{detail.region.dongName}</h3>
        <p className="text-sm text-neutral-500 mb-3">{detail.region.districtName}</p>

        {/* Noise */}
        <div className="mb-4">
          <p className="text-xs font-medium text-neutral-500 mb-1">소음</p>
          {detail.noise ? (
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold tabular-nums">{detail.noise.avgNoise}dB</span>
              <NoiseLevelBadge level={detail.noise.noiseLevel} size="sm" />
            </div>
          ) : <p className="text-sm text-neutral-400">데이터 없음</p>}
        </div>

        {/* Construction */}
        <div className="mb-4">
          <p className="text-xs font-medium text-neutral-500 mb-1">공사장</p>
          <p className="text-lg font-bold">{detail.constructionCount}건 <span className="text-sm font-normal text-neutral-500">({detail.activeConstructions.length}건 진행중)</span></p>
        </div>

        {/* Real Estate */}
        <div>
          <p className="text-xs font-medium text-neutral-500 mb-1">부동산</p>
          {detail.realEstate.length > 0 ? (
            <div className="space-y-1">
              {detail.realEstate.map((re, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span>{re.tradeType === 'sale' ? '매매' : re.tradeType === 'jeonse' ? '전세' : '월세'}</span>
                  <span className="font-medium tabular-nums">
                    {re.avgPrice >= 10000 ? `${(re.avgPrice / 10000).toFixed(1)}억` : `${re.avgPrice.toLocaleString()}만`}
                  </span>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-neutral-400">데이터 없음</p>}
        </div>

        {/* Link to detail */}
        <a href={`/region/${detail.region.id}`} className="block text-center text-sm text-blue-600 mt-4 hover:text-blue-700">
          상세보기 →
        </a>
      </Card>
    );
  }

  return (
    <main className="flex-1 overflow-y-auto p-4 lg:p-8 max-w-4xl mx-auto w-full">
      <h1 className="text-2xl font-bold mb-6">지역 비교</h1>

      {/* Region selectors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <p className="text-sm font-medium text-neutral-600 mb-2">지역 A</p>
          <RegionSearch onSelect={handleSelectA} />
        </div>
        <div>
          <p className="text-sm font-medium text-neutral-600 mb-2">지역 B</p>
          <RegionSearch onSelect={handleSelectB} />
        </div>
      </div>

      {/* vs separator */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1 h-px bg-neutral-200" />
        <span className="text-sm font-bold text-neutral-400">VS</span>
        <div className="flex-1 h-px bg-neutral-200" />
      </div>

      {/* Comparison cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {renderRegionCard(regionA, loadingA)}
        {renderRegionCard(regionB, loadingB)}
      </div>
    </main>
  );
}
