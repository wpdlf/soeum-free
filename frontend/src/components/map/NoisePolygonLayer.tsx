'use client';
import { useEffect, useRef } from 'react';
import { useMapContext } from '@/contexts/MapContext';
import { useNoiseMap } from '@/hooks/useNoiseMap';
import { getNoiseHexColor, getNoiseLabel } from '@/lib/noise-utils';

interface GeoFeature {
  type: 'Feature';
  properties: { adm_nm?: string; sggnm?: string; [key: string]: any };
  geometry: { type: 'Polygon' | 'MultiPolygon'; coordinates: number[][][] | number[][][][] };
}

export function NoisePolygonLayer() {
  const { map, layerVisibility, setSelectedRegionId } = useMapContext();
  const { data: noiseData } = useNoiseMap();
  const polygonsRef = useRef<kakao.maps.Polygon[]>([]);
  const overlaysRef = useRef<kakao.maps.CustomOverlay[]>([]);

  useEffect(() => {
    if (!map || !layerVisibility.noise) {
      polygonsRef.current.forEach(p => p.setMap(null));
      polygonsRef.current = [];
      overlaysRef.current.forEach(o => o.setMap(null));
      overlaysRef.current = [];
      return;
    }

    fetch('/geo/seoul-dong.geojson')
      .then(r => r.json())
      .then((geojson: { features: GeoFeature[] }) => {
        polygonsRef.current.forEach(p => p.setMap(null));
        overlaysRef.current.forEach(o => o.setMap(null));
        polygonsRef.current = [];
        overlaysRef.current = [];

        geojson.features.forEach((feature) => {
          const fullName = feature.properties.adm_nm || '';
          // Extract dong name: "서울특별시 종로구 사직동" → "사직동"
          const parts = fullName.split(' ');
          const dongName = parts[parts.length - 1] || '';

          // Find matching noise data
          const noiseItem = noiseData?.items?.find(
            (n: { dongName: string }) => dongName === n.dongName || fullName.includes(n.dongName) || n.dongName.includes(dongName)
          );

          const avgNoise = noiseItem?.avgNoise ?? 0;
          const fillColor = noiseItem ? getNoiseHexColor(avgNoise) : '#cccccc';
          const fillOpacity = noiseItem ? 0.35 : 0.1;

          // Handle both Polygon and MultiPolygon
          const ringsList = feature.geometry.type === 'MultiPolygon'
            ? (feature.geometry.coordinates as number[][][][]).map(mp => mp[0])
            : [feature.geometry.coordinates[0] as number[][]];

          ringsList.forEach((coords) => {
            const path = (coords as number[][]).map(
              ([lng, lat]) => new window.kakao.maps.LatLng(lat, lng)
            );

            const polygon = new window.kakao.maps.Polygon({
              path,
              strokeWeight: 1,
              strokeColor: '#444444',
              strokeOpacity: 0.6,
              fillColor,
              fillOpacity,
            });

            polygon.setMap(map);
            polygonsRef.current.push(polygon);

            // Hover effect
            window.kakao.maps.event.addListener(polygon, 'mouseover', () => {
              polygon.setOptions({ fillOpacity: 0.6 });
            });
            window.kakao.maps.event.addListener(polygon, 'mouseout', () => {
              polygon.setOptions({ fillOpacity });
            });

            // Click handler
            window.kakao.maps.event.addListener(polygon, 'click', () => {
              if (noiseItem) {
                setSelectedRegionId(noiseItem.regionId);
              }

              // Calculate center
              const center = (coords as number[][]).reduce(
                (acc, [lng, lat]) => ({
                  lat: acc.lat + lat / coords.length,
                  lng: acc.lng + lng / coords.length,
                }),
                { lat: 0, lng: 0 }
              );

              const content = `
                <div style="padding:8px 12px;background:white;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.15);font-size:13px;min-width:120px;">
                  <strong>${dongName}</strong><br/>
                  ${noiseItem ? `평균 ${avgNoise}dB &middot; ${getNoiseLabel(noiseItem.noiseLevel)}` : '데이터 없음'}
                </div>
              `;

              const overlay = new window.kakao.maps.CustomOverlay({
                position: new window.kakao.maps.LatLng(center.lat, center.lng),
                content,
                yAnchor: 1.2,
              });
              overlay.setMap(map);
              overlaysRef.current.push(overlay);

              setTimeout(() => overlay.setMap(null), 3000);
            });
          });
        });
      })
      .catch(err => console.warn('GeoJSON load failed:', err));

    return () => {
      polygonsRef.current.forEach(p => p.setMap(null));
      overlaysRef.current.forEach(o => o.setMap(null));
    };
  }, [map, noiseData, layerVisibility.noise, setSelectedRegionId]);

  return null;
}
