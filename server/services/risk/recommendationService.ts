import type {
  AgriculturalRiskAssessment,
  AnyCropInputId,
  DailyRiskProgressionPoint,
  DistrictId,
  DistrictMultiCropRiskPayload,
  ForecastWindow,
  HistoricalBaselineContext,
  RiskForecastPayload,
  SoilMoistureProxyMeta,
} from '../../../src/types/agri.ts';
import {
  findNearestDistrictGeo,
  getDistrictGeoById,
} from '../../data/bangladeshDistrictGeo.ts';
import {
  fetchOpenMeteoRiskWeather,
  OpenMeteoServiceError,
  validateCoordinates,
  type RawOpenMeteoForecast,
} from '../openMeteoService.ts';
import { computeAssessmentConfidence } from './confidenceService.ts';
import { resolveCropProfile } from './cropProfiles.ts';
import { evaluateDiseaseWeatherRisk } from './diseaseWeatherRisk.ts';
import { evaluateDroughtRisk } from './droughtRisk.ts';
import { resolveGrowthStage } from './growthStageService.ts';
import { evaluateHeatRisk } from './heatRisk.ts';
import { evaluateRainfallRisk } from './rainfallRisk.ts';
import { aggregateDimensionRisks } from './riskAggregator.ts';
import type {
  DistrictRiskModifierContext,
  ExtractedWeatherFeatures,
  ResolvedCropStage,
} from './types.ts';
import {
  extractWeatherFeatures,
  fetchContextualHistoricalBaseline,
} from './weatherFeatureExtractor.ts';
import { evaluateWindRisk } from './windRisk.ts';

export const CORE_SCIENTIFIC_DISCLOSURES: readonly string[] = [
  'Rule-based agro-meteorological decision support; not a trained machine-learning yield or pathogen infection predictor.',
  'Relative humidity (2 m NWP) is used as a leaf-wetness proxy only; high disease-weather scores indicate suitability, not confirmed infection.',
  'Topsoil moisture (0–7 cm) is a gridded land-surface model estimate in m³/m³, not a field sensor; district soil type and elevation act strictly as coarse modifiers.',
];

export function validateForecastWindow(rawWindow: unknown): ForecastWindow {
  if (rawWindow === undefined || rawWindow === null || rawWindow === '') {
    return '72h';
  }
  if (typeof rawWindow !== 'string') {
    throw new OpenMeteoServiceError(
      "Invalid window parameter. Must be one of '24h', '72h', '7d', '14d'.",
      400
    );
  }
  const normalized = rawWindow.trim().toLowerCase();
  if (
    normalized === '24h' ||
    normalized === '72h' ||
    normalized === '7d' ||
    normalized === '14d'
  ) {
    return normalized;
  }
  throw new OpenMeteoServiceError(
    "Invalid window parameter. Must be one of '24h', '72h', '7d', '14d'.",
    400
  );
}

export function resolveRiskLocation(params: {
  districtId?: unknown;
  lat?: unknown;
  lon?: unknown;
}): {
  districtId: DistrictId | null;
  name: string;
  division: AgriculturalRiskAssessment['location']['division'];
  latitude: number;
  longitude: number;
  elevationM: number | null;
  soilType: string | null;
  agroZone: string | null;
  modifierContext: DistrictRiskModifierContext;
} {
  const rawDistrict =
    typeof params.districtId === 'string' && params.districtId.trim() !== ''
      ? params.districtId.trim().toLowerCase()
      : null;

  if (rawDistrict) {
    const geo = getDistrictGeoById(rawDistrict);
    if (!geo) {
      throw new OpenMeteoServiceError(
        `Unknown districtId '${params.districtId}'.`,
        400
      );
    }
    return {
      districtId: geo.id,
      name: geo.name,
      division: geo.division,
      latitude: geo.latitude,
      longitude: geo.longitude,
      elevationM: geo.elevationM,
      soilType: geo.soilType,
      agroZone: geo.agroZone,
      modifierContext: {
        districtName: geo.name,
        elevationM: geo.elevationM,
        soilType: geo.soilType,
        riverBasin: geo.riverBasin,
        climateArchetype: geo.climateArchetype,
      },
    };
  }

  const { latitude, longitude } = validateCoordinates(params.lat, params.lon);
  const nearest = findNearestDistrictGeo(latitude, longitude);
  if (nearest) {
    return {
      districtId: nearest.id,
      name: `${nearest.name} Area (${latitude.toFixed(2)}, ${longitude.toFixed(2)})`,
      division: nearest.division,
      latitude,
      longitude,
      elevationM: nearest.elevationM,
      soilType: nearest.soilType,
      agroZone: nearest.agroZone,
      modifierContext: {
        districtName: nearest.name,
        elevationM: nearest.elevationM,
        soilType: nearest.soilType,
        riverBasin: nearest.riverBasin,
        climateArchetype: nearest.climateArchetype,
      },
    };
  }

  return {
    districtId: null,
    name: `Custom Coordinates (${latitude.toFixed(2)}, ${longitude.toFixed(2)})`,
    division: null,
    latitude,
    longitude,
    elevationM: null,
    soilType: null,
    agroZone: null,
    modifierContext: {
      districtName: `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`,
      elevationM: null,
      soilType: null,
      riverBasin: null,
      climateArchetype: null,
    },
  };
}

