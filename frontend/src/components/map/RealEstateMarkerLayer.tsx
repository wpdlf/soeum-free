'use client';
import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useMapContext } from '@/contexts/MapContext';
import { useRealEstateMap } from '@/hooks/useRealEstateMap';
import { formatPrice } from '@/lib/format';
import { api } from '@/lib/api';
import type { RealEstateSummary, TradeType, Region } from '@/types';

const TRADE_LABELS: Record<TradeType, string> = {
  sale: '매매',
  jeonse: '전세',
  monthly: '월세',
};

const TRADE_COLORS: Record<TradeType, string> = {
  sale: '#8b5cf6',
  jeonse: '#06b6d4',
  monthly: '#f97316',
};

/** Group summaries by regionId. */
function groupByRegion(items: RealEstateSummary[]) {
  const grouped = new Map<number, RealEstateSummary[]>();
  items.forEach((item) => {
    const arr = grouped.get(item.regionId) ?? [];
    arr.push(item);
    grouped.set(item.regionId, arr);
  });
  return grouped;
}

function buildMarkerContent(label: string): string {
  return `
    <div style="
      cursor:pointer;
      display:inline-flex;
      align-items:center;
      justify-content:center;
      padding:3px 8px;
      background:#8b5cf6;
      color:#fff;
      font-size:11px;
      font-weight:700;
      border-radius:12px;
      white-space:nowrap;
      box-shadow:0 1px 4px rgba(0,0,0,0.2);
    ">${label}</div>
  `;
}

function buildInfoContent(summaries: RealEstateSummary[]): string {
  const rows = summaries
    .map((s) => {
      const color = TRADE_COLORS[s.tradeType];
      return `
        <div style="border-left:3px solid ${color};padding-left:8px;margin-bottom:6px;">
          <div style="font-weight:600;font-size:13px;color:#1f2937;">${TRADE_LABELS[s.tradeType]} ${formatPrice(s.avgPrice)}</div>
          <div style="font-size:11px;color:#6b7280;">${formatPrice(s.minPrice)} ~ ${formatPrice(s.maxPrice)} &middot; ${s.tradeCount}건</div>
        </div>
      `;
    })
    .join('');

  const title = summaries[0]
    ? `${summaries[0].districtName} ${summaries[0].dongName}`
    : '';

  return `
    <div style="padding:10px 14px;background:white;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.15);min-width:160px;max-width:240px;">
      <div style="font-weight:700;font-size:13px;margin-bottom:6px;">${title}</div>
      ${rows}
    </div>
  `;
}

export function RealEstateMarkerLayer() {
  const { map, layerVisibility } = useMapContext();
  const { data } = useRealEstateMap();
  const { data: regions } = useQuery({
    queryKey: ['regions', 'list'],
    queryFn: () => api.regions.list(),
    staleTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
  const markersRef = useRef<kakao.maps.CustomOverlay[]>([]);
  const overlaysRef = useRef<kakao.maps.CustomOverlay[]>([]);

  useEffect(() => {
    if (!map || !layerVisibility.realEstate) {
      markersRef.current.forEach((m) => m.setMap(null));
      markersRef.current = [];
      overlaysRef.current.forEach((o) => o.setMap(null));
      overlaysRef.current = [];
      return;
    }

    const items = data?.items ?? [];
    const regionList = regions ?? [];

    // Build a lookup map from regionId to Region for coordinates
    const regionMap = new Map<number, Region>();
    regionList.forEach((r) => regionMap.set(r.id, r));

    // Clear previous
    markersRef.current.forEach((m) => m.setMap(null));
    overlaysRef.current.forEach((o) => o.setMap(null));
    markersRef.current = [];
    overlaysRef.current = [];

    const grouped = groupByRegion(items);

    grouped.forEach((summaries, regionId) => {
      const region = regionMap.get(regionId);
      if (!region) return; // Skip if we can't resolve coordinates

      const position = new window.kakao.maps.LatLng(region.latitude, region.longitude);

      // Pick the sale summary (or first available) for the marker label
      const primary = summaries.find((s) => s.tradeType === 'sale') ?? summaries[0];
      const label = formatPrice(primary.avgPrice);

      // Create marker wrapper div with click handler
      const markerEl = document.createElement('div');
      markerEl.innerHTML = buildMarkerContent(label);

      markerEl.addEventListener('click', () => {
        // Close existing info overlays
        overlaysRef.current.forEach((o) => o.setMap(null));
        overlaysRef.current = [];

        const infoOverlay = new window.kakao.maps.CustomOverlay({
          position,
          content: buildInfoContent(summaries),
          yAnchor: 1.3,
        });
        infoOverlay.setMap(map);
        overlaysRef.current.push(infoOverlay);

        setTimeout(() => infoOverlay.setMap(null), 4000);
      });

      const marker = new window.kakao.maps.CustomOverlay({
        position,
        content: markerEl,
        yAnchor: 1,
      });

      marker.setMap(map);
      markersRef.current.push(marker);
    });

    return () => {
      markersRef.current.forEach((m) => m.setMap(null));
      overlaysRef.current.forEach((o) => o.setMap(null));
    };
  }, [map, data, regions, layerVisibility.realEstate]);

  return null;
}
