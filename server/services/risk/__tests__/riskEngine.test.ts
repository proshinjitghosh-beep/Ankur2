import assert from 'node:assert/strict';
import type { RawOpenMeteoForecast } from '../../openMeteoService.ts';
import { OpenMeteoServiceError } from '../../openMeteoService.ts';
import { CROP_RISK_CATALOG } from '../../../data/cropRiskCatalog.ts';
import { computeAssessmentConfidence } from '../confidenceService.ts';
import { resolveCropProfile } from '../cropProfiles.ts';
import { evaluateDiseaseWeatherRisk } from '../diseaseWeatherRisk.ts';
import { evaluateDroughtRisk } from '../droughtRisk.ts';
import { resolveGrowthStage } from '../growthStageService.ts';
import { evaluateHeatRisk } from '../heatRisk.ts';
import { evaluateRainfallRisk } from '../rainfallRisk.ts';
import { aggregateDimensionRisks } from '../riskAggregator.ts';
import { extractWeatherFeatures } from '../weatherFeatureExtractor.ts';
import { evaluateWindRisk } from '../windRisk.ts';
import type { DimensionEvaluationOutput } from '../types.ts';

function makeDummyEval(
  dimensionId: DimensionEvaluationOutput['dimensionId'],
  score: number | null
): DimensionEvaluationOutput {
  const severity =
    score === null
      ? 'Unavailable'
      : score >= 75
      ? 'Critical'
      : score >= 50
      ? 'High'
      : score >= 25
      ? 'Moderate'
      : 'Low';
  return {
    dimensionId,
    label: dimensionId,
    score,
    severity,
    triggers: [],
    provenance: {
      status: 'proposed_requires_validation',
      sourceTitle: null,
      issuingOrganization: null,
      publicationYear: null,
      urlOrDoi: null,
      scopeNote: 'test',
    },
    expectedWindow: '72h',
    explanation: 'test',
    recommendedAction: 'test',
    nonWeatherBlindSpots: [],
  };
}

function testRiskAggregation() {
  const weights = {
    heat_stress: 0.3,
    excessive_rainfall_waterlogging: 0.2,
    drought: 0.2,
    disease_conducive_weather: 0.15,
    wind_damage: 0.15,
  };

  // 1. Exact sample calculation reconciliation
  const sampleResult = aggregateDimensionRisks(
    [
      makeDummyEval('heat_stress', 76),
      makeDummyEval('excessive_rainfall_waterlogging', 14),
      makeDummyEval('drought', 32),
      makeDummyEval('disease_conducive_weather', 18),
      makeDummyEval('wind_damage', 12),
    ],
    weights
  );
  assert.equal(sampleResult.weightedMeanScore, 36.5);
  assert.equal(sampleResult.peakHazardScore, 76);
  assert.equal(sampleResult.blendScoreBeforeGuard, 54.28);
  assert.equal(sampleResult.floorGuardApplied, true);
  assert.equal(sampleResult.score, 75);
  assert.equal(sampleResult.severity, 'Critical');
  assert.equal(sampleResult.dominantHazard, 'heat_stress');

  // 2. High peak floor guard (68 peak with four 10s -> forced >= 50 High)
  const highGuardResult = aggregateDimensionRisks(
    [
      makeDummyEval('heat_stress', 10),
      makeDummyEval('excessive_rainfall_waterlogging', 68),
      makeDummyEval('drought', 10),
      makeDummyEval('disease_conducive_weather', 10),
      makeDummyEval('wind_damage', 10),
    ],
    weights
  );
  assert.equal(highGuardResult.floorGuardApplied, true);
  assert.equal(highGuardResult.score, 50);
  assert.equal(highGuardResult.severity, 'High');

  // 3. Missing dimensions excluded from denominator (never coerced to 0)
  const partialResult = aggregateDimensionRisks(
    [
      makeDummyEval('heat_stress', 60),
      makeDummyEval('excessive_rainfall_waterlogging', 60),
      makeDummyEval('drought', null),
      makeDummyEval('disease_conducive_weather', null),
      makeDummyEval('wind_damage', null),
    ],
    weights
  );
  assert.equal(partialResult.activeWeightCoverage, 0.5);
  assert.equal(partialResult.weightedMeanScore, 60);
  assert.equal(partialResult.score, 60);
  assert.equal(partialResult.severity, 'High');
  assert.equal(
    partialResult.dimensions.find((d) => d.dimensionId === 'drought')
      ?.excludedFromComposite,
    true
  );

  // 4. Zero-weight dimension excluded cleanly
  const zeroWeightResult = aggregateDimensionRisks(
    [
      makeDummyEval('heat_stress', 40),
      makeDummyEval('excessive_rainfall_waterlogging', 40),
      makeDummyEval('drought', 90), // w = 0 -> excluded
      makeDummyEval('disease_conducive_weather', 40),
      makeDummyEval('wind_damage', 40),
    ],
    {
      heat_stress: 0.4,
      excessive_rainfall_waterlogging: 0.3,
      drought: 0,
      disease_conducive_weather: 0.2,
      wind_damage: 0.1,
    }
  );
  assert.equal(zeroWeightResult.score, 40);
  assert.equal(zeroWeightResult.severity, 'Moderate');

  // 5. Coverage < 0.35 triggers Unavailable
  const insufficientCoverage = aggregateDimensionRisks(
    [
      makeDummyEval('heat_stress', 80),
      makeDummyEval('excessive_rainfall_waterlogging', null),
      makeDummyEval('drought', null),
      makeDummyEval('disease_conducive_weather', null),
      makeDummyEval('wind_damage', null),
    ],
    weights
  );
  assert.equal(insufficientCoverage.score, null);
  assert.equal(insufficientCoverage.severity, 'Unavailable');
}