export function buildRiskAssessmentFromWeather(params: {
  location: ReturnType<typeof resolveRiskLocation>;
  cropStage: ResolvedCropStage;
  features: ExtractedWeatherFeatures;
  elevationOverrideM?: number | null;
  generatedAtIso?: string;
  dayOffset?: number;
}): AgriculturalRiskAssessment {
  const { location, cropStage, features, dayOffset } = params;
  const effectiveLocation = {
    districtId: location.districtId,
    name: location.name,
    division: location.division,
    latitude: location.latitude,
    longitude: location.longitude,
    elevationM: params.elevationOverrideM ?? location.elevationM,
    soilType: location.soilType ? `${location.soilType} (coarse district modifier)` : null,
    agroZone: location.agroZone,
  };

  const evaluations = [
    evaluateHeatRisk(features, cropStage),
    evaluateRainfallRisk(features, cropStage, location.modifierContext),
    evaluateDroughtRisk(features, cropStage, location.modifierContext),
    evaluateDiseaseWeatherRisk(features, cropStage),
    evaluateWindRisk(features, cropStage),
  ];

  const aggregated = aggregateDimensionRisks(evaluations, cropStage.weights);
  const confidence = computeAssessmentConfidence({
    features,
    cropStage,
    overallScore: aggregated.score,
    overallSeverity: aggregated.severity,
    dayOffset,
  });

  const cropDisplayName = cropStage.varietyId
    ? `${cropStage.profile.name} (${
        cropStage.profile.varieties.find((v) => v.id === cropStage.varietyId)?.label ??
        cropStage.varietyId
      })`
    : cropStage.profile.name;

  const disclosures = [
    ...CORE_SCIENTIFIC_DISCLOSURES,
    ...cropStage.disclosures,
  ];
  if (cropStage.seasonPlausibility.status === 'off_season_warning' && cropStage.seasonPlausibility.warningMessage) {
    disclosures.push(cropStage.seasonPlausibility.warningMessage);
  }

  return {
    assessmentId: [
      location.districtId ?? `${location.latitude},${location.longitude}`,
      cropStage.profile.id,
      cropStage.varietyId ?? cropStage.vegetableSubtype ?? 'standard',
      cropStage.growthStageId ?? 'unspecified',
      features.window,
    ].join(':'),
    generatedAtIso: params.generatedAtIso ?? new Date().toISOString(),
    forecastWindow: features.window,
    location: effectiveLocation,
    cropContext: {
      cropId: cropStage.profile.id,
      cropName: cropDisplayName,
      varietyId: cropStage.varietyId,
      vegetableSubtype: cropStage.vegetableSubtype,
      stageStatus: cropStage.stageStatus,
      stageSource: cropStage.stageSource,
      growthStageId: cropStage.growthStageId,
      growthStageLabel: cropStage.growthStageLabel,
      daysAfterPlanting: cropStage.daysAfterPlanting,
      seasonPlausibility: cropStage.seasonPlausibility,
    },
    overallRisk: {
      score: aggregated.score,
      severity: aggregated.severity,
      dominantHazard: aggregated.dominantHazard,
      weightedMeanScore: aggregated.weightedMeanScore,
      peakHazardScore: aggregated.peakHazardScore,
      blendScoreBeforeGuard: aggregated.blendScoreBeforeGuard,
      floorGuardApplied: aggregated.floorGuardApplied,
      activeWeightCoverage: aggregated.activeWeightCoverage,
      aggregationFormula: aggregated.aggregationFormula,
    },
    confidence,
    weatherContext: {
      forecastSource: 'open-meteo-forecast',
      soilMoistureProxy: features.soilMoistureProxy,
      historicalBaseline: features.historicalBaseline,
    },
    dimensions: aggregated.dimensions,
    scientificDisclosures: disclosures,
  };
}

