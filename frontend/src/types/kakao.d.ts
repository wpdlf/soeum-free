declare namespace kakao.maps {
  class Map {
    constructor(container: HTMLElement, options: { center: LatLng; level: number });
    getBounds(): LatLngBounds;
    getCenter(): LatLng;
    getLevel(): number;
    setCenter(latlng: LatLng): void;
    setLevel(level: number): void;
    panTo(latlng: LatLng): void;
    relayout(): void;
  }
  class LatLng {
    constructor(lat: number, lng: number);
    getLat(): number;
    getLng(): number;
  }
  class LatLngBounds {
    getSouthWest(): LatLng;
    getNorthEast(): LatLng;
  }
  class Polygon {
    constructor(options: {
      path: LatLng[] | LatLng[][];
      strokeWeight?: number;
      strokeColor?: string;
      strokeOpacity?: number;
      fillColor?: string;
      fillOpacity?: number;
    });
    setMap(map: Map | null): void;
    setOptions(options: { fillOpacity?: number; fillColor?: string; strokeColor?: string }): void;
  }
  class Marker {
    constructor(options: { position: LatLng; map?: Map });
    setMap(map: Map | null): void;
  }
  class CustomOverlay {
    constructor(options: { position: LatLng; content: string | HTMLElement; map?: Map; yAnchor?: number });
    setMap(map: Map | null): void;
  }
  class InfoWindow {
    constructor(options: { content: string; removable?: boolean });
    open(map: Map, marker: Marker): void;
    close(): void;
  }
  namespace event {
    function addListener(target: any, type: string, handler: Function): void;
    function removeListener(target: any, type: string, handler: Function): void;
  }
  function load(callback: () => void): void;
}

interface Window {
  kakao: { maps: typeof kakao.maps & { load: (cb: () => void) => void } };
}
