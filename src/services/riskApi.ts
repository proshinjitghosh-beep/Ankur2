import type {
  AgriculturalRiskAssessment,
  AnyCropInputId,
  DistrictId,
  DistrictMultiCropRiskPayload,
  ForecastWindow,
  RiskCropId,
  RiskDimensionId,
  RiskForecastPayload,
  VegetableSubtype,
} from '../types/agri';

export interface RiskCropCatalogItem {
  id: RiskCropId;
  name: string;
  localName: string;
  phenologyTrack: 'annual' | 'perennial_mango' | 'vegetables';
  typicalCycleDays: number | null;
  optimalTempRangeC: string;
  defaultPlantingWindowLabel: string;
  varieties: Array<{
    id: string;
    label: string;
    typicalCycleDays: number | null;
    expectedPlantingLabel: string;
  }>;
  vegetableSubtypes: Array<{
    id: VegetableSubtype;
    label: string;
    examples: string;
  }> | null;
  growthStages: Array<{
    id: string;
    label: string;
    minDay: number | null;
    maxDay: number | null;
    weights: Record<RiskDimensionId, number>;
  }>;
}

export async function fetchRiskCrops(
  signal?: AbortSignal
): Promise<RiskCropCatalogItem[]> {
  const response = await fetch('/api/risk/crops', {
    signal,
    headers: { Accept: 'application/json' },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      typeof body?.error === 'string'
        ? body.error
        : `Failed to load crop profiles (${response.status})`
    );
  }
  return (body?.crops ?? []) as RiskCropCatalogItem[];
}

export async function fetchCropRiskAssessment(params: {
  districtId: DistrictId;
  cropId: AnyCropInputId;
  varietyId?: string;
  vegetableSubtype?: VegetableSubtype | '';
  plantingDate?: string;
  growthStageId?: string;
  window?: ForecastWindow;
  includeHistorical?: boolean;
  signal?: AbortSignal;
}): Promise<AgriculturalRiskAssessment> {
  const query = new URLSearchParams({
    districtId: params.districtId,
    cropId: params.cropId,
    window: params.window ?? '72h',
    includeHistorical: String(params.includeHistorical ?? true),
  });
  if (params.varietyId) query.set('varietyId', params.varietyId);
  if (params.vegetableSubtype) query.set('vegetableSubtype', params.vegetableSubtype);
  if (params.plantingDate) query.set('plantingDate', params.plantingDate);
  if (params.growthStageId) query.set('growthStageId', params.growthStageId);

  const response = await fetch(`/api/risk/assess?${query.toString()}`, {
    signal: params.signal,
    headers: { Accept: 'application/json' },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      typeof body?.error === 'string'
        ? body.error
        : `Risk assessment request failed (${response.status})`
    );
  }
  return body as AgriculturalRiskAssessment;
}

export async function fetchCropRiskForecast(params: {
  districtId: DistrictId;
  cropId: AnyCropInputId;
  days?: number;
  signal?: AbortSignal;
}): Promise<RiskForecastPayload> {
  const query = new URLSearchParams({
    districtId: params.districtId,
    cropId: params.cropId,
    days: String(params.days ?? 7),
  });
  const response = await fetch(`/api/risk/forecast?${query.toString()}`, {
    signal: params.signal,
    headers: { Accept: 'application/json' },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      typeof body?.error === 'string'
        ? body.error
        : `Risk forecast request failed (${response.status})`
    );
  }
  return body as RiskForecastPayload;
}

export async function fetchDistrictMultiCropRisk(params: {
  districtId: DistrictId;
  window?: ForecastWindow;
  signal?: AbortSignal;
}): Promise<DistrictMultiCropRiskPayload> {
  const query = new URLSearchParams({
    window: params.window ?? '72h',
  });
  const response = await fetch(
    `/api/risk/district/${encodeURIComponent(params.districtId)}?${query.toString()}`,
    {
      signal: params.signal,
      headers: { Accept: 'application/json' },
    }
  );
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      typeof body?.error === 'string'
        ? body.error
        : `District risk request failed (${response.status})`
    );
  }
  return body as DistrictMultiCropRiskPayload;
}
