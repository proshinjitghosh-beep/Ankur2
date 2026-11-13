import type { EngineRiskSeverity, RiskTriggerVariable } from '../../../src/types/agri.ts';
import type { ExtractedWeatherFeatures, ResolvedCropStage, DimensionEvaluationOutput } from './types.ts';

function scoreToSeverity(score: number | null): EngineRiskSeverity {
  if (score === null) return 'Unavailable';
  if (score >= 75) return 'Critical';
  if (score >= 50) return 'High';
  if (score >= 25) return 'Moderate';
  return 'Low';
}

function interpolateBand(
  value: number,
  start: number,
  moderate: number,
  high: number,
  critical: number
): number {
  if (value <= start) return Math.max(0, Math.round(((value - (start - 6)) / 6) * 10));
  if (value <= moderate) {
    return Math.round(10 + ((value - start) / Math.max(0.5, moderate - start)) * 20);
  }
  if (value <= high) {
    return Math.round(30 + ((value - moderate) / Math.max(0.5, high - moderate)) * 25);
  }
  if (value <= critical) {
    return Math.round(55 + ((value - high) / Math.max(0.5, critical - high)) * 25);
  }
  return Math.min(100, Math.round(80 + ((value - critical) / 3) * 20));
}

export function evaluateHeatRisk(
  features: ExtractedWeatherFeatures,
  cropStage: ResolvedCropStage
): DimensionEvaluationOutput {
  const th = cropStage.thresholds.heat;
  const peakTmax = features.maxTempMaxC;
  const warmHours = features.countHoursTempAtLeast(th.hourlyWarmThresholdC);
  const nightMax = features.maxNightTempMinC;

  if (peakTmax === null) {
    return {
      dimensionId: 'heat_stress',
      label: 'Heat Stress',
      score: null,
      severity: 'Unavailable',
      triggers: [],
      provenance: th.provenance,
      expectedWindow: features.window,
      explanation: 'Heat stress cannot be evaluated because forecast temperature data is unavailable.',
      recommendedAction: 'Monitor local daytime temperatures visually and retry live weather sync.',
      nonWeatherBlindSpots: [
        '2 m NWP air temperature differs from irrigated paddy canopy microclimate.',
      ],
    };
  }

  let score = interpolateBand(
    peakTmax,
    th.tempMaxStartC,
    th.tempMaxModerateC,
    th.tempMaxHighC,
    th.tempMaxCriticalC
  );

  // Add bounded duration adjustment for sustained hot hours & warm nights
  if (warmHours !== null && warmHours >= 3) {
    score = Math.min(100, score + Math.min(12, warmHours * 2));
  }
  if (nightMax !== null && nightMax >= th.minNightStressC) {
    score = Math.min(100, score + 6);
  }

  const triggers: RiskTriggerVariable[] = [
    {
      variable: 'daily.temperature_2m_max',
      observedValue: `${peakTmax} °C (${features.window} peak)`,
      threshold: `>= ${th.tempMaxHighC} °C high / >= ${th.tempMaxCriticalC} °C critical`,
    },
  ];
  if (warmHours !== null) {
    triggers.push({
      variable: 'hourly.temperature_2m',
      observedValue: `${warmHours} hrs >= ${th.hourlyWarmThresholdC} °C`,
      threshold: `>= 3 hrs continuous exposure increases thermal stress`,
    });
  }
  if (nightMax !== null && nightMax >= th.minNightStressC) {
    triggers.push({
      variable: 'daily.temperature_2m_min',
      observedValue: `${nightMax} °C warmest night`,
      threshold: `>= ${th.minNightStressC} °C elevates night respiration loss`,
    });
  }

  const severity = scoreToSeverity(score);
  const stagePhrase =
    cropStage.stageStatus === 'Specified' && cropStage.growthStageLabel
      ? `during ${cropStage.growthStageLabel}`
      : '(crop-level baseline; growth stage unspecified)';

  const explanation =
    severity === 'Critical' || severity === 'High'
      ? `Forecast peak daytime temperatures reach ${peakTmax} °C${
          warmHours !== null ? ` with ${warmHours} hour(s) >= ${th.hourlyWarmThresholdC} °C` : ''
        } for ${cropStage.profile.name} ${stagePhrase}, exceeding elevated thermal stress thresholds.`
      : `Forecast temperatures peak at ${peakTmax} °C for ${cropStage.profile.name} ${stagePhrase}, indicating ${severity.toLowerCase()} thermal stress exposure.`;

  const recommendedAction =
    severity === 'Critical' || severity === 'High'
      ? cropStage.profile.id === 'rice'
        ? 'Maintain 3–5 cm shallow standing water if irrigation is available to help cool the panicle microclimate before midday, and avoid foliar spraying during peak afternoon heat.'
        : 'Schedule light evening irrigation where soil permits, avoid midday agrochemical sprays, and inspect sensitive blossoms or upper leaves for heat scorch.'
      : 'No urgent heat intervention required; continue routine field moisture checks during afternoon peaks.';

  return {
    dimensionId: 'heat_stress',
    label: 'Heat Stress',
    score,
    severity,
    triggers,
    provenance: th.provenance,
    expectedWindow: features.window,
    explanation,
    recommendedAction,
    nonWeatherBlindSpots: [
      'Cultivar-specific thermal tolerance varies (e.g., rice flowering tolerance spans ~32–36.5 °C across genotypes).',
      'Canopy transpiration and ponded water alter actual leaf/panicle temperature relative to 2 m air temperature.',
    ],
  };
}
