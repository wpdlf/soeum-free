'use client';
import { useEffect, useRef } from 'react';
import { useMapContext } from '@/contexts/MapContext';
import { useConstructionMap } from '@/hooks/useConstructionMap';
import type { ConstructionStatus } from '@/types';

const STATUS_COLORS: Record<ConstructionStatus, string> = {
  permitted: '#f59e0b',
  in_progress: '#ef4444',
  completed: '#6b7280',
};

const STATUS_LABELS: Record<ConstructionStatus, string> = {
  permitted: '허가',
  in_progress: '진행중',
  completed: '완료',
};

export function ConstructionDBMarkerLayer() {
  const { map, layerVisibility } = useMapContext();
  const { data } = useConstructionMap();
  const markersRef = useRef<kakao.maps.CustomOverlay[]>([]);
  const overlaysRef = useRef<kakao.maps.CustomOverlay[]>([]);

  useEffect(() => {
    if (!map || !layerVisibility.construction) {
      markersRef.current.forEach(m => m.setMap(null));
      markersRef.current = [];
      overlaysRef.current.forEach(o => o.setMap(null));
      overlaysRef.current = [];
      return;
    }

    const items = data?.items ?? [];

    markersRef.current.forEach(m => m.setMap(null));
    overlaysRef.current.forEach(o => o.setMap(null));
    markersRef.current = [];
    overlaysRef.current = [];

    items.forEach(permit => {
      if (permit.latitude == null || permit.longitude == null) return;

      const position = new window.kakao.maps.LatLng(permit.latitude, permit.longitude);
      const color = STATUS_COLORS[permit.status] || '#ef4444';

      const markerEl = document.createElement('div');
      markerEl.innerHTML = `
        <div style="cursor:pointer;display:flex;align-items:center;justify-content:center;width:28px;height:28px;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L1 21h22L12 2z" fill="${color}" stroke="#fff" stroke-width="1.5"/>
            <text x="12" y="17" text-anchor="middle" fill="#fff" font-size="10" font-weight="bold">!</text>
          </svg>
        </div>
      `;

      markerEl.addEventListener('click', () => {
        overlaysRef.current.forEach(o => o.setMap(null));
        overlaysRef.current = [];

        const label = STATUS_LABELS[permit.status] || permit.status;
        const dateRange = permit.startDate
          ? `${permit.startDate} ~ ${permit.endDate || '진행중'}`
          : '미정';

        const content = `
          <div style="padding:10px 14px;background:white;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.15);font-size:13px;min-width:180px;max-width:260px;">
            <div style="font-weight:700;margin-bottom:4px;">${permit.projectName || '공사장'}</div>
            <div style="margin-bottom:4px;">
              <span style="display:inline-block;padding:2px 6px;border-radius:4px;font-size:11px;font-weight:600;background:${color}20;color:${color};">${label}</span>
            </div>
            <div style="color:#6b7280;font-size:12px;margin-bottom:2px;">${permit.address || ''}</div>
            <div style="color:#6b7280;font-size:12px;">${dateRange}</div>
          </div>
        `;

        const infoOverlay = new window.kakao.maps.CustomOverlay({
          position,
          content,
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
      markersRef.current.forEach(m => m.setMap(null));
      overlaysRef.current.forEach(o => o.setMap(null));
    };
  }, [map, data, layerVisibility.construction]);

  return null;
}
