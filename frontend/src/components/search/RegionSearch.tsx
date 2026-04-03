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
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setIsOpen(true); }}
          onFocus={() => query && setIsOpen(true)}
          placeholder="지역 검색 (예: 강남구 역삼동)"
          className="w-full rounded-lg border border-neutral-300 bg-white px-4 py-2.5 pl-10 text-sm placeholder:text-neutral-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {isOpen && query && (
        <div className="absolute top-full left-0 right-0 mt-1 rounded-lg border border-neutral-200 bg-white shadow-lg z-50 max-h-60 overflow-y-auto">
          {isLoading && <p className="px-4 py-3 text-sm text-neutral-400">검색 중...</p>}
          {!isLoading && items.length === 0 && <p className="px-4 py-3 text-sm text-neutral-400">결과 없음</p>}
          {items.map(region => (
            <button
              key={region.id}
              onClick={() => {
                onSelect(region);
                setQuery(`${region.districtName} ${region.dongName}`);
                setIsOpen(false);
              }}
              className="w-full text-left px-4 py-2.5 text-sm hover:bg-blue-50 transition-colors flex justify-between"
            >
              <span className="font-medium">{region.dongName}</span>
              <span className="text-neutral-400">{region.districtName}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
