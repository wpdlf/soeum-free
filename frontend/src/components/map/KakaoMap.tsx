'use client';
import { useEffect, useRef, useState } from 'react';
import { useMapContext } from '@/contexts/MapContext';

export function KakaoMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { setMap } = useMapContext();
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    function initMap() {
      if (!containerRef.current || !window.kakao?.maps?.Map) return;

      const mapInstance = new window.kakao.maps.Map(containerRef.current, {
        center: new window.kakao.maps.LatLng(37.5665, 126.9780), // Seoul City Hall
        level: 8, // Shows all of Seoul
      });

      setMap(mapInstance);
      setIsLoaded(true);
    }

    // Check if already loaded
    if (window.kakao?.maps?.Map) {
      initMap();
    } else {
      // Wait for script load event
      const handler = () => initMap();
      window.addEventListener('kakao-maps-loaded', handler);
      return () => window.removeEventListener('kakao-maps-loaded', handler);
    }
  }, [setMap]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      {!isLoaded && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-tertiary)' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>지도를 불러오는 중...</p>
        </div>
      )}
    </div>
  );
}
