export type NavSection =
  | 'overview'
  | 'weather'
  | 'crop-risk'
  | 'warnings'
  | 'advisor'
  | 'smart-farming'
  | 'settings';

export type RiskSeverity = 'Low' | 'Medium' | 'High';

export type WarningCategory =
  | 'Flood'
  | 'Heavy Rainfall'
  | 'Drought'
  | 'Heat Stress'
  | 'Crop Disease';

export type DivisionName =
  | 'Dhaka'
  | 'Chattogram'
  | 'Rajshahi'
  | 'Khulna'
  | 'Barishal'
  | 'Sylhet'
  | 'Rangpur'
  | 'Mymensingh';

export type DistrictId =
  // Dhaka Division (13)
  | 'dhaka'
  | 'faridpur'
  | 'gazipur'
  | 'gopalganj'
  | 'kishoreganj'
  | 'madaripur'
  | 'manikganj'
  | 'munshiganj'
  | 'narayanganj'
  | 'narsingdi'
  | 'rajbari'
  | 'shariatpur'
  | 'tangail'
  // Chattogram Division (11)
  | 'bandarban'
  | 'brahmanbaria'
  | 'chandpur'
  | 'chattogram'
  | 'coxs-bazar'
  | 'cumilla'
  | 'feni'
  | 'khagrachhari'
  | 'lakshmipur'
  | 'noakhali'
  | 'rangamati'
  // Rajshahi Division (8)
  | 'bogura'
  | 'chapainawabganj'
  | 'joypurhat'
  | 'naogaon'
  | 'natore'
  | 'pabna'
  | 'rajshahi'
  | 'sirajganj'
  // Khulna Division (10)
  | 'bagerhat'
  | 'chuadanga'
  | 'jashore'
  | 'jhenaidah'
  | 'khulna'
  | 'kushtia'
  | 'magura'
  | 'meherpur'
  | 'narail'
  | 'satkhira'
  // Barishal Division (6)
  | 'barguna'
  | 'barishal'
  | 'bhola'
  | 'jhalokathi'
  | 'patuakhali'
  | 'pirojpur'
  // Sylhet Division (4)
  | 'habiganj'
  | 'moulvibazar'
  | 'sunamganj'
  | 'sylhet'
  // Rangpur Division (8)
  | 'dinajpur'
  | 'gaibandha'
  | 'kurigram'
  | 'lalmonirhat'
  | 'nilphamari'
  | 'panchagarh'
  | 'rangpur'
  | 'thakurgaon'
  // Mymensingh Division (4)
  | 'jamalpur'
  | 'mymensingh'
  | 'netrokona'
  | 'sherpur';

export type CropId =
  | 'aman-rice'
  | 'boro-rice'
  | 'potato'
  | 'jute'
  | 'wheat'
  | 'maize';

export interface DailyForecastPoint {
  isoDate?: string;
  day: string;
  dateLabel: string;
  condition: 'Clear' | 'Partly Cloudy' | 'Showers' | 'Heavy Rain' | 'Thunderstorm' | 'Heat Haze';
  tempMaxC: number;
  tempMinC: number;
  rainfallMm: number;
  rainOnlyMm?: number;
  humidityPct: number | null;
  windKmh: number;
  rainProbPct: number;
  et0Mm?: number;
}

export interface ExtremeWeatherIndicator {
  id: string;
  label: string;
  value: string;
  status: RiskSeverity;
  thresholdNote: string;
}

export interface DistrictProfile {
  id: DistrictId;
  name: string;
  division: DivisionName;
  latitude: number;
  longitude: number;
  agroZone: string;
  riverBasin: string;
  elevationM: number;
  soilType: string;
  currentWeather: {
    condition: string;
    tempC: number | null;
    feelsLikeC: number | null;
    humidityPct: number | null;
    rainfall24hMm: number | null;
    precipitationNowMm?: number | null;
    rainNowMm?: number | null;
    windKmh: number | null;
    windDir: string | null;
    uvIndex: number | null;
    soilMoisturePct: number | null;
    et0TodayMm?: number | null;
    surfacePressureHpa?: number | null;
    updatedLabel: string;
    isLive?: boolean;
  };
  overallRiskScore: number;
  overallRiskSeverity: RiskSeverity;
  extremeIndicators: ExtremeWeatherIndicator[];
  forecast14Days: DailyForecastPoint[];
}

