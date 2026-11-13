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
  humidityPct: number;
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
    tempC: number;
    feelsLikeC: number;
    humidityPct: number;
    rainfall24hMm: number;
    precipitationNowMm?: number;
    windKmh: number;
    windDir: string;
    uvIndex: number;
    soilMoisturePct: number;
    et0TodayMm?: number;
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
    elevationM: number;
    timezone: string;
  };
  fetchedAtIso: string;
  current: {
    timeIso: string;
    condition: string;
    weatherCode: number;
    tempC: number;
    feelsLikeC: number;
    humidityPct: number;
    precipitationNowMm: number;
    rainNowMm: number;
    rainfall24hMm: number;
    windKmh: number;
    windDirectionDeg: number;
    windDir: string;
    uvIndex: number;
    soilMoisturePct: number;
    et0TodayMm: number;
    surfacePressureHpa: number;
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
