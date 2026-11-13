import type {
  ConfidenceLevel,
  EngineRiskSeverity,
  ForecastWindow,
} from '../../../src/types/agri.ts';
import type { ExtractedWeatherFeatures, ResolvedCropStage } from './types.ts';

export const CONFIDENCE_VARIABLE_WEIGHTS = {
  dailyTempMax: 0.14,
  dailyTempMin: 0.08,
  hourlyTemp: 0.10,
  humidity: 0.12,
  dailyPrecipSum: 0.14,
  dailyPrecipProb: 0.08,
  dailyEt0: 0.10,
  dailyWindMax: 0.07,
  windGusts: 0.07,
  soilMoistureProxy: 0.06,
  historicalContext: 0.04,
} as const;

export const LEAD_TIME_FACTORS: Record<ForecastWindow, number> = {
  '24h': 0.88,
  '72h': 0.82,
  '7d': 0.70,
  '14d': 0.50,
};

function round2(n: number): number {
  return Number(n.toFixed(2));
}

export function computeLeadTimeFactor(
  window: ForecastWindow,
  dayOffset?: number
): number {
  if (typeof dayOffset === 'number' && Number.isFinite(dayOffset)) {
    const clampedDay = Math.max(0, Math.min(13, dayOffset));
    // Monotonic decay from 0.88 (day 0) to 0.45 (day 13) for single-day progression points
    return round2(0.88 - (clampedDay / 13) * (0.88 - 0.45));
  }
  return LEAD_TIME_FACTORS[window];
}

export function computeStageSpecificity(cropStage: ResolvedCropStage): number {
  if (cropStage.stageStatus === 'Specified') {
    const hasVarietyOrSubtype =
      cropStage.varietyId !== null || cropStage.vegetableSubtype !== null;
    return hasVarietyOrSubtype ? 0.90 : 0.80;
  }

  if (
    cropStage.profile.phenologyTrack === 'vegetables' &&
    cropStage.vegetableSubtype === null
  ) {
    return 0.48;
  }

  return 0.62;
}

export function computeAssessmentConfidence(params: {
  features: ExtractedWeatherFeatures;
  cropStage: ResolvedCropStage;
  overallScore: number | null;
  overallSeverity: EngineRiskSeverity;
  dayOffset?: number;
}): {
  level: ConfidenceLevel;
  index: number;
  isCalibratedProbability: false;
  components: {
    dataCompleteness: number;
    leadTimeFactor: number;
    stageSpecificity: number;
  };
  missingVariables: string[];
  formula: string;
  note: string;
} {
  const { features, cropStage, overallScore, overallSeverity, dayOffset } = params;
  const avail = features.variableAvailability;

  let dataCompleteness = 0;
  (
    Object.keys(CONFIDENCE_VARIABLE_WEIGHTS) as Array<
      keyof typeof CONFIDENCE_VARIABLE_WEIGHTS
    >
  ).forEach((key) => {
    if (avail[key]) {
      dataCompleteness += CONFIDENCE_VARIABLE_WEIGHTS[key];
    }
  });
  dataCompleteness = round2(Math.min(1, Math.max(0, dataCompleteness)));

  const leadTimeFactor = computeLeadTimeFactor(features.window, dayOffset);
  const stageSpecificity = computeStageSpecificity(cropStage);

  let index: number;
  if (
    dataCompleteness < 0.35 ||
    overallScore === null ||
    overallSeverity === 'Unavailable'
  ) {
    index = round2(dataCompleteness * leadTimeFactor * stageSpecificity);
  } else {
    const raw =
      leadTimeFactor * (0.55 * dataCompleteness + 0.45 * stageSpecificity);
    index = round2(Math.min(0.88, Math.max(0, raw)));
  }

  let level: ConfidenceLevel;
  const isShortLead =
    typeof dayOffset === 'number'
      ? dayOffset <= 2
      : features.window === '24h' || features.window === '72h';

  if (
    index < 0.25 ||
    dataCompleteness < 0.35 ||
    overallScore === null ||
    overallSeverity === 'Unavailable'
  ) {
    level = 'Insufficient';
  } else if (
    index >= 0.70 &&
    dataCompleteness >= 0.85 &&
    cropStage.stageStatus === 'Specified' &&
    isShortLead
  ) {
    level = 'High';
  } else if (index >= 0.50) {
    level = 'Moderate';
  } else {
    level = 'Low';
  }

  return {
    level,
    index,
    isCalibratedProbability: false,
    components: {
      dataCompleteness,
      leadTimeFactor,
      stageSpecificity,
    },
    missingVariables: [...features.missingVariables],
    formula:
      'round2(min(0.88, leadTimeFactor * (0.55 * dataCompleteness + 0.45 * stageSpecificity)))',
    note:
      'Operational signal-quality index (not a calibrated probability of crop loss). Capped strictly below 1.00 to reflect gridded NWP uncertainty.',
  };
}
