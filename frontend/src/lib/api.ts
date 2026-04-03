import type {
  Region,
  RegionDetail,
  NoiseSummary,
  ConstructionPermit,
  RealEstateSummary,
  PaginatedResponse,
} from '@/types';

const isServer = typeof window === 'undefined';
const API_BASE = isServer
  ? (process.env.API_URL_INTERNAL || 'http://backend:8000')
  : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000');

/** snake_case → camelCase 변환 (재귀) */
function toCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

function camelizeKeys(obj: any): any {
  if (Array.isArray(obj)) return obj.map(camelizeKeys);
  if (obj !== null && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => [toCamel(k), camelizeKeys(v)])
    );
  }
  return obj;
}

/** fetch + JSON parse + camelCase 변환 */
async function fetchApi<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const data = await res.json();
  return camelizeKeys(data) as T;
}

/** Convert params to query string */
function toQueryString(params: Record<string, any>): string {
  const entries = Object.entries(params).filter(([, v]) => v != null);
  return entries.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
}

export const api = {
  regions: {
    list: (): Promise<Region[]> =>
      fetchApi(`${API_BASE}/api/v1/regions`),

    detail: (id: number, params?: { from?: string; to?: string }): Promise<RegionDetail> => {
      const qs = params ? `?${toQueryString(params)}` : '';
      return fetchApi(`${API_BASE}/api/v1/regions/${id}${qs}`);
    },

    search: (q: string): Promise<{ items: Region[]; query: string }> =>
      fetchApi(`${API_BASE}/api/v1/regions/search?q=${encodeURIComponent(q)}`),
  },

  noise: {
    map: (): Promise<{ items: NoiseSummary[] }> =>
      fetchApi(`${API_BASE}/api/v1/noise/map`),
  },

  construction: {
    list: (params: {
      district?: string;
      from?: string;
      to?: string;
      page?: number;
      size?: number;
    }): Promise<PaginatedResponse<ConstructionPermit>> =>
      fetchApi(`${API_BASE}/api/v1/construction?${toQueryString(params)}`),

    map: (): Promise<{ items: ConstructionPermit[] }> =>
      fetchApi(`${API_BASE}/api/v1/construction/map`),
  },

  realEstate: {
    list: (params: {
      district?: string;
      dong?: string;
      from?: string;
      to?: string;
      page?: number;
      size?: number;
    }): Promise<PaginatedResponse<RealEstateSummary>> =>
      fetchApi(`${API_BASE}/api/v1/real-estate?${toQueryString(params)}`),

    link: (
      district: string,
      dong: string,
    ): Promise<{ districtName: string; dongName: string; naverUrl: string }> =>
      fetchApi(`${API_BASE}/api/v1/real-estate/link?district=${encodeURIComponent(district)}&dong=${encodeURIComponent(dong)}`),
  },
};
