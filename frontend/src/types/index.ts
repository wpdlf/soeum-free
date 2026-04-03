// Region
export interface Region {
  id: number;
  districtName: string;
  dongName: string;
  districtCode: string | null;
  latitude: number;
  longitude: number;
}

// Noise
export type NoiseLevel = 'quiet' | 'normal' | 'loud' | 'very_loud';
export type NoiseColor = 'green' | 'yellow' | 'red' | 'black';

export interface NoiseSummary {
  regionId: number;
  districtName: string;
  dongName: string;
  latitude: number;
  longitude: number;
  avgNoise: number;
  noiseLevel: NoiseLevel;
  noiseColor: NoiseColor;
  sampleCount: number;
  periodStart: string;
  periodEnd: string;
}

// Construction
export type ConstructionStatus = 'permitted' | 'in_progress' | 'completed';
export interface ConstructionPermit {
  id: number;
  regionId: number;
  districtName: string;
  dongName: string;
  permitNumber: string;
  projectName: string;
  buildingType: string;
  permitDate: string;
  startDate: string | null;
  endDate: string | null;
  address: string;
  latitude: number | null;
  longitude: number | null;
  status: ConstructionStatus;
}

// Real Estate
export type TradeType = 'sale' | 'jeonse' | 'monthly';
export interface RealEstateSummary {
  regionId: number;
  districtName: string;
  dongName: string;
  tradeType: TradeType;
  buildingType: string | null;
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
  avgMonthlyRent: number | null;
  tradeCount: number;
  periodStart: string;
  periodEnd: string;
  naverLink: string | null;
}

// Map
export interface MapBounds {
  sw: { lat: number; lng: number };
  ne: { lat: number; lng: number };
}

// Filters
export type PeriodPreset = '3m' | '6m' | '12m' | 'custom';
export interface PeriodFilter {
  preset: PeriodPreset;
  from: string;
  to: string;
}

export interface MapLayerVisibility {
  noise: boolean;
  construction: boolean;
  realEstate: boolean;
}

// API
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  totalPages: number;
}

export type InfoTab = 'noise' | 'construction' | 'realEstate';

// Region Detail
export interface RegionDetail {
  region: Region;
  noise: NoiseSummary | null;
  constructionCount: number;
  activeConstructions: ConstructionPermit[];
  realEstate: RealEstateSummary[];
}
