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

function piecewiseScore(
  val: number,
  mod: number,
  high: number,
  crit: number
): number {
  if (val <= 0) return 0;
  if (val < mod) return Math.round((val / Math.max(1, mod)) * 24);
  if (val < high) return Math.round(25 + ((val - mod) / Math.max(1, high - mod)) * 24);
  if (val < crit) return Math.round(50 + ((val - high) / Math.max(1, crit - high)) * 24);
  return Math.min(100, Math.round(75 + ((val - crit) / Math.max(1, crit * 0.5)) * 25));
}

export function evaluateRainfallRisk(
  features: ExtractedWeatherFeatures,
  cropStage: ResolvedCropStage,
  districtCtx: DistrictRiskModifierContext
): DimensionEvaluationOutput {
  const th = cropStage.thresholds.rainfall;
  const max24h = features.rain24hMaxMm;
  const max72h = features.rain72hMaxMm;
  const maxProb = features.maxRainProbPct;

  if (max24h === null && max72h === null) {
    return {
      dimensionId: 'excessive_rainfall_waterlogging',
      label: 'Excessive Rainfall & Waterlogging',
      score: null,
      severity: 'Unavailable',
      triggers: [],
      provenance: th.provenance,
      expectedWindow: features.window,
      explanation: 'Rainfall and waterlogging risk cannot be evaluated because forecast precipitation totals are unavailable.',
      recommendedAction: 'Check physical field drains and retry live forecast sync.',
      nonWeatherBlindSpots: [
        'Upstream river surges (FFWC), embankment breaches, and sluice-gate operations are not modeled.',
      ],
    };
  }

  const score24h =
    max24h !== null
      ? piecewiseScore(max24h, th.rain24hModerateMm, th.rain24hHighMm, th.rain24hCriticalMm)
      : 0;
  const score72h =
    max72h !== null
      ? piecewiseScore(max72h, th.rain72hModerateMm, th.rain72hHighMm, th.rain72hCriticalMm)
      : 0;

  let score = Math.max(score24h, score72h);

  // Bounded coarse physiographic drainage modifier (only when meaningful rain is forecast)
  let coarseModifier = 0;
  if (score >= 18) {
    if (districtCtx.elevationM !== null && districtCtx.elevationM <= 8) {
      coarseModifier += 5;
    }
    const soilLower = (districtCtx.soilType ?? '').toLowerCase();
    if (soilLower.includes('clay') || soilLower.includes('peat') || soilLower.includes('haor')) {
      coarseModifier += 4;
    } else if (soilLower.includes('sandy')) {
      coarseModifier -= 3;
    }
  }
  score = Math.max(0, Math.min(100, score + coarseModifier));

  const triggers: RiskTriggerVariable[] = [];
  if (max24h !== null) {
    triggers.push({
      variable: 'daily.precipitation_sum (24h peak)',
      observedValue: `${max24h} mm`,
      threshold: `>= ${th.rain24hModerateMm} mm mod / >= ${th.rain24hHighMm} mm high / >= ${th.rain24hCriticalMm} mm crit`,
    });
  }
  if (max72h !== null) {
    triggers.push({
      variable: 'daily.precipitation_sum (max 72h rolling)',
      observedValue: `${max72h} mm`,
      threshold: `>= ${th.rain72hModerateMm} mm mod / >= ${th.rain72hHighMm} mm high / >= ${th.rain72hCriticalMm} mm crit`,
    });
  }
  if (maxProb !== null) {
    triggers.push({
      variable: 'daily.precipitation_probability_max',
      observedValue: `${maxProb}%`,
      threshold: 'Contextual precipitation likelihood',
    });
  }

  const severity = scoreToSeverity(score);
  const explanation =
    severity === 'Critical' || severity === 'High'
      ? `Forecast rainfall peaks at ${max24h ?? '—'} mm/24h (${max72h ?? '—'} mm over 72h) in ${
          districtCtx.districtName
        }. ${th.drainageSensitivityNote}${
          coarseModifier > 0
            ? ' Low district elevation / heavy clay context adds minor drainage congestion weight.'
            : ''
        }`
      : `Forecast rainfall accumulation (${max24h ?? '—'} mm max 24h; ${max72h ?? '—'} mm 72h) indicates ${severity.toLowerCase()} waterlogging risk for ${cropStage.profile.name}.`;

  const recommendedAction =
    severity === 'Critical' || severity === 'High'
      ? 'Clear peripheral drainage outlets and bund cuts before heavy showers arrive, delay nitrogen top-dressing, and protect harvested produce.'
      : severity === 'Moderate'
      ? 'Inspect field drainage furrows and avoid basal fertilizer application immediately ahead of rain pulses.'
      : 'Standard field drainage upkeep is sufficient.';

  return {
    dimensionId: 'excessive_rainfall_waterlogging',
    label: 'Excessive Rainfall & Waterlogging',
    score,
    severity,
    triggers,
    provenance: th.provenance,
    expectedWindow: features.window,
    explanation,
    recommendedAction,
    nonWeatherBlindSpots: [
      'District elevation and soil type act only as coarse modifiers, not plot-level topography or permeability probes.',
      'Riverine flash floods, tidal surge, polder sluice-gate status, and upstream cross-border runoff are not captured by rainfall totals alone.',
    ],
  };
}