export interface LiveWeatherForecastPayload {
  source: 'open-meteo-forecast';
  coordinates: {
    latitude: number;
    longitude: number;
    elevationM: number | null;
    timezone: string;
  };
  fetchedAtIso: string;
  current: {
    timeIso: string;
    condition: string;
    weatherCode: number | null;
    tempC: number | null;
    feelsLikeC: number | null;
    humidityPct: number | null;
    precipitationNowMm: number | null;
    rainNowMm: number | null;
    rainfall24hMm: number | null;
    windKmh: number | null;
    windDirectionDeg: number | null;
    windDir: string | null;
    uvIndex: number | null;
    soilMoisturePct: number | null;
    et0TodayMm: number | null;
    surfacePressureHpa: number | null;
  };
  daily: DailyForecastPoint[];
  extremeIndicators: ExtremeWeatherIndicator[];
}

export interface HistoricalWeatherDay {
  isoDate: string;
  dateLabel: string;
  tempMaxC: number;
  tempMinC: number;
  tempMeanC: number;
  precipitationMm: number;
  rainMm: number;
  windMaxKmh: number;
  humidityMeanPct: number;
  et0Mm: number;
}

export interface HistoricalWeatherPayload {
  source: 'open-meteo-archive';
  coordinates: {
    latitude: number;
    longitude: number;
    elevationM: number;
    timezone: string;
  };
  startDate: string;
  endDate: string;
  fetchedAtIso: string;
  summary: {
    daysCount: number;
    totalPrecipitationMm: number;
    totalRainMm: number;
    avgTempMaxC: number;
    avgTempMinC: number;
    avgHumidityPct: number;
    totalEt0Mm: number;
    dryDaysCount: number;
    heavyRainDaysCount: number;
  };
  daily: HistoricalWeatherDay[];
}

export interface CropProfile {
  id: CropId;
  name: string;
  localName: string;
  season: string;
  typicalCycleDays: number;
  optimalTempRangeC: string;
  waterNeedSummary: string;
  keyDiseases: string[];
}

export interface RiskDimensionDetail {
  type: 'Flood' | 'Drought' | 'Heat' | 'Disease';
  severity: RiskSeverity;
  score: number;
  primaryDriver: string;
  explanation: string;
  preventiveAction: string;
}

export interface CropDistrictRiskAssessment {
  cropId: CropId;
  districtId: DistrictId;
  compositeScore: number;
  compositeSeverity: RiskSeverity;
  summary: string;
  dimensions: RiskDimensionDetail[];
}

export interface EarlyWarningAlert {
  id: string;
  title: string;
  category: WarningCategory;
  severity: RiskSeverity;
  districtIds: DistrictId[];
  areaLabel: string;
  issuedLabel: string;
  validWindow: string;
  triggerMetric: string;
  affectedCrops: string[];
  impactSummary: string;
  actionChecklist: string[];
}

export interface TrackedCropPlot {
  id: string;
  plotName: string;
  cropId: CropId;
  variety: string;
  areaBigha: number;
  daysAfterPlanting: number;
  totalCycleDays: number;
  currentStage: string;
  nextStage: string;
  daysToNextStage: number;
  healthStatus: RiskSeverity;
  soilMoisturePct: number;
  targetMoistureRange: string;
  irrigationAction: string;
  irrigationAmountMm: number;
  nextIrrigationWindow: string;
  awdNote: string;
}

export interface FarmingActivityItem {
  id: string;
  title: string;
  plotName: string;
  category: 'Irrigation' | 'Fertilization' | 'Pest & Disease' | 'Drainage & Bunds' | 'Harvest Prep';
  dueDateLabel: string;
  priority: RiskSeverity;
  completed: boolean;
  notes: string;
}

export interface AdvisorMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  recommendations?: string[];
  timingNote?: string;
  timestampLabel: string;
}

export interface UserPreferences {
  farmerName: string;
  farmName: string;
  farmSizeBigha: number;
  selectedDistrict: DistrictId;
  primaryCrop: CropId;
  secondaryCrop: CropId;
  tempUnit: 'C' | 'F';
  smsAlertsEnabled: boolean;
  voiceAlertsEnabled: boolean;
  floodSensitivity: RiskSeverity;
  showBengaliTerms: boolean;
}

// ============================================================================
// Phase 2: Agricultural Risk Intelligence Engine Contracts
// ============================================================================

export type EngineRiskSeverity =
  | 'Low'
  | 'Moderate'
  | 'High'
  | 'Critical'
  | 'Unavailable';

export type RiskCropId =
  | 'rice'
  | 'wheat'
  | 'maize'
  | 'potato'
  | 'vegetables'
  | 'jute'
  | 'mango'
  | 'chili';

export type AnyCropInputId = RiskCropId | CropId;

