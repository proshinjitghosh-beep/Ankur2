import type {
  SeasonPlausibility,
  VegetableSubtype,
} from '../../../src/types/agri.ts';
import type {
  CropRiskProfileSpec,
  DimensionThresholds,
} from '../../data/cropRiskCatalog.ts';
import {
  OpenMeteoServiceError,
  parseStrictUtcIsoDate,
} from '../openMeteoService.ts';
import type { ResolvedCropStage } from './types.ts';

function cloneThresholds(t: DimensionThresholds): DimensionThresholds {
  return {
    heat: { ...t.heat, provenance: { ...t.heat.provenance } },
    rainfall: { ...t.rainfall, provenance: { ...t.rainfall.provenance } },
    drought: { ...t.drought, provenance: { ...t.drought.provenance } },
    disease: {
      ...t.disease,
      targetDiseases: [...t.disease.targetDiseases],
      provenance: { ...t.disease.provenance },
    },
    wind: { ...t.wind, provenance: { ...t.wind.provenance } },
  };
}

function applyModifiers(
  base: DimensionThresholds,
  profile: CropRiskProfileSpec,
  varietyId: string | null,
  vegetableSubtype: VegetableSubtype | null
): DimensionThresholds {
  const result = cloneThresholds(base);

  if (varietyId) {
    const variety = profile.varieties.find((v) => v.id === varietyId);
    if (variety?.heatToleranceOffsetC) {
      result.heat.tempMaxStartC += variety.heatToleranceOffsetC;
      result.heat.tempMaxModerateC += variety.heatToleranceOffsetC;
      result.heat.tempMaxHighC += variety.heatToleranceOffsetC;
      result.heat.tempMaxCriticalC += variety.heatToleranceOffsetC;
    }
  }

  if (profile.phenologyTrack === 'vegetables' && vegetableSubtype && profile.vegetableSubtypes) {
    const sub = profile.vegetableSubtypes.find((s) => s.id === vegetableSubtype);
    if (sub) {
      result.heat.tempMaxStartC += sub.heatOffsetC;
      result.heat.tempMaxModerateC += sub.heatOffsetC;
      result.heat.tempMaxHighC += sub.heatOffsetC;
      result.heat.tempMaxCriticalC += sub.heatOffsetC;
      result.heat.hourlyWarmThresholdC += sub.heatOffsetC;

      result.rainfall.rain24hModerateMm = Math.max(8, result.rainfall.rain24hModerateMm + sub.rainOffsetMm);
      result.rainfall.rain24hHighMm = Math.max(15, result.rainfall.rain24hHighMm + sub.rainOffsetMm);
      result.rainfall.rain24hCriticalMm = Math.max(25, result.rainfall.rain24hCriticalMm + sub.rainOffsetMm);

      result.disease.rhProxyThresholdPct += sub.diseaseRhOffsetPct;
    }
  }

  return result;
}

function evaluateSeasonPlausibility(
  profile: CropRiskProfileSpec,
  varietyId: string | null,
  plantingMs: number | null,
  referenceNowMs: number,
  daysAfterPlanting: number | null
): SeasonPlausibility {
  if (profile.phenologyTrack === 'perennial_mango') {
    return {
      status: 'not_evaluated',
      expectedPlantingWindow: profile.defaultPlantingWindowLabel,
      warningMessage: null,
    };
  }

  const variety = varietyId
    ? profile.varieties.find((v) => v.id === varietyId) ?? null
    : null;
  const expectedMonths = variety?.plantingMonths ?? profile.defaultPlantingMonths;
  const expectedWindow = variety?.expectedPlantingLabel ?? profile.defaultPlantingWindowLabel;

  let effectivePlantingMs = plantingMs;
  if (effectivePlantingMs === null && daysAfterPlanting !== null) {
    effectivePlantingMs = referenceNowMs - daysAfterPlanting * 86_400_000;
  }

  if (effectivePlantingMs === null) {
    return {
      status: 'not_evaluated',
      expectedPlantingWindow: expectedWindow,
      warningMessage: null,
    };
  }

  const plantingMonth = new Date(effectivePlantingMs).getUTCMonth() + 1;
  if (expectedMonths.includes(plantingMonth)) {
    return {
      status: 'plausible',
      expectedPlantingWindow: expectedWindow,
      warningMessage: null,
    };
  }

  const monthName = new Date(effectivePlantingMs).toLocaleDateString('en-US', {
    month: 'long',
    timeZone: 'UTC',
  });

  const riceHint =
    profile.id === 'rice' && varietyId === 'boro' && [6, 7, 8, 9].includes(plantingMonth)
      ? ' Note: Jun–Sep transplanting corresponds to Monsoon Aman rice rather than Dry-Season Boro.'
      : '';

  return {
    status: 'off_season_warning',
    expectedPlantingWindow: expectedWindow,
    warningMessage: `${monthName} planting falls outside Bangladesh's typical ${
      variety?.label ?? profile.name
    } planting window (${expectedWindow}). Farmer-provided date was preserved without modification.${riceHint}`,
  };
}

