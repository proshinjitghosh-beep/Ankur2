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

export function evaluateDiseaseWeatherRisk(
  features: ExtractedWeatherFeatures,
  cropStage: ResolvedCropStage
): DimensionEvaluationOutput {
  const th = cropStage.thresholds.disease;
  const consecWetHours = features.maxConsecutiveWetHours(
    th.rhProxyThresholdPct,
    th.tempMinC,
    th.tempMaxC
  );
  const totalWetHours = features.totalWetHours(
    th.rhProxyThresholdPct,
    th.tempMinC,
    th.tempMaxC
  );

  if (consecWetHours === null || totalWetHours === null) {
    return {
      dimensionId: 'disease_conducive_weather',
      label: 'Crop Disease-Conducive Weather',
      score: null,
      severity: 'Unavailable',
      triggers: [],
      provenance: th.provenance,
      expectedWindow: features.window,
      explanation:
        'Disease-conducive weather suitability cannot be evaluated because hourly relative humidity data is unavailable.',
      recommendedAction: 'Conduct direct visual leaf scouting for lesions or blight symptoms in the morning.',
      nonWeatherBlindSpots: [
        '2 m relative humidity is only a leaf-wetness proxy; pathogen inoculum and host resistance are unobserved.',
      ],
    };
  }

  let score = 0;
  if (consecWetHours < th.wetHoursModerate) {
    score = Math.round((consecWetHours / Math.max(1, th.wetHoursModerate)) * 23);
  } else if (consecWetHours < th.wetHoursHigh) {
    score = Math.round(
      25 +
        ((consecWetHours - th.wetHoursModerate) /
          Math.max(1, th.wetHoursHigh - th.wetHoursModerate)) *
          24
    );
  } else if (consecWetHours < th.wetHoursCritical) {
    score = Math.round(
      50 +
        ((consecWetHours - th.wetHoursHigh) /
          Math.max(1, th.wetHoursCritical - th.wetHoursHigh)) *
          24
    );
  } else {
    score = Math.min(
      95,
      Math.round(75 + ((consecWetHours - th.wetHoursCritical) / 10) * 20)
    );
  }

  // Slight boost if rain splashes + extended total wet hours coincide
  if (features.rainWindowTotalMm !== null && features.rainWindowTotalMm >= 15 && totalWetHours >= th.wetHoursHigh) {
    score = Math.min(98, score + 6);
  }

  const triggers: RiskTriggerVariable[] = [
    {
      variable: 'hourly.relative_humidity_2m (leaf-wetness proxy)',
      observedValue: `${consecWetHours} max consecutive hrs (${totalWetHours} total hrs) with RH >= ${th.rhProxyThresholdPct}% & ${th.tempMinC}–${th.tempMaxC} °C`,
      threshold: `>= ${th.wetHoursModerate}h mod / >= ${th.wetHoursHigh}h high / >= ${th.wetHoursCritical}h crit continuous proxy duration`,
    },
  ];

  const severity = scoreToSeverity(score);
  const diseaseNames = th.targetDiseases.join(', ');

  const explanation =
    severity === 'Critical' || severity === 'High'
      ? `Forecast predicts ${consecWetHours} consecutive hours with 2 m RH >= ${th.rhProxyThresholdPct}% inside the ${th.tempMinC}–${th.tempMaxC} °C thermal window, indicating weather conditions favorable (not proof of infection) for ${diseaseNames}.`
      : `Forecast microclimate (${consecWetHours} consecutive humid hours >= ${th.rhProxyThresholdPct}%) indicates ${severity.toLowerCase()} weather suitability for ${diseaseNames}.`;

  const recommendedAction =
    severity === 'Critical' || severity === 'High'
      ? `Scout lower foliage and stems early morning for ${diseaseNames}; improve canopy airflow where feasible and consult local DAE Upazila Agriculture Office before applying targeted fungicides.`
      : 'Continue routine weekly visual crop scouting; weather suitability alone does not warrant preventive spraying.';

  return {
    dimensionId: 'disease_conducive_weather',
    label: 'Crop Disease-Conducive Weather',
    score,
    severity,
    triggers,
    provenance: th.provenance,
    expectedWindow: features.window,
    explanation,
    recommendedAction,
    nonWeatherBlindSpots: [
      '2 m relative humidity is a leaf-wetness proxy only, not a physical canopy leaf-wetness sensor.',
      'Weather suitability does NOT confirm pathogen infection: spore inoculum, cultivar resistance, planting density, and prior spray coverage are unobserved.',
    ],
  };
}