function testConfidenceCalculation() {
  const rice = resolveCropProfile('rice', 'boro')!;
  const boroFlowering = resolveGrowthStage({
    profile: rice.profile,
    varietyId: rice.varietyId,
    plantingDate: '2026-01-10',
    referenceDateIso: '2026-04-04T08:00:00Z',
  });

  const fullFeatures = {
    window: '72h' as const,
    windowDaysCount: 3,
    maxTempMaxC: 36,
    maxNightTempMinC: 25,
    minNightTempMinC: 21,
    countHoursTempAtLeast: () => 4,
    maxConsecutiveWetHours: () => 2,
    totalWetHours: () => 2,
    rain24hMaxMm: 4,
    rain72hMaxMm: 4,
    rainWindowTotalMm: 4,
    maxRainProbPct: 20,
    et0WindowTotalMm: 13.8,
    netWaterDeficitMm: 9.8,
    maxSustainedWindKmh: 12,
    maxWindGustKmh: 22,
    soilMoistureProxy: {
      rawM3PerM3: 0.211,
      unit: 'm3/m3' as const,
      depthLayer: '0-7 cm' as const,
      source: 'hourly_model_proxy' as const,
      observationHourIso: '2026-04-04T14:00',
      isObservedSensor: false as const,
      heuristicPct: 44,
      isUnvalidatedHeuristic: true as const,
      heuristicNote: 'test',
    },
    historicalBaseline: {
      source: 'open-meteo-archive' as const,
      dataset: 'era5' as const,
      archiveLagDays: 5,
      startDate: '2026-02-28',
      endDate: '2026-03-29',
      totalPrecipitationMm: 18,
      totalEt0Mm: 124,
      dryDaysCount: 25,
      heavyRainDaysCount: 0,
      roleNote: 'test',
    },
    variableAvailability: {
      dailyTempMax: true,
      dailyTempMin: true,
      hourlyTemp: true,
      humidity: true,
      dailyPrecipSum: true,
      dailyPrecipProb: true,
      dailyEt0: true,
      dailyWindMax: true,
      windGusts: true,
      soilMoistureProxy: true,
      historicalContext: true,
    },
    missingVariables: [],
  };

  // 1. Exact match with sample response: 0.82 * (0.55*1.0 + 0.45*0.90) = 0.7831 -> 0.78
  const sampleConf = computeAssessmentConfidence({
    features: fullFeatures,
    cropStage: boroFlowering,
    overallScore: 75,
    overallSeverity: 'Critical',
  });
  assert.equal(sampleConf.components.dataCompleteness, 1.0);
  assert.equal(sampleConf.components.leadTimeFactor, 0.82);
  assert.equal(sampleConf.components.stageSpecificity, 0.9);
  assert.equal(sampleConf.index, 0.78);
  assert.equal(sampleConf.level, 'High');
  assert.equal(sampleConf.isCalibratedProbability, false);

  // 2. Theoretical ceiling < 1.00 even on 24h
  const conf24h = computeAssessmentConfidence({
    features: { ...fullFeatures, window: '24h' },
    cropStage: boroFlowering,
    overallScore: 20,
    overallSeverity: 'Low',
  });
  assert.ok(conf24h.index < 1.0 && conf24h.index <= 0.88);

  // 3. Critical severity on 14d horizon cannot claim High confidence
  const conf14d = computeAssessmentConfidence({
    features: { ...fullFeatures, window: '14d' },
    cropStage: boroFlowering,
    overallScore: 85,
    overallSeverity: 'Critical',
  });
  assert.equal(conf14d.level, 'Low');

  // 4. Low data completeness (< 0.35) forces Insufficient confidence
  const confLowData = computeAssessmentConfidence({
    features: {
      ...fullFeatures,
      variableAvailability: {
        dailyTempMax: false,
        dailyTempMin: false,
        hourlyTemp: false,
        humidity: false,
        dailyPrecipSum: true,
        dailyPrecipProb: false,
        dailyEt0: false,
        dailyWindMax: false,
        windGusts: false,
        soilMoistureProxy: false,
        historicalContext: false,
      },
    },
    cropStage: boroFlowering,
    overallScore: 40,
    overallSeverity: 'Moderate',
  });
  assert.equal(confLowData.level, 'Insufficient');
}

