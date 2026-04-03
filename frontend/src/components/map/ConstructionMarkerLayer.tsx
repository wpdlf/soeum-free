'use client';
import { useEffect, useRef, useCallback } from 'react';
import { useMapContext } from '@/contexts/MapContext';

const SAFEMAP_KEY = process.env.NEXT_PUBLIC_SAFEMAP_API_KEY;
const WMS_BASE = 'https://www.safemap.go.kr/openapi2/IF_0043_WMS';

function buildWmsUrl(bbox: string, width: number, height: number): string {
  const params = new URLSearchParams({
    serviceKey: SAFEMAP_KEY || '',
    service: 'WMS',
    request: 'GetMap',
    version: '1.1.1',
    layers: 'VIEW_CNTWRKSTTUS',
    styles: 'A2SM_CntwrkSttus',
    srs: 'EPSG:4326',
    bbox,
    format: 'image/png',
    width: String(width),
    height: String(height),
    transparent: 'TRUE',
  });
  return `${WMS_BASE}?${params.toString()}`;
}

export function ConstructionMarkerLayer() {
  const { map, layerVisibility } = useMapContext();
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const updateOverlay = useCallback(() => {
    if (!map || !overlayRef.current || !imgRef.current) return;

    const bounds = map.getBounds();
    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();
    const bbox = `${sw.getLng()},${sw.getLat()},${ne.getLng()},${ne.getLat()}`;

    const mapEl = (map as any).getNode?.() || overlayRef.current.parentElement;
    const width = mapEl?.offsetWidth || 800;
    const height = mapEl?.offsetHeight || 600;

    const img = imgRef.current;
    img.style.opacity = '0';
    img.src = buildWmsUrl(bbox, width, height);
    img.onload = () => { img.style.opacity = '0.7'; };
    img.onerror = () => { img.style.display = 'none'; };
  }, [map]);

  useEffect(() => {
    if (!map) return;

    const container = document.createElement('div');
    container.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:1;';

    const img = document.createElement('img');
    img.style.cssText = 'width:100%;height:100%;opacity:0;transition:opacity 0.3s;';
    img.alt = '';

    container.appendChild(img);
    overlayRef.current = container;
    imgRef.current = img;

    const mapNode = (map as any).getNode?.();
    if (mapNode) {
      mapNode.style.position = 'relative';
      mapNode.appendChild(container);
    }

    return () => {
      container.remove();
      overlayRef.current = null;
      imgRef.current = null;
    };
  }, [map]);

  useEffect(() => {
    if (!map || !layerVisibility.construction) {
      if (overlayRef.current) overlayRef.current.style.display = 'none';
      return;
    }

    if (overlayRef.current) overlayRef.current.style.display = 'block';
    updateOverlay();

    // Hide during movement, show on idle
    const onDrag = () => {
      if (imgRef.current) imgRef.current.style.opacity = '0';
    };
    const onIdle = () => updateOverlay();

    window.kakao.maps.event.addListener(map, 'dragstart', onDrag);
    window.kakao.maps.event.addListener(map, 'zoom_start', onDrag);
    window.kakao.maps.event.addListener(map, 'idle', onIdle);

    return () => {
      window.kakao.maps.event.removeListener(map, 'dragstart', onDrag);
      window.kakao.maps.event.removeListener(map, 'zoom_start', onDrag);
      window.kakao.maps.event.removeListener(map, 'idle', onIdle);
    };
  }, [map, layerVisibility.construction, updateOverlay]);

  return null;
}
