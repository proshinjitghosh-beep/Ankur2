import type {
  EngineRiskSeverity,
  ForecastWindow,
  HistoricalBaselineContext,
  RiskDimensionId,
  RiskTriggerVariable,
  SeasonPlausibility,
  SoilMoistureProxyMeta,
  ThresholdProvenance,
  VegetableSubtype,
} from '../../../src/types/agri.ts';
import type {
  CropGrowthStageSpec,
  CropRiskProfileSpec,
  DimensionThresholds,
} from '../../data/cropRiskCatalog.ts';

export interface ResolvedCropStage {
  profile: CropRiskProfileSpec;
  varietyId: string | null;
  vegetableSubtype: VegetableSubtype | null;
  stageStatus: 'Specified' | 'Unspecified';
  stageSource:
    | 'planting_date'
    | 'days_after_planting'
    | 'explicit_stage'
    | 'unspecified';
  growthStageId: string | null;
  growthStageLabel: string | null;
  daysAfterPlanting: number | null;
  weights: Record<RiskDimensionId, number>;
  thresholds: DimensionThresholds;
  seasonPlausibility: SeasonPlausibility;
  disclosures: string[];
}

export interface ExtractedWeatherFeatures {
  window: ForecastWindow;
  windowDaysCount: number;
  maxTempMaxC: number | null;
  maxNightTempMinC: number | null;
  minNightTempMinC: number | null;
  /** Number of forecast hours reaching or exceeding a given temperature cutoff */
  countHoursTempAtLeast: (cutoffC: number) => number | null;
  /** Maximum consecutive hours in the window with RH >= cutoff and temperature inside [tMin, tMax] */
  maxConsecutiveWetHours: (
    rhCutoffPct: number,
    tempMinC: number,
    tempMaxC: number
  ) => number | null;
  /** Total hours matching RH >= cutoff and temperature inside [tMin, tMax] */
  totalWetHours: (
    rhCutoffPct: number,
    tempMinC: number,
    tempMaxC: number
  ) => number | null;
  rain24hMaxMm: number | null;
  rain72hMaxMm: number | null;
  rainWindowTotalMm: number | null;
  maxRainProbPct: number | null;
  et0WindowTotalMm: number | null;
  netWaterDeficitMm: number | null;
  maxSustainedWindKmh: number | null;
  maxWindGustKmh: number | null;
  soilMoistureProxy: SoilMoistureProxyMeta;
  historicalBaseline: HistoricalBaselineContext;
  /** Non-null coverage flags for exact confidence calculation */
  variableAvailability: {
    dailyTempMax: boolean;
    dailyTempMin: boolean;
    hourlyTemp: boolean;
    humidity: boolean;
    dailyPrecipSum: boolean;
    dailyPrecipProb: boolean;
    dailyEt0: boolean;
    dailyWindMax: boolean;
    windGusts: boolean;
    soilMoistureProxy: boolean;
    historicalContext: boolean;
  };
  missingVariables: string[];
}

export interface DistrictRiskModifierContext {
  districtName: string;
  elevationM: number | null;
  soilType: string | null;
  riverBasin: string | null;
  climateArchetype: string | null;
}

export interface DimensionEvaluationOutput {
  dimensionId: RiskDimensionId;
  label: string;
  score: number | null;
  severity: EngineRiskSeverity;
  triggers: RiskTriggerVariable[];
  provenance: ThresholdProvenance;
  expectedWindow: string;
  explanation: string;
  recommendedAction: string;
  nonWeatherBlindSpots: string[];
}