export type VegetableSubtype =
  | 'solanaceous_fruiting'
  | 'cucurbits'
  | 'leafy_greens'
  | 'brassicas';

export type RiskDimensionId =
  | 'heat_stress'
  | 'excessive_rainfall_waterlogging'
  | 'drought'
  | 'disease_conducive_weather'
  | 'wind_damage';

export type ForecastWindow = '24h' | '72h' | '7d' | '14d';

export type ConfidenceLevel = 'High' | 'Moderate' | 'Low' | 'Insufficient';

export type ProvenanceStatus =
  | 'verified_reference'
  | 'proposed_requires_validation';

export interface ThresholdProvenance {
  status: ProvenanceStatus;
  sourceTitle: string | null;
  issuingOrganization: string | null;
  publicationYear: number | null;
  urlOrDoi: string | null;
  scopeNote: string;
}

export interface RiskTriggerVariable {
  variable: string;
  observedValue: string;
  threshold: string;
}

export interface RiskDimensionAssessment {
  dimensionId: RiskDimensionId;
  label: string;
  score: number | null;
  severity: EngineRiskSeverity;
  weight: number;
  excludedFromComposite: boolean;
  triggers: RiskTriggerVariable[];
  provenance: ThresholdProvenance;
  expectedWindow: string;
  explanation: string;
  recommendedAction: string;
  nonWeatherBlindSpots: string[];
}

export interface SeasonPlausibility {
  status: 'plausible' | 'off_season_warning' | 'not_evaluated';
  expectedPlantingWindow: string | null;
  warningMessage: string | null;
}

export interface SoilMoistureProxyMeta {
  rawM3PerM3: number | null;
  unit: 'm3/m3';
  depthLayer: '0-7 cm';
  source: 'hourly_model_proxy' | 'unavailable';
  observationHourIso: string | null;
  isObservedSensor: false;
  heuristicPct: number | null;
  isUnvalidatedHeuristic: true;
  heuristicNote: string;
}

export interface HistoricalBaselineContext {
  source: 'open-meteo-archive' | 'unavailable';
  dataset: 'era5' | 'era5_land' | 'ecmwf_ifs_historical_forecast';
  archiveLagDays: number;
  startDate: string | null;
  endDate: string | null;
  totalPrecipitationMm: number | null;
  totalEt0Mm: number | null;
  dryDaysCount: number | null;
  heavyRainDaysCount: number | null;
  roleNote: string;
  unavailableReason?: string;
}

export interface AgriculturalRiskAssessment {
  assessmentId: string;
  generatedAtIso: string;
  forecastWindow: ForecastWindow;
  location: {
    districtId: DistrictId | null;
    name: string;
    division: DivisionName | null;
    latitude: number;
    longitude: number;
    elevationM: number | null;
    soilType: string | null;
    agroZone: string | null;
  };
  cropContext: {
    cropId: RiskCropId;
    cropName: string;
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
    seasonPlausibility: SeasonPlausibility;
  };
  overallRisk: {
    score: number | null;
    severity: EngineRiskSeverity;
    dominantHazard: RiskDimensionId | null;
    weightedMeanScore: number | null;
    peakHazardScore: number | null;
    blendScoreBeforeGuard: number | null;
    floorGuardApplied: boolean;
    activeWeightCoverage: number;
    aggregationFormula: string;
  };
  confidence: {
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
  };
  weatherContext: {
    forecastSource: 'open-meteo-forecast';
    soilMoistureProxy: SoilMoistureProxyMeta;
    historicalBaseline: HistoricalBaselineContext;
  };
  dimensions: RiskDimensionAssessment[];
  scientificDisclosures: string[];
}

export interface DailyRiskProgressionPoint {
  isoDate: string;
  dayLabel: string;
  overallScore: number | null;
  overallSeverity: EngineRiskSeverity;
  dominantHazard: RiskDimensionId | null;
  confidenceLevel: ConfidenceLevel;
  confidenceIndex: number;
  dimensionScores: Record<RiskDimensionId, number | null>;
}

export interface RiskForecastPayload {
  assessmentSummary: AgriculturalRiskAssessment;
  dailyProgression: DailyRiskProgressionPoint[];
}

export interface DistrictMultiCropRiskPayload {
  district: {
    id: DistrictId;
    name: string;
    division: DivisionName;
    latitude: number;
    longitude: number;
    agroZone: string;
    riverBasin: string;
    elevationM: number;
    soilType: string;
  };
  forecastWindow: ForecastWindow;
  generatedAtIso: string;
  assessments: AgriculturalRiskAssessment[];
}