function testGrowthStageResolution() {
  const rice = resolveCropProfile('rice', 'boro')!;

  // 1. Valid Boro planting date -> Specified flowering in early April
  const boroSpec = resolveGrowthStage({
    profile: rice.profile,
    varietyId: rice.varietyId,
    plantingDate: '2026-01-10',
    referenceDateIso: '2026-04-04T08:00:00Z',
  });
  assert.equal(boroSpec.stageStatus, 'Specified');
  assert.equal(boroSpec.growthStageId, 'flowering');
  assert.equal(boroSpec.daysAfterPlanting, 84);
  assert.equal(boroSpec.seasonPlausibility.status, 'plausible');

  // 2. Off-season Boro planting in August -> warning emitted, farmer date preserved
  const offSeason = resolveGrowthStage({
    profile: rice.profile,
    varietyId: rice.varietyId,
    plantingDate: '2026-08-20',
    referenceDateIso: '2026-11-13T08:00:00Z',
  });
  assert.equal(offSeason.daysAfterPlanting, 85);
  assert.equal(offSeason.seasonPlausibility.status, 'off_season_warning');
  assert.ok(offSeason.seasonPlausibility.warningMessage?.includes('Aman'));

  // 3. Invalid calendar date rejected (2026-02-30)
  assert.throws(
    () =>
      resolveGrowthStage({
        profile: rice.profile,
        varietyId: rice.varietyId,
        plantingDate: '2026-02-30',
      }),
    (err: unknown) => err instanceof OpenMeteoServiceError && err.statusCode === 400
  );

  // 4. Missing planting info -> Unspecified (never fabricated)
  const unspec = resolveGrowthStage({
    profile: rice.profile,
    varietyId: rice.varietyId,
  });
  assert.equal(unspec.stageStatus, 'Unspecified');
  assert.equal(unspec.growthStageId, null);

  // 5. Perennial Mango ignores plantingDate and uses growthStageId
  const mango = resolveCropProfile('mango')!;
  const mangoStage = resolveGrowthStage({
    profile: mango.profile,
    varietyId: mango.varietyId,
    plantingDate: '2026-01-15',
    growthStageId: 'panicle_emergence_flowering',
    referenceDateIso: '2026-02-20T00:00:00Z',
  });
  assert.equal(mangoStage.stageStatus, 'Specified');
  assert.equal(mangoStage.daysAfterPlanting, null);
  assert.equal(mangoStage.growthStageId, 'panicle_emergence_flowering');
  assert.ok(mangoStage.disclosures.some((d) => d.includes('ignored')));

  // 6. Vegetables without subtype discloses limitation & lowers specificity
  const veg = resolveCropProfile('vegetables')!;
  const vegStage = resolveGrowthStage({ profile: veg.profile, varietyId: null });
  assert.equal(vegStage.vegetableSubtype, null);
  assert.ok(vegStage.disclosures.some((d) => d.includes('vegetableSubtype')));
}