export function resolveGrowthStage(params: {
  profile: CropRiskProfileSpec;
  varietyId: string | null;
  vegetableSubtype?: unknown;
  plantingDate?: unknown;
  daysAfterPlanting?: unknown;
  growthStageId?: unknown;
  referenceDateIso?: string;
}): ResolvedCropStage {
  const { profile, varietyId } = params;
  const disclosures: string[] = [];

  // Validate vegetable subtype if provided
  let vegetableSubtype: VegetableSubtype | null = null;
  if (
    typeof params.vegetableSubtype === 'string' &&
    params.vegetableSubtype.trim() !== ''
  ) {
    const rawSub = params.vegetableSubtype.trim().toLowerCase() as VegetableSubtype;
    const validSub = profile.vegetableSubtypes?.find((s) => s.id === rawSub);
    if (!validSub) {
      throw new OpenMeteoServiceError(
        `Invalid vegetableSubtype '${params.vegetableSubtype}'.`,
        400
      );
    }
    vegetableSubtype = validSub.id;
  }

  if (profile.phenologyTrack === 'vegetables' && !vegetableSubtype) {
    disclosures.push(
      'Vegetables span diverse plant families; specify vegetableSubtype (e.g., solanaceous_fruiting, cucurbits, leafy_greens, brassicas) for tighter crop-specific thresholds.'
    );
  }

  const refDateMs = params.referenceDateIso
    ? Date.parse(params.referenceDateIso)
    : Date.now();
  const refTodayStartMs = Date.UTC(
    new Date(refDateMs).getUTCFullYear(),
    new Date(refDateMs).getUTCMonth(),
    new Date(refDateMs).getUTCDate()
  );

  // Parse plantingDate if provided
  let parsedPlantingMs: number | null = null;
  if (typeof params.plantingDate === 'string' && params.plantingDate.trim() !== '') {
    const rawDate = params.plantingDate.trim();
    const ms = parseStrictUtcIsoDate(rawDate);
    if (ms === null) {
      throw new OpenMeteoServiceError(
        'Invalid calendar date provided for plantingDate. Use valid YYYY-MM-DD.',
        400
      );
    }
    if (ms > refTodayStartMs) {
      throw new OpenMeteoServiceError(
        'plantingDate cannot be in the future.',
        400
      );
    }
    parsedPlantingMs = ms;
  }

  // Parse daysAfterPlanting if provided
  let parsedDap: number | null = null;
  if (
    params.daysAfterPlanting !== undefined &&
    params.daysAfterPlanting !== null &&
    params.daysAfterPlanting !== ''
  ) {
    const num = Number(params.daysAfterPlanting);
    if (!Number.isInteger(num) || num < 0 || num > 365) {
      throw new OpenMeteoServiceError(
        'Invalid daysAfterPlanting. Must be an integer between 0 and 365.',
        400
      );
    }
    parsedDap = num;
  }

  // Validate explicit growthStageId if provided
  let explicitStageSpec = null;
  if (
    typeof params.growthStageId === 'string' &&
    params.growthStageId.trim() !== ''
  ) {
    const rawStage = params.growthStageId.trim().toLowerCase();
    explicitStageSpec = profile.growthStages.find((s) => s.id === rawStage) ?? null;
    if (!explicitStageSpec) {
      throw new OpenMeteoServiceError(
        `Invalid growthStageId '${params.growthStageId}' for crop '${profile.id}'.`,
        400
      );
    }
  }

  // Track 1: Perennial Mango ignores annual plantingDate/daysAfterPlanting
  if (profile.phenologyTrack === 'perennial_mango') {
    if (parsedPlantingMs !== null || parsedDap !== null) {
      disclosures.push(
        'Mango is a perennial orchard crop; plantingDate/daysAfterPlanting were ignored. Select phenological growthStageId directly.'
      );
    }

    const seasonPlausibility: SeasonPlausibility = {
      status: 'not_evaluated',
      expectedPlantingWindow: profile.defaultPlantingWindowLabel,
      warningMessage: null,
    };

    if (explicitStageSpec) {
      return {
        profile,
        varietyId,
        vegetableSubtype: null,
        stageStatus: 'Specified',
        stageSource: 'explicit_stage',
        growthStageId: explicitStageSpec.id,
        growthStageLabel: explicitStageSpec.label,
        daysAfterPlanting: null,
        weights: { ...explicitStageSpec.weights },
        thresholds: applyModifiers(explicitStageSpec.thresholds, profile, varietyId, null),
        seasonPlausibility,
        disclosures,
      };
    }

    disclosures.push(
      'Mango phenological growthStageId was not specified; stage-neutral orchard thresholds used and stage specificity confidence reduced.'
    );
    return {
      profile,
      varietyId,
      vegetableSubtype: null,
      stageStatus: 'Unspecified',
      stageSource: 'unspecified',
      growthStageId: null,
      growthStageLabel: null,
      daysAfterPlanting: null,
      weights: { ...profile.unspecifiedStageWeights },
      thresholds: applyModifiers(profile.unspecifiedThresholds, profile, varietyId, null),
      seasonPlausibility,
      disclosures,
    };
  }

  // Track 2 & 3: Annual crops & Vegetables
  const effectiveDap =
    parsedPlantingMs !== null
      ? Math.max(0, Math.round((refTodayStartMs - parsedPlantingMs) / 86_400_000))
      : parsedDap;

  const seasonPlausibility = evaluateSeasonPlausibility(
    profile,
    varietyId,
    parsedPlantingMs,
    refTodayStartMs,
    effectiveDap
  );

  // Explicit farmer-confirmed stage takes precedence if specified
  if (explicitStageSpec) {
    return {
      profile,
      varietyId,
      vegetableSubtype,
      stageStatus: 'Specified',
      stageSource: 'explicit_stage',
      growthStageId: explicitStageSpec.id,
      growthStageLabel: explicitStageSpec.label,
      daysAfterPlanting: effectiveDap,
      weights: { ...explicitStageSpec.weights },
      thresholds: applyModifiers(
        explicitStageSpec.thresholds,
        profile,
        varietyId,
        vegetableSubtype
      ),
      seasonPlausibility,
      disclosures,
    };
  }

  if (effectiveDap !== null) {
    const matchedStage =
      profile.growthStages.find(
        (s) =>
          s.minDay !== null &&
          s.maxDay !== null &&
          effectiveDap >= s.minDay &&
          effectiveDap <= s.maxDay
      ) ?? profile.growthStages[profile.growthStages.length - 1];

    if (matchedStage.maxDay !== null && effectiveDap > matchedStage.maxDay) {
      disclosures.push(
        `Calculated ${effectiveDap} days after planting exceeds typical harvest window; mapped to final stage (${matchedStage.label}).`
      );
    }

    return {
      profile,
      varietyId,
      vegetableSubtype,
      stageStatus: 'Specified',
      stageSource: parsedPlantingMs !== null ? 'planting_date' : 'days_after_planting',
      growthStageId: matchedStage.id,
      growthStageLabel: matchedStage.label,
      daysAfterPlanting: effectiveDap,
      weights: { ...matchedStage.weights },
      thresholds: applyModifiers(
        matchedStage.thresholds,
        profile,
        varietyId,
        vegetableSubtype
      ),
      seasonPlausibility,
      disclosures,
    };
  }

  // Missing planting information: NEVER invent growth stage
  disclosures.push(
    'No plantingDate, daysAfterPlanting, or growthStageId provided; growth stage remains Unspecified and crop-level baseline thresholds are applied.'
  );
  return {
    profile,
    varietyId,
    vegetableSubtype,
    stageStatus: 'Unspecified',
    stageSource: 'unspecified',
    growthStageId: null,
    growthStageLabel: null,
    daysAfterPlanting: null,
    weights: { ...profile.unspecifiedStageWeights },
    thresholds: applyModifiers(
      profile.unspecifiedThresholds,
      profile,
      varietyId,
      vegetableSubtype
    ),
    seasonPlausibility,
    disclosures,
  };
}
