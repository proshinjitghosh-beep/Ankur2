import type { EngineRiskSeverity, RiskTriggerVariable } from '../../../src/types/agri.ts';
import type {
  DimensionEvaluationOutput,
  DistrictRiskModifierContext,
  ExtractedWeatherFeatures,
  ResolvedCropStage,
} from './types.ts';

function scoreToSeverity(score: number | null): EngineRiskSeverity {
  if (score === null) return 'Unavailable';
  if (score >= 75) return 'Critical';
  if (score >= 50) return 'High';
  if (score >= 25) return 'Moderate';
  return 'Low';
}

export function evaluateDroughtRisk(
  features: ExtractedWeatherFeatures,
  cropStage: ResolvedCropStage,
  districtCtx: DistrictRiskModifierContext
): DimensionEvaluationOutput {
  const th = cropStage.thresholds.drought;
  const deficitMm = features.netWaterDeficitMm;
  const soilM3 = features.soilMoistureProxy.rawM3PerM3;

  // Require at least net water deficit OR soil moisture proxy
  if (deficitMm === null && soilM3 === null) {
    return {
      dimensionId: 'drought',
      label: 'Drought',
      score: null,
      severity: 'Unavailable',
      triggers: [],
      provenance: th.provenance,
      expectedWindow: features.window,
      explanation: 'Drought risk cannot be evaluated because ET0, rainfall, and model soil moisture are unavailable.',
      recommendedAction: 'Check topsoil moisture physically by hand-feel or tensiometer before irrigating.',
      nonWeatherBlindSpots: [
        'Canal irrigation schedules, AWD water depth, and groundwater pump access are unobserved.',
      ],
    };
  }

  let deficitScore = 0;
  if (deficitMm !== null) {
    // Normalize window scaling (72h thresholds scaled gently for 24h/7d/14d)
    const scale = Math.max(0.5, features.windowDaysCount / 3);
    const mod = th.deficitModerateMm * scale;
    const high = th.deficitHighMm * scale;
    const crit = th.deficitCriticalMm * scale;

    if (deficitMm <= 0) {
      deficitScore = 0;
    } else if (deficitMm < mod) {
      deficitScore = Math.round((deficitMm / Math.max(1, mod)) * 22);
    } else if (deficitMm < high) {
      deficitScore = Math.round(25 + ((deficitMm - mod) / Math.max(1, high - mod)) * 22);
    } else if (deficitMm < crit) {
      deficitScore = Math.round(50 + ((deficitMm - high) / Math.max(1, crit - high)) * 22);
    } else {
      deficitScore = Math.min(92, Math.round(74 + ((deficitMm - crit) / Math.max(1, crit * 0.5)) * 18));
    }
  }

  let soilScore: number | null = null;
  if (soilM3 !== null) {
    if (soilM3 >= th.soilDryM3PerM3 + 0.08) {
      soilScore = 8;
    } else if (soilM3 >= th.soilDryM3PerM3) {
      soilScore = Math.round(
        8 + ((th.soilDryM3PerM3 + 0.08 - soilM3) / 0.08) * 18
      );
    } else if (soilM3 >= th.soilCriticalM3PerM3) {
      soilScore = Math.round(
        28 +
          ((th.soilDryM3PerM3 - soilM3) /
            Math.max(0.01, th.soilDryM3PerM3 - th.soilCriticalM3PerM3)) *
            40
      );
    } else {
      soilScore = Math.min(
        96,
        Math.round(68 + ((th.soilCriticalM3PerM3 - soilM3) / 0.06) * 28)
      );
    }
  }

  // Combine without ever fabricating missing soil moisture as zero
  let score: number;
  if (deficitMm !== null && soilScore !== null) {
    score = Math.round(0.55 * deficitScore + 0.45 * soilScore);
  } else if (soilScore !== null) {
    score = soilScore;
  } else {
    score = deficitScore;
  }

  // Bounded coarse modifier for high-percolation sandy soils or dry antecedent baseline
  const soilLower = (districtCtx.soilType ?? '').toLowerCase();
  if (score >= 15 && soilLower.includes('sandy')) {
    score = Math.min(100, score + 4);
  }
  if (
    features.historicalBaseline.source === 'open-meteo-archive' &&
    features.historicalBaseline.dryDaysCount !== null &&
    features.historicalBaseline.dryDaysCount >= 24 &&
    score >= 15
  ) {
    score = Math.min(100, score + 5);
  }

  const triggers: RiskTriggerVariable[] = [];
  if (deficitMm !== null) {
    triggers.push({
      variable: 'daily.et0_fao_evapotranspiration - daily.precipitation_sum',
      observedValue: `${features.et0WindowTotalMm} mm ET0 vs. ${features.rainWindowTotalMm} mm rain (net ${deficitMm >= 0 ? '+' : ''}${deficitMm} mm)`,
      threshold: `Net deficit cue scaled to ${features.window}`,
    });
  }
  if (soilM3 !== null) {
    triggers.push({
      variable: 'hourly.soil_moisture_0_to_7cm',
      observedValue: `${soilM3.toFixed(3)} m³/m³ (hourly model proxy at ${features.soilMoistureProxy.observationHourIso ?? 'latest hour'})`,
      threshold: `< ${th.soilDryM3PerM3.toFixed(3)} m³/m³ dry / < ${th.soilCriticalM3PerM3.toFixed(3)} m³/m³ critical (uncalibrated proxy)`,
    });
  }

  const severity = scoreToSeverity(score);
  const soilText =
    soilM3 !== null
      ? `Model-estimated topsoil moisture is ${soilM3.toFixed(3)} m³/m³.`
      : 'Hourly topsoil moisture proxy is unavailable for this grid hour; scored from climatic ET0-rainfall balance.';

  const explanation =
    severity === 'Critical' || severity === 'High'
      ? `High evaporative demand (${features.et0WindowTotalMm ?? '—'} mm ET0 vs. ${
          features.rainWindowTotalMm ?? '—'
        } mm rain) elevates moisture depletion risk for ${cropStage.profile.name}. ${soilText}`
      : `Climatic water balance indicates ${severity.toLowerCase()} drought stress over ${features.window}. ${soilText}`;

  const recommendedAction =
    severity === 'Critical' || severity === 'High'
      ? cropStage.profile.id === 'rice'
        ? 'Check AWD field water tube or standing water physically; schedule supplemental irrigation during cool morning/evening hours.'
        : 'Verify root-zone moisture physically before scheduling supplemental irrigation and conserve topsoil moisture with light mulching where practical.'
      : 'No immediate drought stress indicated; continue checking physical plot moisture ahead of sensitive stages.';

  return {
    dimensionId: 'drought',
    label: 'Drought',
    score,
    severity,
    triggers,
    provenance: th.provenance,
    expectedWindow: features.window,
    explanation,
    recommendedAction,
    nonWeatherBlindSpots: [
      'Gridded 0–7 cm volumetric soil moisture is a model estimate in m³/m³, not a field sensor, and ignores clay vs. sandy field capacity or bunded rice ponding.',
      'Local tube-well/canal irrigation availability and brackish coastal salinity (dS/m) are not captured.',
    ],
  };
}