function testMissingWeatherNullHandling() {
  const rawAllNull: RawOpenMeteoForecast = {
    latitude: 24.85,
    longitude: 89.38,
    elevation: null,
    timezone: 'Asia/Dhaka',
    current: { time: '2026-11-13T12:00' },
    hourly: {
      time: ['2026-11-13T12:00'],
      temperature_2m: [null],
      relative_humidity_2m: [null],
      precipitation: [null],
      wind_speed_10m: [null],
      wind_gusts_10m: [null],
      soil_moisture_0_to_7cm: [null],
    },
    daily: {
      time: ['2026-11-13', '2026-11-14', '2026-11-15'],
      weather_code: [null, null, null],
      temperature_2m_max: [null, null, null],
      temperature_2m_min: [null, null, null],
      precipitation_sum: [null, null, null],
      wind_speed_10m_max: [null, null, null],
      wind_gusts_10m_max: [null, null, null],
      et0_fao_evapotranspiration: [null, null, null],
      relative_humidity_2m_mean: [null, null, null],
    },
  };

  const features = extractWeatherFeatures({
    raw: rawAllNull,
    soilMoistureProxy: {
      rawM3PerM3: null,
      unit: 'm3/m3',
      depthLayer: '0-7 cm',
      source: 'unavailable',
      observationHourIso: null,
      isObservedSensor: false,
      heuristicPct: null,
      isUnvalidatedHeuristic: true,
      heuristicNote: 'test',
    },
    historicalBaseline: {
      source: 'unavailable',
      dataset: 'era5',
      archiveLagDays: 5,
      startDate: null,
      endDate: null,
      totalPrecipitationMm: null,
      totalEt0Mm: null,
      dryDaysCount: null,
      heavyRainDaysCount: null,
      roleNote: 'unavailable',
    },
    window: '72h',
  });

  const potato = resolveCropProfile('potato')!;
  const stage = resolveGrowthStage({ profile: potato.profile, varietyId: null });
  const dCtx = {
    districtName: 'Bogura',
    elevationM: 20,
    soilType: 'Silty Loam',
    riverBasin: 'Karatoya',
    climateArchetype: 'barind-floodplain',
  };

  const evals = [
    evaluateHeatRisk(features, stage),
    evaluateRainfallRisk(features, stage, dCtx),
    evaluateDroughtRisk(features, stage, dCtx),
    evaluateDiseaseWeatherRisk(features, stage),
    evaluateWindRisk(features, stage),
  ];

  for (const ev of evals) {
    assert.equal(ev.score, null, `${ev.dimensionId} should return null on missing data`);
    assert.equal(ev.severity, 'Unavailable');
  }
}

function testCatalogInvariants() {
  const crops = Object.values(CROP_RISK_CATALOG);
  assert.equal(crops.length, 8);
  for (const crop of crops) {
    const unspecSum = Object.values(crop.unspecifiedStageWeights).reduce(
      (a, b) => a + b,
      0
    );
    assert.ok(
      Math.abs(unspecSum - 1) < 1e-6,
      `${crop.id} unspecifiedStageWeights sum = ${unspecSum}`
    );
    for (const st of crop.growthStages) {
      const sum = Object.values(st.weights).reduce((a, b) => a + b, 0);
      assert.ok(
        Math.abs(sum - 1) < 1e-6,
        `${crop.id}.${st.id} weights sum = ${sum}`
      );
    }
  }
}

testRiskAggregation();
testConfidenceCalculation();
testGrowthStageResolution();
testMissingWeatherNullHandling();
testCatalogInvariants();
console.log('ALL_RISK_ENGINE_UNIT_TESTS_PASSED');
