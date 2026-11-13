import type {
  EngineRiskSeverity,
  RiskDimensionAssessment,
  RiskDimensionId,
} from '../../../src/types/agri.ts';
import type { DimensionEvaluationOutput } from './types.ts';

export const PEAK_BLEND_LAMBDA = 0.45;
export const MIN_ACTIVE_WEIGHT_COVERAGE = 0.35;

export function scoreToEngineSeverity(score: number | null): EngineRiskSeverity {
  if (score === null) return 'Unavailable';
  if (score >= 75) return 'Critical';
  if (score >= 50) return 'High';
  if (score >= 25) return 'Moderate';
  return 'Low';
}

export interface AggregatedRiskResult {
  score: number | null;
  severity: EngineRiskSeverity;
  dominantHazard: RiskDimensionId | null;
  weightedMeanScore: number | null;
  peakHazardScore: number | null;
  blendScoreBeforeGuard: number | null;
  floorGuardApplied: boolean;
  activeWeightCoverage: number;
  aggregationFormula: string;
  dimensions: RiskDimensionAssessment[];
}

export function aggregateDimensionRisks(
  evaluations: DimensionEvaluationOutput[],
  weights: Record<RiskDimensionId, number>
): AggregatedRiskResult {
  const dimensions: RiskDimensionAssessment[] = evaluations.map((ev) => {
    const w = weights[ev.dimensionId] ?? 0;
    const excluded = ev.score === null || w <= 0;
    return {
      dimensionId: ev.dimensionId,
      label: ev.label,
      score: ev.score,
      severity: ev.severity,
      weight: Number(w.toFixed(4)),
      excludedFromComposite: excluded,
      triggers: ev.triggers,
      provenance: ev.provenance,
      expectedWindow: ev.expectedWindow,
      explanation: ev.explanation,
      recommendedAction: ev.recommendedAction,
      nonWeatherBlindSpots: ev.nonWeatherBlindSpots,
    };
  });

  const active = dimensions.filter(
    (d): d is RiskDimensionAssessment & { score: number } =>
      !d.excludedFromComposite && d.score !== null && d.weight > 0
  );

  const activeWeightCoverage = Number(
    active.reduce((sum, d) => sum + d.weight, 0).toFixed(4)
  );

  const formulaText =
    'max(0.55 * weightedMean + 0.45 * peakHazard, peakHazard >= 75 ? 75 : (peakHazard >= 50 ? 50 : 0))';

  if (active.length === 0 || activeWeightCoverage < MIN_ACTIVE_WEIGHT_COVERAGE) {
    return {
      score: null,
      severity: 'Unavailable',
      dominantHazard: null,
      weightedMeanScore: null,
      peakHazardScore: null,
      blendScoreBeforeGuard: null,
      floorGuardApplied: false,
      activeWeightCoverage,
      aggregationFormula: formulaText,
      dimensions,
    };
  }

  const weightedSum = active.reduce((sum, d) => sum + d.weight * d.score, 0);
  const weightedMeanRaw = weightedSum / activeWeightCoverage;
  const weightedMeanScore = Number(weightedMeanRaw.toFixed(2));

  let peakDim = active[0];
  for (const d of active) {
    if (d.score > peakDim.score || (d.score === peakDim.score && d.weight > peakDim.weight)) {
      peakDim = d;
    }
  }
  const peakHazardScore = peakDim.score;

  const blendRaw =
    (1 - PEAK_BLEND_LAMBDA) * weightedMeanRaw +
    PEAK_BLEND_LAMBDA * peakHazardScore;
  const blendScoreBeforeGuard = Number(blendRaw.toFixed(2));

  let guardedScore = blendRaw;
  let floorGuardApplied = false;
  if (peakHazardScore >= 75 && guardedScore < 75) {
    guardedScore = 75;
    floorGuardApplied = true;
  } else if (peakHazardScore >= 50 && peakHazardScore < 75 && guardedScore < 50) {
    guardedScore = 50;
    floorGuardApplied = true;
  }

  const finalScore = Math.min(100, Math.max(0, Math.round(guardedScore)));

  return {
    score: finalScore,
    severity: scoreToEngineSeverity(finalScore),
    dominantHazard: peakDim.dimensionId,
    weightedMeanScore,
    peakHazardScore,
    blendScoreBeforeGuard,
    floorGuardApplied,
    activeWeightCoverage,
    aggregationFormula: formulaText,
    dimensions,
  };
}
