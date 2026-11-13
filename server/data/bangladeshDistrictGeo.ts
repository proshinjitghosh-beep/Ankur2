import {
  BANGLADESH_DISTRICTS,
  type BangladeshDistrictMeta,
} from '../../src/data/bangladeshLocations.ts';
import type { DistrictId } from '../../src/types/agri.ts';

export type DistrictGeoRecord = BangladeshDistrictMeta;

const DISTRICT_GEO_MAP = new Map<DistrictId, DistrictGeoRecord>(
  BANGLADESH_DISTRICTS.map((d) => [d.id, d])
);

export function getDistrictGeoById(id: string): DistrictGeoRecord | null {
  return DISTRICT_GEO_MAP.get(id as DistrictId) ?? null;
}

export function listDistrictGeos(): DistrictGeoRecord[] {
  return BANGLADESH_DISTRICTS;
}

export function findNearestDistrictGeo(
  latitude: number,
  longitude: number,
  maxDistanceDeg = 0.75
): DistrictGeoRecord | null {
  let best: DistrictGeoRecord | null = null;
  let bestDistSq = Infinity;

  for (const d of BANGLADESH_DISTRICTS) {
    const dLat = d.latitude - latitude;
    const dLon = d.longitude - longitude;
    const distSq = dLat * dLat + dLon * dLon;
    if (distSq < bestDistSq) {
      bestDistSq = distSq;
      best = d;
    }
  }

  if (best && Math.sqrt(bestDistSq) <= maxDistanceDeg) {
    return best;
  }
  return null;
}
