'use client';

import { useState, useEffect } from 'react';
import { MapProvider, useMapContext } from '@/contexts/MapContext';
import { KakaoMap } from '@/components/map/KakaoMap';
import { NoisePolygonLayer } from '@/components/map/NoisePolygonLayer';

import { ConstructionDBMarkerLayer } from '@/components/map/ConstructionDBMarkerLayer';
import { api } from '@/lib/api';
import { getDefaultPeriod } from '@/lib/date-utils';
import type { PeriodFilter as PeriodFilterType, Region, RegionDetail, PeriodPreset } from '@/types';

/* ── Inline components (Tailwind-free for reliability) ── */

function SearchBar({ onSelect }: { onSelect: (r: Region) => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Region[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (query.length < 1) { setResults([]); return; }
    const t = setTimeout(() => {
      api.regions.search(query).then(d => { setResults(d.items || []); setOpen(true); }).catch(e => console.error('Search error:', e));
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  return (
    <div style={{ position: 'relative' }}>
      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="지역 검색 (예: 강남구 역삼동)"
        style={{
          width: '100%', padding: '10px 12px 10px 36px', border: '1px solid var(--input-border)',
          borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box',
          backgroundColor: 'var(--input-bg)', color: 'var(--text-primary)',
        }}
        onFocus={() => query && setOpen(true)}
      />
      <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: 14 }}>
        &#128269;
      </span>
      {open && results.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4,
          border: '1px solid var(--border-color)', borderRadius: 8, backgroundColor: 'var(--card-bg)',
          boxShadow: 'var(--shadow)', zIndex: 50, maxHeight: 240, overflowY: 'auto',
        }}>
          {results.map(r => (
            <button
              key={r.id}
              onClick={() => { onSelect(r); setQuery(`${r.districtName} ${r.dongName}`); setOpen(false); }}
              style={{
                display: 'flex', justifyContent: 'space-between', width: '100%',
                padding: '10px 14px', border: 'none', backgroundColor: 'var(--card-bg)',
                cursor: 'pointer', textAlign: 'left', fontSize: 14, color: 'var(--text-primary)',
              }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'var(--card-bg)')}
            >
              <span style={{ fontWeight: 500 }}>{r.dongName}</span>
              <span style={{ color: 'var(--text-muted)' }}>{r.districtName}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function PeriodChips({ value, onChange }: { value: PeriodFilterType; onChange: (v: PeriodFilterType) => void }) {
  const presets: { key: PeriodPreset; label: string }[] = [
    { key: '3m', label: '3개월' }, { key: '6m', label: '6개월' }, { key: '12m', label: '12개월' },
  ];
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {presets.map(p => (
        <button
          key={p.key}
          onClick={() => onChange({ preset: p.key, ...getDefaultPeriod(p.key) })}
          style={{
            padding: '4px 14px', borderRadius: 20, fontSize: 12, fontWeight: 500, border: 'none', cursor: 'pointer',
            backgroundColor: value.preset === p.key ? '#2563eb' : '#f5f5f5',
            color: value.preset === p.key ? '#fff' : '#525252',
          }}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}

const NOISE_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  quiet: { bg: '#dcfce7', color: '#15803d', label: '조용' },
  normal: { bg: '#fef9c3', color: '#a16207', label: '보통' },
  loud: { bg: '#fee2e2', color: '#b91c1c', label: '시끄러움' },
  very_loud: { bg: '#e5e5e5', color: '#171717', label: '매우 시끄러움' },
};

function InfoPanel({ detail, loading }: { detail: RegionDetail | null; loading: boolean }) {
  const [tab, setTab] = useState<'noise' | 'construction' | 'realEstate'>('noise');

  if (loading) {
    return (
      <div style={{ padding: 24, backgroundColor: 'var(--card-bg)', borderRadius: 12, border: '1px solid var(--border-color)' }}>
        <div style={{ height: 120, backgroundColor: 'var(--bg-tertiary)', borderRadius: 8, animation: 'pulse 2s infinite' }} />
      </div>
    );
  }

  if (!detail) {
    return (
      <div style={{ padding: 32, backgroundColor: 'var(--card-bg)', borderRadius: 12, border: '1px solid var(--border-color)', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>지도에서 지역을 클릭하거나<br />검색으로 지역을 선택하세요</p>
      </div>
    );
  }

  const tabs = [
    { key: 'noise' as const, label: '소음' },
    { key: 'construction' as const, label: '공사장' },
    { key: 'realEstate' as const, label: '부동산' },
  ];

  return (
    <div style={{ backgroundColor: 'var(--card-bg)', borderRadius: 12, border: '1px solid var(--border-color)', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '16px 16px 8px' }}>
        <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{detail.region.dongName}</h3>
        <p style={{ fontSize: 14, color: 'var(--text-tertiary)', margin: '2px 0 0' }}>{detail.region.districtName}</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #e5e5e5' }}>
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              flex: 1, padding: '10px 0', fontSize: 14, fontWeight: 500, border: 'none', cursor: 'pointer',
              backgroundColor: 'var(--bg-primary)',
              color: tab === t.key ? '#2563eb' : '#737373',
              borderBottom: tab === t.key ? '2px solid #2563eb' : '2px solid transparent',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: 16 }}>
        {tab === 'noise' && (
          detail.noise ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontSize: 32, fontWeight: 800 }}>{detail.noise.avgNoise}dB</span>
                <span style={{
                  padding: '4px 12px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                  backgroundColor: NOISE_STYLES[detail.noise.noiseLevel]?.bg || '#f5f5f5',
                  color: NOISE_STYLES[detail.noise.noiseLevel]?.color || '#333',
                }}>
                  {NOISE_STYLES[detail.noise.noiseLevel]?.label || detail.noise.noiseLevel}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text-tertiary)', marginBottom: 6 }}>
                <span>측정 건수</span><span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{detail.noise.sampleCount?.toLocaleString()}건</span>
              </div>
              {/* Noise bar */}
              <div style={{ marginTop: 12, height: 8, backgroundColor: '#e5e5e5', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 4, transition: 'width 0.3s',
                  width: `${Math.min((detail.noise.avgNoise / 80) * 100, 100)}%`,
                  backgroundColor: detail.noise.noiseColor === 'green' ? '#22c55e' : detail.noise.noiseColor === 'yellow' ? '#eab308' : detail.noise.noiseColor === 'red' ? '#ef4444' : '#171717',
                }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                <span>0dB</span><span>40</span><span>60</span><span>80dB</span>
              </div>
            </div>
          ) : <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>소음 데이터가 없습니다</p>
        )}

        {tab === 'construction' && (
          <div>
            <p style={{ fontSize: 28, fontWeight: 800, margin: '0 0 4px' }}>{detail.constructionCount}건</p>
            <p style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>진행 중: {detail.activeConstructions.length}건</p>
            {detail.activeConstructions.slice(0, 3).map(c => (
              <div key={c.id} style={{ marginTop: 8, padding: 10, backgroundColor: 'var(--bg-secondary)', borderRadius: 8, fontSize: 12 }}>
                <p style={{ fontWeight: 600, margin: 0 }}>{c.projectName}</p>
                <p style={{ color: 'var(--text-muted)', margin: '4px 0 0' }}>{c.address}</p>
              </div>
            ))}
          </div>
        )}

        {tab === 'realEstate' && (() => {
          const formatPrice = (v: number) =>
            v >= 10000 ? `${(v / 10000).toFixed(1)}억` : `${v.toLocaleString()}만`;
          const BLDG_LABELS: Record<string, string> = { apartment: '아파트', multiplex: '연립다세대', officetel: '오피스텔' };
          const BLDG_ORDER = ['apartment', 'multiplex', 'officetel'];
          const grouped = BLDG_ORDER
            .map(bt => ({ bt, label: BLDG_LABELS[bt], items: detail.realEstate.filter(re => re.buildingType === bt) }))
            .filter(g => g.items.length > 0);

          return (
          <div>
            {detail.realEstate.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>데이터 없음</p>}
            {grouped.map(group => (
              <div key={group.bt} style={{ marginBottom: 16 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 8px', paddingBottom: 6, borderBottom: '2px solid var(--border-color)' }}>
                  {group.label}
                </p>
                {group.items.map((re, i) => {
                  const label = re.tradeType === 'sale' ? '매매' : re.tradeType === 'jeonse' ? '전세' : '월세';
                  const labelColor = re.tradeType === 'jeonse' ? '#2563eb' : re.tradeType === 'monthly' ? '#ea580c' : '#15803d';
                  return (
                    <div key={i} style={{ padding: '8px 0', borderBottom: '1px solid var(--border-light)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{
                          display: 'inline-block', padding: '2px 8px', borderRadius: 4, fontSize: 12, fontWeight: 600,
                          backgroundColor: `${labelColor}15`, color: labelColor,
                        }}>{label}</span>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>최근 {re.tradeCount}건</span>
                      </div>
                      {re.tradeType === 'monthly' ? (
                        <>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 4 }}>
                            <span style={{ fontSize: 12, color: 'var(--text-tertiary)', minWidth: 70 }}>평균 보증금</span>
                            <span style={{ fontSize: 16, fontWeight: 700 }}>{formatPrice(re.avgPrice)}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 4 }}>
                            <span style={{ fontSize: 12, color: 'var(--text-tertiary)', minWidth: 70 }}>평균 월세</span>
                            <span style={{ fontSize: 16, fontWeight: 700, color: '#ea580c' }}>
                              {re.avgMonthlyRent != null && re.avgMonthlyRent > 0 ? `${re.avgMonthlyRent.toLocaleString()}만` : '-'}
                            </span>
                          </div>
                        </>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 4 }}>
                          <span style={{ fontSize: 12, color: 'var(--text-tertiary)', minWidth: 70 }}>평균 보증금</span>
                          <span style={{ fontSize: 16, fontWeight: 700 }}>{formatPrice(re.avgPrice)}</span>
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--text-tertiary)' }}>
                        <span>최저 <b style={{ color: 'var(--text-secondary)' }}>{formatPrice(re.minPrice)}</b></span>
                        <span>최고 <b style={{ color: 'var(--text-secondary)' }}>{formatPrice(re.maxPrice)}</b></span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
            <a
              href={`https://new.land.naver.com/search?ms=${detail.region.latitude},${detail.region.longitude},16&a=APT:ABYG:JGC:PRE&e=RETAIL`}
              target="_blank" rel="noopener noreferrer"
              style={{
                display: 'block', textAlign: 'center', marginTop: 12, padding: '10px 0',
                fontSize: 14, fontWeight: 500, color: '#15803d', border: '1px solid #bbf7d0',
                borderRadius: 8, textDecoration: 'none',
              }}
            >
              네이버 부동산에서 매물 보기
            </a>
          </div>
          );
        })()}
      </div>
    </div>
  );
}

/* ── Main page ── */

function MainContent() {
  const { map, selectedRegionId, setSelectedRegionId } = useMapContext();
  const [period, setPeriod] = useState<PeriodFilterType>({ preset: '3m', ...getDefaultPeriod('3m') });
  const [regionDetail, setRegionDetail] = useState<RegionDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (selectedRegionId == null) { setRegionDetail(null); return; }
    setIsLoading(true);
    api.regions.detail(selectedRegionId, { from: period.from, to: period.to })
      .then(setRegionDetail)
      .catch(() => setRegionDetail(null))
      .finally(() => setIsLoading(false));
  }, [selectedRegionId, period]);

  return (
    <>
      {/* Side panel */}
      <aside style={{
        width: 400, flexShrink: 0, overflowY: 'auto', borderRight: '1px solid var(--border-color)',
        backgroundColor: 'var(--bg-primary)', padding: 20, display: 'flex', flexDirection: 'column', gap: 16,
        transition: 'background-color 0.2s, border-color 0.2s',
      }}>
        <SearchBar onSelect={(r) => {
          setSelectedRegionId(r.id);
          if (map && r.latitude && r.longitude) {
            map.setCenter(new window.kakao.maps.LatLng(r.latitude, r.longitude));
            map.setLevel(5);
          }
        }} />

        <div>
          <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-tertiary)', marginBottom: 6 }}>조회 기간</p>
          <PeriodChips value={period} onChange={setPeriod} />
        </div>

        <InfoPanel detail={regionDetail} loading={isLoading} />

        {/* Link to detail page */}
        {regionDetail && (
          <a
            href={`/region/${regionDetail.region.id}`}
            style={{
              display: 'block', textAlign: 'center', padding: '10px 0',
              fontSize: 14, fontWeight: 500, color: '#2563eb', border: '1px solid #bfdbfe',
              borderRadius: 8, textDecoration: 'none',
            }}
          >
            상세 페이지로 이동
          </a>
        )}
      </aside>

      {/* Map area */}
      <div style={{ flex: 1, position: 'relative', backgroundColor: 'var(--bg-map)' }}>
        <KakaoMap />
        <NoisePolygonLayer />
        <ConstructionDBMarkerLayer />

        {/* Legend overlay */}
        <div style={{
          position: 'fixed', bottom: 16, right: 16, zIndex: 10,
          backgroundColor: 'var(--legend-bg)', borderRadius: 10,
          border: '1px solid var(--border-color)', padding: 12, boxShadow: 'var(--shadow)',
        }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8, marginTop: 0 }}>소음 수준</p>
          {[
            { label: '조용 (<50dB)', color: '#22c55e' },
            { label: '보통 (50-60dB)', color: '#eab308' },
            { label: '시끄러움 (60-70dB)', color: '#ef4444' },
            { label: '매우 시끄러움 (>70dB)', color: '#171717' },
          ].map(item => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: item.color, opacity: 0.7, display: 'inline-block' }} />
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{item.label}</span>
            </div>
          ))}
        </div>

        {/* Fallback when map not loaded */}
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none',
        }}>
          {/* KakaoMap component handles its own loading state */}
        </div>
      </div>
    </>
  );
}

export default function Home() {
  return (
    <MapProvider>
      <MainContent />
    </MapProvider>
  );
}