export interface AssessRiskInput {
  districtId?: unknown;
  lat?: unknown;
  lon?: unknown;
  cropId: unknown;
  varietyId?: unknown;
  vegetableSubtype?: unknown;
  plantingDate?: unknown;
  daysAfterPlanting?: unknown;
  growthStageId?: unknown;
  window?: unknown;
  includeHistorical?: unknown;
}

export async function runCropRiskAssessment(
  input: AssessRiskInput
): Promise<{
  assessment: AgriculturalRiskAssessment;
  raw: RawOpenMeteoForecast;
  soilMoistureProxy: SoilMoistureProxyMeta;
  historicalBaseline: HistoricalBaselineContext;
  location: ReturnType<typeof resolveRiskLocation>;
  cropStage: ResolvedCropStage;
}> {
  const location = resolveRiskLocation({
    districtId: input.districtId,
    lat: input.lat,
    lon: input.lon,
  });

  const resolvedCrop = resolveCropProfile(input.cropId, input.varietyId);
  if (!resolvedCrop) {
    throw new OpenMeteoServiceError(
      `Unsupported or missing cropId '${String(input.cropId ?? '')}'.`,
      400
    );
  }

  const window = validateForecastWindow(input.window);
  const includeHistorical =
    String(input.includeHistorical ?? 'true').toLowerCase() !== 'false';

  const cropStage = resolveGrowthStage({
    profile: resolvedCrop.profile,
    varietyId: resolvedCrop.varietyId,
    vegetableSubtype: input.vegetableSubtype,
    plantingDate: input.plantingDate,
    daysAfterPlanting: input.daysAfterPlanting,
    growthStageId: input.growthStageId,
  });

  const forecastDays = window === '14d' ? 14 : 7;

  const [{ raw, payload, soilMoistureProxy }, historicalBaseline] =
    await Promise.all([
      fetchOpenMeteoRiskWeather({
        latitude: location.latitude,
        longitude: location.longitude,
        forecastDays,
      }),
      fetchContextualHistoricalBaseline({
        latitude: location.latitude,
        longitude: location.longitude,
        enabled: includeHistorical,
      }),
    ]);

  const features = extractWeatherFeatures({
    raw,
    soilMoistureProxy,
    historicalBaseline,
    window,
  });

  const assessment = buildRiskAssessmentFromWeather({
    location,
    cropStage,
    features,
    elevationOverrideM: payload.coordinates.elevationM,
  });

  return {
    assessment,
    raw,
    soilMoistureProxy,
    historicalBaseline,
    location,
    cropStage,
  };
}

