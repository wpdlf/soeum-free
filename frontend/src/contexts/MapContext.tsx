'use client';
import { createContext, useContext, useState, useCallback } from 'react';

interface MapContextValue {
  map: kakao.maps.Map | null;
  setMap: (map: kakao.maps.Map) => void;
  selectedRegionId: number | null;
  setSelectedRegionId: (id: number | null) => void;
  layerVisibility: { noise: boolean; construction: boolean; realEstate: boolean };
  setLayerVisibility: (v: { noise: boolean; construction: boolean; realEstate: boolean }) => void;
}

const MapContext = createContext<MapContextValue | null>(null);

export function MapProvider({ children }: { children: React.ReactNode }) {
  const [map, setMap] = useState<kakao.maps.Map | null>(null);
  const [selectedRegionId, setSelectedRegionId] = useState<number | null>(null);
  const [layerVisibility, setLayerVisibility] = useState({ noise: true, construction: true, realEstate: true });

  return (
    <MapContext.Provider value={{ map, setMap, selectedRegionId, setSelectedRegionId, layerVisibility, setLayerVisibility }}>
      {children}
    </MapContext.Provider>
  );
}

export function useMapContext() {
  const ctx = useContext(MapContext);
  if (!ctx) throw new Error('useMapContext must be used within MapProvider');
  return ctx;
}
