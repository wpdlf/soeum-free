import { api } from '@/lib/api';
import Link from 'next/link';
import { ConstructionList } from '@/components/ui/ConstructionList';

interface Props {
  params: Promise<{ id: string }>;
}

const NOISE_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  quiet: { bg: '#dcfce7', color: '#15803d', label: '조용' },
  normal: { bg: '#fef9c3', color: '#a16207', label: '보통' },
  loud: { bg: '#fee2e2', color: '#b91c1c', label: '시끄러움' },
  very_loud: { bg: '#e5e5e5', color: '#171717', label: '매우 시끄러움' },
};

function formatPrice(v: number) {
  return v >= 10000 ? `${(v / 10000).toFixed(1)}억` : `${v.toLocaleString()}만`;
}

export default async function RegionDetailPage({ params }: Props) {
  const { id } = await params;

  let detail;
  try {
    detail = await api.regions.detail(Number(id));
  } catch {
    return (
      <main style={{ padding: 40, textAlign: 'center' }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: 16 }}>지역 정보를 불러올 수 없습니다</p>
        <a href="/" style={{ color: 'var(--link-color)', fontSize: 14, marginTop: 12, display: 'inline-block' }}>← 메인으로 돌아가기</a>
      </main>
    );
  }

  const { region, noise, constructionCount, activeConstructions, realEstate } = detail;
  const noiseStyle = noise ? NOISE_STYLES[noise.noiseLevel] : null;

  return (
    <main style={{ flex: 1, overflowY: 'auto', padding: '24px 32px', maxWidth: 960, margin: '0 auto', width: '100%' }}>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-tertiary)', marginBottom: 16 }}>
        <a href="/" style={{ color: 'var(--link-color)', textDecoration: 'none' }}>메인</a>
        <span>/</span>
        <span>{region.districtName}</span>
        <span>/</span>
        <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{region.dongName}</span>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>{region.dongName}</h1>
        <span style={{ fontSize: 16, color: 'var(--text-secondary)' }}>{region.districtName}</span>
        {noiseStyle && (
          <span style={{
            padding: '4px 12px', borderRadius: 6, fontSize: 13, fontWeight: 600,
            backgroundColor: noiseStyle.bg, color: noiseStyle.color,
          }}>
            {noise!.avgNoise}dB · {noiseStyle.label}
          </span>
        )}
      </div>

      {/* Cards grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>

        {/* Noise card */}
        <div style={{ backgroundColor: 'var(--card-bg)', borderRadius: 12, border: '1px solid var(--border-color)', padding: 20 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#22c55e', display: 'inline-block' }} />
            소음 정보
          </h2>
          {noise ? (
            <div>
              <p style={{ fontSize: 32, fontWeight: 800, margin: '0 0 8px', color: 'var(--text-primary)' }}>{noise.avgNoise}dB</p>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
                <p style={{ margin: 0 }}>측정 건수: <b style={{ color: 'var(--text-primary)' }}>{noise.sampleCount.toLocaleString()}건</b></p>
                <p style={{ margin: 0 }}>기간: {noise.periodStart} ~ {noise.periodEnd}</p>
              </div>
              <div style={{ marginTop: 14, height: 8, backgroundColor: 'var(--bg-tertiary)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 4,
                  width: `${Math.min((noise.avgNoise / 80) * 100, 100)}%`,
                  backgroundColor: noise.noiseColor === 'green' ? '#22c55e' : noise.noiseColor === 'yellow' ? '#eab308' : noise.noiseColor === 'red' ? '#ef4444' : '#171717',
                }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4 }}>
                <span>0dB</span><span>40</span><span>60</span><span>80dB</span>
              </div>
            </div>
          ) : (
            <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>데이터 없음</p>
          )}
        </div>

        {/* Construction card */}
        <div style={{ backgroundColor: 'var(--card-bg)', borderRadius: 12, border: '1px solid var(--border-color)', padding: 20 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#f59e0b', display: 'inline-block' }} />
            공사장 현황
          </h2>
          <p style={{ fontSize: 32, fontWeight: 800, margin: '0 0 4px', color: 'var(--text-primary)' }}>{constructionCount}건</p>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 12px' }}>진행 중: <b style={{ color: 'var(--text-primary)' }}>{activeConstructions.length}건</b></p>
          {activeConstructions.length > 0 && (
            <ConstructionList items={activeConstructions} />
          )}
        </div>

        {/* Real estate card */}
        <div style={{ backgroundColor: 'var(--card-bg)', borderRadius: 12, border: '1px solid var(--border-color)', padding: 20 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#8b5cf6', display: 'inline-block' }} />
            부동산 전월세
          </h2>
          {(() => {
            const BLDG_LABELS: Record<string, string> = { apartment: '아파트', multiplex: '연립다세대', officetel: '오피스텔' };
            const BLDG_ORDER = ['apartment', 'multiplex', 'officetel'];
            const grouped = BLDG_ORDER
              .map(bt => ({ bt, label: BLDG_LABELS[bt], items: realEstate.filter(re => re.buildingType === bt) }))
              .filter(g => g.items.length > 0);

            if (grouped.length === 0) return <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>데이터 없음</p>;

            return (
              <div>
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
                              padding: '2px 8px', borderRadius: 4, fontSize: 12, fontWeight: 600,
                              backgroundColor: `${labelColor}15`, color: labelColor,
                            }}>{label}</span>
                            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>최근 {re.tradeCount}건</span>
                          </div>
                          {re.tradeType === 'monthly' ? (
                            <>
                              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 4 }}>
                                <span style={{ fontSize: 12, color: 'var(--text-secondary)', minWidth: 70 }}>평균 보증금</span>
                                <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>{formatPrice(re.avgPrice)}</span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 4 }}>
                                <span style={{ fontSize: 12, color: 'var(--text-secondary)', minWidth: 70 }}>평균 월세</span>
                                <span style={{ fontSize: 16, fontWeight: 700, color: '#ea580c' }}>
                                  {re.avgMonthlyRent != null && re.avgMonthlyRent > 0 ? `${re.avgMonthlyRent.toLocaleString()}만` : '-'}
                                </span>
                              </div>
                            </>
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 4 }}>
                              <span style={{ fontSize: 12, color: 'var(--text-secondary)', minWidth: 70 }}>평균 보증금</span>
                              <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>{formatPrice(re.avgPrice)}</span>
                            </div>
                          )}
                          <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--text-secondary)' }}>
                            <span>최저 <b style={{ color: 'var(--text-primary)' }}>{formatPrice(re.minPrice)}</b></span>
                            <span>최고 <b style={{ color: 'var(--text-primary)' }}>{formatPrice(re.maxPrice)}</b></span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
                <a
                  href={`https://new.land.naver.com/search?ms=${region.latitude},${region.longitude},16&a=APT:ABYG:JGC:PRE&e=RETAIL`}
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

      {/* Back link */}
      <div style={{ marginTop: 24 }}>
        <a href="/" style={{ fontSize: 14, color: 'var(--link-color)', textDecoration: 'none' }}>← 메인으로 돌아가기</a>
      </div>
    </main>
  );
}
