import type { EngineRiskSeverity, RiskTriggerVariable } from '../../../src/types/agri.ts';
import type {
  DimensionEvaluationOutput,
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

export function evaluateWindRisk(
  features: ExtractedWeatherFeatures,
  cropStage: ResolvedCropStage
): DimensionEvaluationOutput {
  const th = cropStage.thresholds.wind;
  const gust = features.maxWindGustKmh;
  const sustained = features.maxSustainedWindKmh;

  if (gust === null && sustained === null) {
    return {
      dimensionId: 'wind_damage',
      label: 'Wind Damage',
      score: null,
      severity: 'Unavailable',
      triggers: [],
      provenance: th.provenance,
      expectedWindow: features.window,
      explanation: 'Wind damage risk cannot be evaluated because wind speed and gust data are unavailable.',
      recommendedAction: 'Watch local Bangladesh Meteorological Department (BMD) squall bulletins.',
      nonWeatherBlindSpots: [
        'Localized Kalboishakhi convective gusts and hailstorms often occur below global NWP grid resolution.',
      ],
    };
  }

  let score = 0;
  if (gust !== null) {
    if (gust < th.gustModerateKmh) {
      score = Math.round((gust / Math.max(1, th.gustModerateKmh)) * 22);
    } else if (gust < th.gustHighKmh) {
      score = Math.round(
        25 +
          ((gust - th.gustModerateKmh) /
            Math.max(1, th.gustHighKmh - th.gustModerateKmh)) *
            24
      );
    } else if (gust < th.gustCriticalKmh) {
      score = Math.round(
        50 +
          ((gust - th.gustHighKmh) /
            Math.max(1, th.gustCriticalKmh - th.gustHighKmh)) *
            24
      );
    } else {
      score = Math.min(
        100,
        Math.round(75 + ((gust - th.gustCriticalKmh) / 25) * 25)
      );
    }
  } else if (sustained !== null) {
    score =
      sustained >= th.sustainedHighKmh
        ? Math.min(85, Math.round(50 + ((sustained - th.sustainedHighKmh) / 20) * 35))
        : Math.round((sustained / Math.max(1, th.sustainedHighKmh)) * 45);
  }

  const triggers: RiskTriggerVariable[] = [];
  if (gust !== null) {
    triggers.push({
      variable: 'daily.wind_gusts_10m_max / hourly.wind_gusts_10m',
      observedValue: `${gust} km/h`,
      threshold: `>= ${th.gustModerateKmh} km/h mod / >= ${th.gustHighKmh} km/h high / >= ${th.gustCriticalKmh} km/h crit`,
    });
  }
  if (sustained !== null) {
    triggers.push({
      variable: 'daily.wind_speed_10m_max',
      observedValue: `${sustained} km/h`,
      threshold: `>= ${th.sustainedHighKmh} km/h sustained high`,
    });
  }

  const severity = scoreToSeverity(score);
  const explanation =
    severity === 'Critical' || severity === 'High'
      ? `Peak forecast wind gusts reach ${gust ?? sustained} km/h, posing elevated lodging, stem snap, or fruit-drop risk for ${cropStage.profile.name}.`
      : `Forecast wind gusts (${gust ?? sustained} km/h peak) remain ${severity.toLowerCase()} relative to structural lodging thresholds for ${cropStage.profile.name}.`;

  const recommendedAction =
    severity === 'Critical' || severity === 'High'
      ? cropStage.profile.id === 'mango'
        ? 'Prop heavy fruiting branches where feasible and harvest mature fruit early ahead of squall windows.'
        : cropStage.profile.id === 'vegetables'
        ? 'Reinforce bamboo stakes and overhead trellis ties immediately and pause foliar spraying during gusty hours.'
        : 'Drain excess standing surface water if soil anchorage is soft, and expedite harvest of fully mature sections before peak gusts.'
      : 'No special wind bracing required beyond standard trellis/bund upkeep.';

  return {
    dimensionId: 'wind_damage',
    label: 'Wind Damage',
    score,
    severity,
    triggers,
    provenance: th.provenance,
    expectedWindow: features.window,
    explanation,
    recommendedAction,
    nonWeatherBlindSpots: [
      'Sub-grid convective squalls (Kalboishakhi), microbursts, and hail are frequently underestimated by global NWP models.',
      'Field windbreak trees, soil saturation softness, and cultivar stalk strength strongly alter real lodging.',
    ],
  };
}
