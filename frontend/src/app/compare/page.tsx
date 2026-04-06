'use client';

import { useState } from 'react';
import { RegionSearch } from '@/components/search/RegionSearch';
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
    if (loading) return (
      <div style={{ backgroundColor: 'var(--card-bg)', borderRadius: 12, border: '1px solid var(--border-color)', padding: 20 }}>
        <div className="animate-pulse"><div className="h-48 rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)' }} /></div>
      </div>
    );
    if (!detail) return (
      <div style={{ backgroundColor: 'var(--card-bg)', borderRadius: 12, border: '1px solid var(--border-color)', padding: 20 }}>
        <EmptyState message="지역을 선택하세요" />
      </div>
    );

    return (
      <div style={{ backgroundColor: 'var(--card-bg)', borderRadius: 12, border: '1px solid var(--border-color)', padding: 20 }}>
        <h3 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 4px', color: 'var(--text-primary)' }}>{detail.region.dongName}</h3>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: '0 0 14px' }}>{detail.region.districtName}</p>

        {/* Noise */}
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#22c55e', display: 'inline-block' }} />
            소음
          </p>
          {detail.noise ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)' }}>{detail.noise.avgNoise}dB</span>
              <NoiseLevelBadge level={detail.noise.noiseLevel} size="sm" />
            </div>
          ) : <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0 }}>데이터 없음</p>}
        </div>

        {/* Construction */}
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#f59e0b', display: 'inline-block' }} />
            공사장
          </p>
          <p style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
            {detail.constructionCount}건 <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-secondary)' }}>({detail.activeConstructions.length}건 진행중)</span>
          </p>
        </div>

        {/* Real Estate */}
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#8b5cf6', display: 'inline-block' }} />
            부동산
          </p>
          {detail.realEstate.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {detail.realEstate.map((re, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, padding: '4px 0', borderBottom: '1px solid var(--border-light)' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{re.tradeType === 'sale' ? '매매' : re.tradeType === 'jeonse' ? '전세' : '월세'}</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    {re.avgPrice >= 10000 ? `${(re.avgPrice / 10000).toFixed(1)}억` : `${re.avgPrice.toLocaleString()}만`}
                  </span>
                </div>
              ))}
            </div>
          ) : <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0 }}>데이터 없음</p>}
        </div>

        {/* Link to detail */}
        <a href={`/region/${detail.region.id}`} style={{
          display: 'block', textAlign: 'center', fontSize: 14, fontWeight: 500,
          color: 'var(--link-color)', marginTop: 16, textDecoration: 'none',
        }}>
          상세보기 →
        </a>
      </div>
    );
  }

  return (
    <main className="flex-1 overflow-y-auto p-4 lg:p-8 max-w-4xl mx-auto w-full">
      <h1 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 24px', color: 'var(--text-primary)' }}>지역 비교</h1>

      {/* Region selectors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4" style={{ marginBottom: 24 }}>
        <div>
          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 8px' }}>지역 A</p>
          <RegionSearch onSelect={handleSelectA} />
        </div>
        <div>
          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 8px' }}>지역 B</p>
          <RegionSearch onSelect={handleSelectB} />
        </div>
      </div>

      {/* vs separator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <div style={{ flex: 1, height: 1, backgroundColor: 'var(--border-color)' }} />
        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-tertiary)' }}>VS</span>
        <div style={{ flex: 1, height: 1, backgroundColor: 'var(--border-color)' }} />
      </div>

      {/* Comparison cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {renderRegionCard(regionA, loadingA)}
        {renderRegionCard(regionB, loadingB)}
      </div>
    </main>
  );
}