export async function runCropRiskForecast(
  input: AssessRiskInput & { days?: unknown }
): Promise<RiskForecastPayload> {
  const forecastDaysNum =
    input.days === undefined || input.days === null || input.days === ''
      ? 7
      : Number(input.days);
  if (!Number.isInteger(forecastDaysNum) || forecastDaysNum < 1 || forecastDaysNum > 14) {
    throw new OpenMeteoServiceError(
      'Invalid days parameter. Must be an integer between 1 and 14.',
      400
    );
  }

  const windowOverride: ForecastWindow =
    forecastDaysNum <= 1 ? '24h' : forecastDaysNum <= 3 ? '72h' : forecastDaysNum <= 7 ? '7d' : '14d';

  const location = resolveRiskLocation({
    districtId: input.districtId,
    lat: input.lat,
    lon: input.lon,
  });

  const resolvedCrop = resolveCropProfile(input.cropId, input.varietyId);
  if (!resolvedCrop) {
    throw new OpenMeteoServiceError(
      `Unsupported or missing cropId '${String(input.cropId ?? '')}'.`,
      400
    );
  }

  const includeHistorical =
    String(input.includeHistorical ?? 'true').toLowerCase() !== 'false';

  const cropStage = resolveGrowthStage({
    profile: resolvedCrop.profile,
    varietyId: resolvedCrop.varietyId,
    vegetableSubtype: input.vegetableSubtype,
    plantingDate: input.plantingDate,
    daysAfterPlanting: input.daysAfterPlanting,
    growthStageId: input.growthStageId,
  });

  const [{ raw, payload, soilMoistureProxy }, historicalBaseline] =
    await Promise.all([
      fetchOpenMeteoRiskWeather({
        latitude: location.latitude,
        longitude: location.longitude,
        forecastDays: forecastDaysNum,
      }),
      fetchContextualHistoricalBaseline({
        latitude: location.latitude,
        longitude: location.longitude,
        enabled: includeHistorical,
      }),
    ]);

  const summaryFeatures = extractWeatherFeatures({
    raw,
    soilMoistureProxy,
    historicalBaseline,
    window: validateForecastWindow(input.window ?? windowOverride),
  });

  const assessmentSummary = buildRiskAssessmentFromWeather({
    location,
    cropStage,
    features: summaryFeatures,
    elevationOverrideM: payload.coordinates.elevationM,
  });

  const dailyProgression: DailyRiskProgressionPoint[] = raw.daily.time
    .slice(0, forecastDaysNum)
    .map((isoDate, idx) => {
      const dayFeatures = extractWeatherFeatures({
        raw,
        soilMoistureProxy,
        historicalBaseline,
        window: '24h',
        dayStartOffset: idx,
        dayCountOverride: 1,
      });

      const dayAssessment = buildRiskAssessmentFromWeather({
        location,
        cropStage,
        features: dayFeatures,
        elevationOverrideM: payload.coordinates.elevationM,
        dayOffset: idx,
      });

      const dimScores: Record<
        'heat_stress' | 'excessive_rainfall_waterlogging' | 'drought' | 'disease_conducive_weather' | 'wind_damage',
        number | null
      > = {
        heat_stress: null,
        excessive_rainfall_waterlogging: null,
        drought: null,
        disease_conducive_weather: null,
        wind_damage: null,
      };
      for (const d of dayAssessment.dimensions) {
        dimScores[d.dimensionId] = d.score;
      }

      const dayLabel = new Date(`${isoDate}T12:00:00Z`).toLocaleDateString(
        'en-US',
        { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' }
      );

      return {
        isoDate,
        dayLabel,
        overallScore: dayAssessment.overallRisk.score,
        overallSeverity: dayAssessment.overallRisk.severity,
        dominantHazard: dayAssessment.overallRisk.dominantHazard,
        confidenceLevel: dayAssessment.confidence.level,
        confidenceIndex: dayAssessment.confidence.index,
        dimensionScores: dimScores,
      };
    });

  return {
    assessmentSummary,
    dailyProgression,
  };
}

export async function runDistrictMultiCropRisk(params: {
  districtId: string;
  cropIds?: AnyCropInputId[];
  window?: unknown;
  includeHistorical?: unknown;
}): Promise<DistrictMultiCropRiskPayload> {
  const geo = getDistrictGeoById(params.districtId.trim().toLowerCase());
  if (!geo) {
    throw new OpenMeteoServiceError(
      `Unknown districtId '${params.districtId}'.`,
      400
    );
  }

  const window = validateForecastWindow(params.window);
  const forecastDays = window === '14d' ? 14 : 7;
  const includeHistorical =
    String(params.includeHistorical ?? 'true').toLowerCase() !== 'false';

  const targetCropIds: AnyCropInputId[] =
    params.cropIds && params.cropIds.length > 0
      ? params.cropIds
      : ['rice', 'wheat', 'maize', 'potato', 'vegetables', 'jute', 'mango', 'chili'];

  const [{ raw, payload, soilMoistureProxy }, historicalBaseline] =
    await Promise.all([
      fetchOpenMeteoRiskWeather({
        latitude: geo.latitude,
        longitude: geo.longitude,
        forecastDays,
      }),
      fetchContextualHistoricalBaseline({
        latitude: geo.latitude,
        longitude: geo.longitude,
        enabled: includeHistorical,
      }),
    ]);

  const location = resolveRiskLocation({ districtId: geo.id });
  const features = extractWeatherFeatures({
    raw,
    soilMoistureProxy,
    historicalBaseline,
    window,
  });

  const assessments: AgriculturalRiskAssessment[] = targetCropIds.map((cId) => {
    const resolved = resolveCropProfile(cId);
    if (!resolved) {
      throw new OpenMeteoServiceError(`Unsupported cropId '${cId}'.`, 400);
    }
    const cropStage = resolveGrowthStage({
      profile: resolved.profile,
      varietyId: resolved.varietyId,
    });
    return buildRiskAssessmentFromWeather({
      location,
      cropStage,
      features,
      elevationOverrideM: payload.coordinates.elevationM,
    });
  });

  return {
    district: {
      id: geo.id,
      name: geo.name,
      division: geo.division,
      latitude: geo.latitude,
      longitude: geo.longitude,
      agroZone: geo.agroZone,
      riverBasin: geo.riverBasin,
      elevationM: geo.elevationM,
      soilType: geo.soilType,
    },
    forecastWindow: window,
    generatedAtIso: new Date().toISOString(),
    assessments,
  };
}
