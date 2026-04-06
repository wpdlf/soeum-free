'use client';

import { useState, useRef, useEffect } from 'react';
import { useRegionSearch } from '@/hooks/useRegionSearch';
import type { Region } from '@/types';

interface Props {
  onSelect: (region: Region) => void;
}

export function RegionSearch({ onSelect }: Props) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const { data, isLoading } = useRegionSearch(query);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const items = data?.items ?? [];

  return (
    <div ref={wrapperRef} style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: 14 }}>
          &#128269;
        </span>
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setIsOpen(true); }}
          onFocus={() => query && setIsOpen(true)}
          placeholder="지역 검색 (예: 강남구 역삼동)"
          style={{
            width: '100%', padding: '10px 12px 10px 36px', border: '1px solid var(--input-border)',
            borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box',
            backgroundColor: 'var(--input-bg)', color: 'var(--text-primary)',
          }}
        />
      </div>

      {isOpen && query && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4,
          border: '1px solid var(--border-color)', borderRadius: 8, backgroundColor: 'var(--card-bg)',
          boxShadow: 'var(--shadow)', zIndex: 50, maxHeight: 240, overflowY: 'auto',
        }}>
          {isLoading && <p style={{ padding: '10px 14px', fontSize: 14, color: 'var(--text-muted)', margin: 0 }}>검색 중...</p>}
          {!isLoading && items.length === 0 && <p style={{ padding: '10px 14px', fontSize: 14, color: 'var(--text-muted)', margin: 0 }}>결과 없음</p>}
          {items.map(region => (
            <button
              key={region.id}
              onClick={() => {
                onSelect(region);
                setQuery(`${region.districtName} ${region.dongName}`);
                setIsOpen(false);
              }}
              style={{
                display: 'flex', justifyContent: 'space-between', width: '100%',
                padding: '10px 14px', border: 'none', backgroundColor: 'var(--card-bg)',
                cursor: 'pointer', textAlign: 'left', fontSize: 14, color: 'var(--text-primary)',
              }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'var(--card-bg)')}
            >
              <span style={{ fontWeight: 500 }}>{region.dongName}</span>
              <span style={{ color: 'var(--text-muted)' }}>{region.districtName}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
