import type {
  AnyCropInputId,
  RiskCropId,
} from '../../../src/types/agri.ts';
import {
  CROP_RISK_CATALOG,
  type CropRiskProfileSpec,
} from '../../data/cropRiskCatalog.ts';

const LEGACY_CROP_ALIAS_MAP: Record<
  string,
  { cropId: RiskCropId; defaultVarietyId?: string }
> = {
  'aman-rice': { cropId: 'rice', defaultVarietyId: 'aman' },
  'boro-rice': { cropId: 'rice', defaultVarietyId: 'boro' },
  'aus-rice': { cropId: 'rice', defaultVarietyId: 'aus' },
};

export function resolveCropProfile(
  rawCropId: unknown,
  rawVarietyId?: unknown
): {
  profile: CropRiskProfileSpec;
  varietyId: string | null;
} | null {
  if (typeof rawCropId !== 'string' || !rawCropId.trim()) {
    return null;
  }

  const normalized = rawCropId.trim().toLowerCase() as AnyCropInputId;
  const alias = LEGACY_CROP_ALIAS_MAP[normalized];

  const cropId: RiskCropId = alias ? alias.cropId : (normalized as RiskCropId);
  const profile = CROP_RISK_CATALOG[cropId];
  if (!profile) {
    return null;
  }

  let varietyId: string | null = null;
  if (typeof rawVarietyId === 'string' && rawVarietyId.trim()) {
    const requested = rawVarietyId.trim().toLowerCase();
    const matched = profile.varieties.find((v) => v.id === requested);
    if (matched) {
      varietyId = matched.id;
    }
  } else if (alias?.defaultVarietyId) {
    varietyId = alias.defaultVarietyId;
  }

  return { profile, varietyId };
}

export function listAllCropProfiles(): CropRiskProfileSpec[] {
  return Object.values(CROP_RISK_CATALOG);
}
