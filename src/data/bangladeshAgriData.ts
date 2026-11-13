import {
  CropDistrictRiskAssessment,
  CropId,
  CropProfile,
  DistrictId,
  DistrictProfile,
  EarlyWarningAlert,
  ExtremeWeatherIndicator,
  FarmingActivityItem,
  LiveWeatherForecastPayload,
  RiskDimensionDetail,
  RiskSeverity,
  TrackedCropPlot,
} from '../types/agri';
import {
  BANGLADESH_DISTRICTS,
  BangladeshDistrictMeta,
} from './bangladeshLocations';

type ArchetypeKey = BangladeshDistrictMeta['climateArchetype'];

const ARCHETYPE_TEMPLATES: Record<
  ArchetypeKey,
  Omit<
    DistrictProfile,
    'id' | 'name' | 'division' | 'latitude' | 'longitude' | 'agroZone' | 'riverBasin' | 'elevationM' | 'soilType'
  >
> = {
  'barind-floodplain': {
    currentWeather: {
      condition: 'Humid & Partly Cloudy',
      tempC: 31,
      feelsLikeC: 35,
      humidityPct: 79,
      rainfall24hMm: 18.4,
      windKmh: 14,
      windDir: 'SE',
      uvIndex: 7,
      soilMoisturePct: 68,
      updatedLabel: 'Static baseline profile (not live)',
    },
    overallRiskScore: 54,
    overallRiskSeverity: 'Medium',
    extremeIndicators: [
      {
        id: 'bog-rain',
        label: '72h Heavy Rain Probability',
        value: '62%',
        status: 'Medium',
        thresholdNote: 'Monsoon trough approaching northern basin (>45 mm/24h threshold)',
      },
      {
        id: 'bog-heat',
        label: 'Daytime Heat Stress Index',
        value: '35°C',
        status: 'Medium',
        thresholdNote: 'Moderately elevated afternoon canopy heat between 12:00–15:30',
      },
      {
        id: 'bog-river',
        label: 'Karatoya Drainage Surge',
        value: '+0.42 m',
        status: 'Low',
        thresholdNote: '1.35 m below local danger mark; low-lying beels draining steadily',
      },
      {
        id: 'bog-dry',
        label: 'Consecutive Dry Days',
        value: '2 days',
        status: 'Low',
        thresholdNote: 'Root-zone moisture adequate for standing Aman and vegetable plots',
      },
    ],
    forecast14Days: [
      { day: 'Thu', dateLabel: 'Nov 13', condition: 'Partly Cloudy', tempMaxC: 31, tempMinC: 23, rainfallMm: 6, humidityPct: 78, windKmh: 14, rainProbPct: 40 },
      { day: 'Fri', dateLabel: 'Nov 14', condition: 'Showers', tempMaxC: 30, tempMinC: 23, rainfallMm: 24, humidityPct: 84, windKmh: 18, rainProbPct: 70 },
      { day: 'Sat', dateLabel: 'Nov 15', condition: 'Heavy Rain', tempMaxC: 28, tempMinC: 22, rainfallMm: 52, humidityPct: 89, windKmh: 22, rainProbPct: 85 },
      { day: 'Sun', dateLabel: 'Nov 16', condition: 'Showers', tempMaxC: 29, tempMinC: 22, rainfallMm: 28, humidityPct: 85, windKmh: 16, rainProbPct: 65 },
      { day: 'Mon', dateLabel: 'Nov 17', condition: 'Partly Cloudy', tempMaxC: 31, tempMinC: 21, rainfallMm: 4, humidityPct: 74, windKmh: 11, rainProbPct: 25 },
      { day: 'Tue', dateLabel: 'Nov 18', condition: 'Clear', tempMaxC: 32, tempMinC: 20, rainfallMm: 0, humidityPct: 68, windKmh: 9, rainProbPct: 10 },
      { day: 'Wed', dateLabel: 'Nov 19', condition: 'Clear', tempMaxC: 32, tempMinC: 20, rainfallMm: 0, humidityPct: 66, windKmh: 10, rainProbPct: 10 },
      { day: 'Thu', dateLabel: 'Nov 20', condition: 'Partly Cloudy', tempMaxC: 31, tempMinC: 19, rainfallMm: 2, humidityPct: 69, windKmh: 12, rainProbPct: 20 },
      { day: 'Fri', dateLabel: 'Nov 21', condition: 'Clear', tempMaxC: 30, tempMinC: 18, rainfallMm: 0, humidityPct: 65, windKmh: 10, rainProbPct: 10 },
      { day: 'Sat', dateLabel: 'Nov 22', condition: 'Clear', tempMaxC: 29, tempMinC: 18, rainfallMm: 0, humidityPct: 63, windKmh: 9, rainProbPct: 5 },
      { day: 'Sun', dateLabel: 'Nov 23', condition: 'Partly Cloudy', tempMaxC: 29, tempMinC: 18, rainfallMm: 3, humidityPct: 67, windKmh: 11, rainProbPct: 20 },
      { day: 'Mon', dateLabel: 'Nov 24', condition: 'Showers', tempMaxC: 28, tempMinC: 19, rainfallMm: 14, humidityPct: 76, windKmh: 14, rainProbPct: 50 },
      { day: 'Tue', dateLabel: 'Nov 25', condition: 'Partly Cloudy', tempMaxC: 29, tempMinC: 18, rainfallMm: 2, humidityPct: 70, windKmh: 10, rainProbPct: 15 },
      { day: 'Wed', dateLabel: 'Nov 26', condition: 'Clear', tempMaxC: 29, tempMinC: 17, rainfallMm: 0, humidityPct: 64, windKmh: 8, rainProbPct: 5 },
    ],
  },
  'haor-monsoon': {
    currentWeather: {
      condition: 'Active Monsoon Showers',
      tempC: 28,
      feelsLikeC: 32,
      humidityPct: 91,
      rainfall24hMm: 76.5,
      windKmh: 21,
      windDir: 'S',
      uvIndex: 4,
      soilMoisturePct: 92,
      updatedLabel: 'Static baseline profile (not live)',
    },
    overallRiskScore: 78,
    overallRiskSeverity: 'High',
    extremeIndicators: [
      {
        id: 'syl-rain',
        label: '72h Heavy Rain Probability',
        value: '88%',
        status: 'High',
        thresholdNote: 'Upstream Meghalaya & local rainfall exceeding 65 mm/24h alert threshold',
      },
      {
        id: 'syl-river',
        label: 'Haor Basin Flash-Flood Surge',
        value: '+1.28 m',
        status: 'High',
        thresholdNote: 'Approaching warning mark in low haor pockets within 36 hours',
      },
      {
        id: 'syl-heat',
        label: 'Daytime Heat Stress Index',
        value: '32°C',
        status: 'Low',
        thresholdNote: 'Cloud cover keeping daytime canopy temperatures moderate',
      },
      {
        id: 'syl-humidity',
        label: 'Fungal Leaf-Wetness Duration',
        value: '16 hrs/day',
        status: 'High',
        thresholdNote: 'Sustained >85% RH elevates rice blast & sheath blight pressure',
      },
    ],
    forecast14Days: [
      { day: 'Thu', dateLabel: 'Nov 13', condition: 'Heavy Rain', tempMaxC: 28, tempMinC: 22, rainfallMm: 74, humidityPct: 92, windKmh: 21, rainProbPct: 90 },
      { day: 'Fri', dateLabel: 'Nov 14', condition: 'Thunderstorm', tempMaxC: 27, tempMinC: 22, rainfallMm: 92, humidityPct: 94, windKmh: 26, rainProbPct: 95 },
      { day: 'Sat', dateLabel: 'Nov 15', condition: 'Heavy Rain', tempMaxC: 28, tempMinC: 21, rainfallMm: 61, humidityPct: 90, windKmh: 19, rainProbPct: 85 },
      { day: 'Sun', dateLabel: 'Nov 16', condition: 'Showers', tempMaxC: 29, tempMinC: 21, rainfallMm: 32, humidityPct: 86, windKmh: 15, rainProbPct: 70 },
      { day: 'Mon', dateLabel: 'Nov 17', condition: 'Showers', tempMaxC: 29, tempMinC: 21, rainfallMm: 18, humidityPct: 82, windKmh: 12, rainProbPct: 55 },
      { day: 'Tue', dateLabel: 'Nov 18', condition: 'Partly Cloudy', tempMaxC: 30, tempMinC: 20, rainfallMm: 6, humidityPct: 77, windKmh: 10, rainProbPct: 30 },
      { day: 'Wed', dateLabel: 'Nov 19', condition: 'Partly Cloudy', tempMaxC: 30, tempMinC: 20, rainfallMm: 4, humidityPct: 75, windKmh: 9, rainProbPct: 25 },
      { day: 'Thu', dateLabel: 'Nov 20', condition: 'Clear', tempMaxC: 31, tempMinC: 19, rainfallMm: 0, humidityPct: 71, windKmh: 8, rainProbPct: 15 },
      { day: 'Fri', dateLabel: 'Nov 21', condition: 'Partly Cloudy', tempMaxC: 30, tempMinC: 19, rainfallMm: 5, humidityPct: 74, windKmh: 11, rainProbPct: 25 },
      { day: 'Sat', dateLabel: 'Nov 22', condition: 'Showers', tempMaxC: 29, tempMinC: 19, rainfallMm: 16, humidityPct: 80, windKmh: 13, rainProbPct: 50 },
      { day: 'Sun', dateLabel: 'Nov 23', condition: 'Partly Cloudy', tempMaxC: 29, tempMinC: 18, rainfallMm: 4, humidityPct: 75, windKmh: 10, rainProbPct: 20 },
      { day: 'Mon', dateLabel: 'Nov 24', condition: 'Clear', tempMaxC: 30, tempMinC: 18, rainfallMm: 0, humidityPct: 70, windKmh: 9, rainProbPct: 10 },
      { day: 'Tue', dateLabel: 'Nov 25', condition: 'Clear', tempMaxC: 30, tempMinC: 17, rainfallMm: 0, humidityPct: 68, windKmh: 8, rainProbPct: 10 },
      { day: 'Wed', dateLabel: 'Nov 26', condition: 'Clear', tempMaxC: 29, tempMinC: 17, rainfallMm: 0, humidityPct: 67, windKmh: 8, rainProbPct: 10 },
    ],
  },
  'coastal-tidal': {
    currentWeather: {
      condition: 'Warm & Coastal Breeze',
      tempC: 33,
      feelsLikeC: 39,
      humidityPct: 82,
      rainfall24hMm: 8.2,
      windKmh: 24,
      windDir: 'SSE',
      uvIndex: 8,
      soilMoisturePct: 59,
      updatedLabel: 'Static baseline profile (not live)',
    },
    overallRiskScore: 66,
    overallRiskSeverity: 'Medium',
    extremeIndicators: [
      {
        id: 'khl-heat',
        label: 'Apparent Heat Stress Index',
        value: '39°C',
        status: 'High',
        thresholdNote: 'High humidity + 33°C air temperature increases spikelet sterility risk',
      },
      {
        id: 'khl-tidal',
        label: 'Spring Tide Salinity Intrusion',
        value: '4.1 dS/m',
        status: 'Medium',
        thresholdNote: 'Moderate brackish water intrusion near polder sluice gates',
      },
      {
        id: 'khl-wind',
        label: 'Coastal Squall Gust Peak',
        value: '38 km/h',
        status: 'Medium',
        thresholdNote: 'Monitor tall flowering paddy and trellis vegetables for lodging',
      },
      {
        id: 'khl-rain',
        label: '72h Heavy Rain Probability',
        value: '45%',
        status: 'Low',
        thresholdNote: 'Isolated coastal convection; low basin-wide flood accumulation',
      },
    ],
    forecast14Days: [
      { day: 'Thu', dateLabel: 'Nov 13', condition: 'Heat Haze', tempMaxC: 33, tempMinC: 25, rainfallMm: 4, humidityPct: 82, windKmh: 24, rainProbPct: 30 },
      { day: 'Fri', dateLabel: 'Nov 14', condition: 'Partly Cloudy', tempMaxC: 34, tempMinC: 25, rainfallMm: 8, humidityPct: 80, windKmh: 22, rainProbPct: 35 },
      { day: 'Sat', dateLabel: 'Nov 15', condition: 'Showers', tempMaxC: 32, tempMinC: 24, rainfallMm: 22, humidityPct: 85, windKmh: 27, rainProbPct: 60 },
      { day: 'Sun', dateLabel: 'Nov 16', condition: 'Showers', tempMaxC: 31, tempMinC: 24, rainfallMm: 19, humidityPct: 83, windKmh: 20, rainProbPct: 55 },
      { day: 'Mon', dateLabel: 'Nov 17', condition: 'Partly Cloudy', tempMaxC: 32, tempMinC: 23, rainfallMm: 3, humidityPct: 76, windKmh: 16, rainProbPct: 20 },
      { day: 'Tue', dateLabel: 'Nov 18', condition: 'Clear', tempMaxC: 33, tempMinC: 22, rainfallMm: 0, humidityPct: 71, windKmh: 14, rainProbPct: 10 },
      { day: 'Wed', dateLabel: 'Nov 19', condition: 'Clear', tempMaxC: 33, tempMinC: 22, rainfallMm: 0, humidityPct: 70, windKmh: 13, rainProbPct: 10 },
      { day: 'Thu', dateLabel: 'Nov 20', condition: 'Partly Cloudy', tempMaxC: 32, tempMinC: 21, rainfallMm: 2, humidityPct: 73, windKmh: 15, rainProbPct: 20 },
      { day: 'Fri', dateLabel: 'Nov 21', condition: 'Clear', tempMaxC: 32, tempMinC: 21, rainfallMm: 0, humidityPct: 69, windKmh: 12, rainProbPct: 10 },
      { day: 'Sat', dateLabel: 'Nov 22', condition: 'Clear', tempMaxC: 31, tempMinC: 20, rainfallMm: 0, humidityPct: 67, windKmh: 11, rainProbPct: 5 },
      { day: 'Sun', dateLabel: 'Nov 23', condition: 'Partly Cloudy', tempMaxC: 31, tempMinC: 20, rainfallMm: 5, humidityPct: 72, windKmh: 14, rainProbPct: 25 },
      { day: 'Mon', dateLabel: 'Nov 24', condition: 'Showers', tempMaxC: 30, tempMinC: 21, rainfallMm: 12, humidityPct: 78, windKmh: 18, rainProbPct: 45 },
      { day: 'Tue', dateLabel: 'Nov 25', condition: 'Partly Cloudy', tempMaxC: 31, tempMinC: 20, rainfallMm: 0, humidityPct: 71, windKmh: 13, rainProbPct: 10 },
      { day: 'Wed', dateLabel: 'Nov 26', condition: 'Clear', tempMaxC: 31, tempMinC: 19, rainfallMm: 0, humidityPct: 66, windKmh: 11, rainProbPct: 5 },
    ],
  },
  'teesta-northern': {
    currentWeather: {
      condition: 'Dry & Mildly Hazy',
      tempC: 30,
      feelsLikeC: 31,
      humidityPct: 61,
      rainfall24hMm: 1.2,
      windKmh: 11,
      windDir: 'NW',
      uvIndex: 7,
      soilMoisturePct: 41,
      updatedLabel: 'Static baseline profile (not live)',
    },
    overallRiskScore: 48,
    overallRiskSeverity: 'Medium',
    extremeIndicators: [
      {
        id: 'rng-dry',
        label: 'Topsoil Moisture Deficit',
        value: '-19%',
        status: 'Medium',
        thresholdNote: 'Sandy loam plots losing moisture rapidly; winter potato & maize need supplemental irrigation',
      },
      {
        id: 'rng-spell',
        label: 'Consecutive Dry Days',
        value: '9 days',
        status: 'Medium',
        thresholdNote: 'Extended dry stretch increases drought stress on non-irrigated highlands',
      },
      {
        id: 'rng-fog',
        label: 'Early Morning Dew / Mist',
        value: '5.5 hrs',
        status: 'Low',
        thresholdNote: 'Cooler nights (18°C) beginning; watch early potato foliage for blight',
      },
      {
        id: 'rng-flood',
        label: 'Teesta River Level Anomaly',
        value: '-0.85 m',
        status: 'Low',
        thresholdNote: 'Well below seasonal normal; zero flash flood threat this week',
      },
    ],
    forecast14Days: [
      { day: 'Thu', dateLabel: 'Nov 13', condition: 'Clear', tempMaxC: 30, tempMinC: 19, rainfallMm: 0, humidityPct: 60, windKmh: 11, rainProbPct: 5 },
      { day: 'Fri', dateLabel: 'Nov 14', condition: 'Clear', tempMaxC: 31, tempMinC: 18, rainfallMm: 0, humidityPct: 58, windKmh: 10, rainProbPct: 5 },
      { day: 'Sat', dateLabel: 'Nov 15', condition: 'Partly Cloudy', tempMaxC: 30, tempMinC: 19, rainfallMm: 3, humidityPct: 64, windKmh: 12, rainProbPct: 20 },
      { day: 'Sun', dateLabel: 'Nov 16', condition: 'Clear', tempMaxC: 30, tempMinC: 18, rainfallMm: 0, humidityPct: 59, windKmh: 9, rainProbPct: 10 },
      { day: 'Mon', dateLabel: 'Nov 17', condition: 'Clear', tempMaxC: 29, tempMinC: 17, rainfallMm: 0, humidityPct: 57, windKmh: 8, rainProbPct: 5 },
      { day: 'Tue', dateLabel: 'Nov 18', condition: 'Clear', tempMaxC: 29, tempMinC: 16, rainfallMm: 0, humidityPct: 56, windKmh: 8, rainProbPct: 5 },
      { day: 'Wed', dateLabel: 'Nov 19', condition: 'Clear', tempMaxC: 28, tempMinC: 16, rainfallMm: 0, humidityPct: 55, windKmh: 9, rainProbPct: 5 },
      { day: 'Thu', dateLabel: 'Nov 20', condition: 'Partly Cloudy', tempMaxC: 28, tempMinC: 16, rainfallMm: 2, humidityPct: 62, windKmh: 11, rainProbPct: 15 },
      { day: 'Fri', dateLabel: 'Nov 21', condition: 'Clear', tempMaxC: 28, tempMinC: 15, rainfallMm: 0, humidityPct: 58, windKmh: 9, rainProbPct: 5 },
      { day: 'Sat', dateLabel: 'Nov 22', condition: 'Clear', tempMaxC: 27, tempMinC: 15, rainfallMm: 0, humidityPct: 57, windKmh: 8, rainProbPct: 5 },
      { day: 'Sun', dateLabel: 'Nov 23', condition: 'Clear', tempMaxC: 27, tempMinC: 14, rainfallMm: 0, humidityPct: 56, windKmh: 8, rainProbPct: 5 },
      { day: 'Mon', dateLabel: 'Nov 24', condition: 'Partly Cloudy', tempMaxC: 27, tempMinC: 15, rainfallMm: 4, humidityPct: 63, windKmh: 10, rainProbPct: 20 },
      { day: 'Tue', dateLabel: 'Nov 25', condition: 'Clear', tempMaxC: 26, tempMinC: 14, rainfallMm: 0, humidityPct: 58, windKmh: 8, rainProbPct: 5 },
      { day: 'Wed', dateLabel: 'Nov 26', condition: 'Clear', tempMaxC: 26, tempMinC: 14, rainfallMm: 0, humidityPct: 56, windKmh: 7, rainProbPct: 5 },
    ],
  },
  'delta-tidal': {
    currentWeather: {
      condition: 'Overcast & Breezy',
      tempC: 30,
      feelsLikeC: 35,
      humidityPct: 87,
      rainfall24hMm: 34.0,
      windKmh: 23,
      windDir: 'SE',
      uvIndex: 5,
      soilMoisturePct: 85,
      updatedLabel: 'Static baseline profile (not live)',
    },
    overallRiskScore: 71,
    overallRiskSeverity: 'High',
    extremeIndicators: [
      {
        id: 'bar-tide',
        label: 'Tidal Waterlogging Risk',
        value: 'High Tide +0.6 m',
        status: 'High',
        thresholdNote: 'Slow field drainage during full-moon tidal peaks may submerge low Aman plots',
      },
      {
        id: 'bar-rain',
        label: '72h Heavy Rain Probability',
        value: '74%',
        status: 'High',
        thresholdNote: 'Southern trough bringing 40–65 mm cumulative rain across delta canals',
      },
      {
        id: 'bar-wind',
        label: 'Surface Wind Gusts',
        value: '35 km/h',
        status: 'Medium',
        thresholdNote: 'Moderate lodging risk for tall traditional Aman cultivars',
      },
      {
        id: 'bar-heat',
        label: 'Daytime Heat Stress Index',
        value: '34°C',
        status: 'Low',
        thresholdNote: 'Below critical 37°C heat stress threshold',
      },
    ],
    forecast14Days: [
      { day: 'Thu', dateLabel: 'Nov 13', condition: 'Showers', tempMaxC: 30, tempMinC: 24, rainfallMm: 34, humidityPct: 87, windKmh: 23, rainProbPct: 75 },
      { day: 'Fri', dateLabel: 'Nov 14', condition: 'Heavy Rain', tempMaxC: 29, tempMinC: 23, rainfallMm: 56, humidityPct: 91, windKmh: 26, rainProbPct: 85 },
      { day: 'Sat', dateLabel: 'Nov 15', condition: 'Showers', tempMaxC: 29, tempMinC: 23, rainfallMm: 29, humidityPct: 88, windKmh: 21, rainProbPct: 70 },
      { day: 'Sun', dateLabel: 'Nov 16', condition: 'Partly Cloudy', tempMaxC: 30, tempMinC: 23, rainfallMm: 10, humidityPct: 81, windKmh: 16, rainProbPct: 40 },
      { day: 'Mon', dateLabel: 'Nov 17', condition: 'Partly Cloudy', tempMaxC: 31, tempMinC: 22, rainfallMm: 4, humidityPct: 76, windKmh: 13, rainProbPct: 25 },
      { day: 'Tue', dateLabel: 'Nov 18', condition: 'Clear', tempMaxC: 31, tempMinC: 22, rainfallMm: 0, humidityPct: 72, windKmh: 11, rainProbPct: 10 },
      { day: 'Wed', dateLabel: 'Nov 19', condition: 'Clear', tempMaxC: 31, tempMinC: 21, rainfallMm: 0, humidityPct: 70, windKmh: 10, rainProbPct: 10 },
      { day: 'Thu', dateLabel: 'Nov 20', condition: 'Partly Cloudy', tempMaxC: 30, tempMinC: 21, rainfallMm: 5, humidityPct: 74, windKmh: 14, rainProbPct: 30 },
      { day: 'Fri', dateLabel: 'Nov 21', condition: 'Clear', tempMaxC: 30, tempMinC: 20, rainfallMm: 0, humidityPct: 70, windKmh: 11, rainProbPct: 10 },
      { day: 'Sat', dateLabel: 'Nov 22', condition: 'Clear', tempMaxC: 30, tempMinC: 20, rainfallMm: 0, humidityPct: 68, windKmh: 10, rainProbPct: 10 },
      { day: 'Sun', dateLabel: 'Nov 23', condition: 'Partly Cloudy', tempMaxC: 29, tempMinC: 20, rainfallMm: 6, humidityPct: 74, windKmh: 13, rainProbPct: 30 },
      { day: 'Mon', dateLabel: 'Nov 24', condition: 'Showers', tempMaxC: 29, tempMinC: 21, rainfallMm: 15, humidityPct: 80, windKmh: 16, rainProbPct: 50 },
      { day: 'Tue', dateLabel: 'Nov 25', condition: 'Partly Cloudy', tempMaxC: 30, tempMinC: 20, rainfallMm: 2, humidityPct: 72, windKmh: 12, rainProbPct: 15 },
      { day: 'Wed', dateLabel: 'Nov 26', condition: 'Clear', tempMaxC: 30, tempMinC: 19, rainfallMm: 0, humidityPct: 68, windKmh: 10, rainProbPct: 10 },
    ],
  },
  'piedmont-dry': {
    currentWeather: {
      condition: 'Clear & Sunny',
      tempC: 29,
      feelsLikeC: 30,
      humidityPct: 58,
      rainfall24hMm: 0.0,
      windKmh: 9,
      windDir: 'N',
      uvIndex: 7,
      soilMoisturePct: 38,
      updatedLabel: 'Static baseline profile (not live)',
    },
    overallRiskScore: 34,
    overallRiskSeverity: 'Low',
    extremeIndicators: [
      {
        id: 'din-dry',
        label: 'Dry Spell Duration',
        value: '11 days',
        status: 'Medium',
        thresholdNote: 'Light supplemental irrigation advised for emerging Wheat & Potato ridges',
      },
      {
        id: 'din-rain',
        label: '72h Heavy Rain Probability',
        value: '12%',
        status: 'Low',
        thresholdNote: 'Favorable dry harvesting window for mature Aromatic Aman rice',
      },
      {
        id: 'din-heat',
        label: 'Daytime Heat Stress Index',
        value: '30°C',
        status: 'Low',
        thresholdNote: 'Optimal daytime photosynthesis and cool night respiration',
      },
      {
        id: 'din-disease',
        label: 'Fungal Blight Index',
        value: 'Low (22/100)',
        status: 'Low',
        thresholdNote: 'Low relative humidity suppresses spore germination',
      },
    ],
    forecast14Days: [
      { day: 'Thu', dateLabel: 'Nov 13', condition: 'Clear', tempMaxC: 29, tempMinC: 17, rainfallMm: 0, humidityPct: 58, windKmh: 9, rainProbPct: 5 },
      { day: 'Fri', dateLabel: 'Nov 14', condition: 'Clear', tempMaxC: 29, tempMinC: 17, rainfallMm: 0, humidityPct: 56, windKmh: 8, rainProbPct: 5 },
      { day: 'Sat', dateLabel: 'Nov 15', condition: 'Clear', tempMaxC: 28, tempMinC: 16, rainfallMm: 0, humidityPct: 57, windKmh: 9, rainProbPct: 10 },
      { day: 'Sun', dateLabel: 'Nov 16', condition: 'Partly Cloudy', tempMaxC: 28, tempMinC: 16, rainfallMm: 2, humidityPct: 61, windKmh: 10, rainProbPct: 15 },
      { day: 'Mon', dateLabel: 'Nov 17', condition: 'Clear', tempMaxC: 28, tempMinC: 15, rainfallMm: 0, humidityPct: 55, windKmh: 8, rainProbPct: 5 },
      { day: 'Tue', dateLabel: 'Nov 18', condition: 'Clear', tempMaxC: 27, tempMinC: 15, rainfallMm: 0, humidityPct: 54, windKmh: 8, rainProbPct: 5 },
      { day: 'Wed', dateLabel: 'Nov 19', condition: 'Clear', tempMaxC: 27, tempMinC: 14, rainfallMm: 0, humidityPct: 55, windKmh: 7, rainProbPct: 5 },
      { day: 'Thu', dateLabel: 'Nov 20', condition: 'Clear', tempMaxC: 27, tempMinC: 14, rainfallMm: 0, humidityPct: 56, windKmh: 8, rainProbPct: 5 },
      { day: 'Fri', dateLabel: 'Nov 21', condition: 'Partly Cloudy', tempMaxC: 26, tempMinC: 14, rainfallMm: 3, humidityPct: 62, windKmh: 10, rainProbPct: 20 },
      { day: 'Sat', dateLabel: 'Nov 22', condition: 'Clear', tempMaxC: 26, tempMinC: 13, rainfallMm: 0, humidityPct: 57, windKmh: 8, rainProbPct: 5 },
      { day: 'Sun', dateLabel: 'Nov 23', condition: 'Clear', tempMaxC: 26, tempMinC: 13, rainfallMm: 0, humidityPct: 55, windKmh: 7, rainProbPct: 5 },
      { day: 'Mon', dateLabel: 'Nov 24', condition: 'Clear', tempMaxC: 25, tempMinC: 13, rainfallMm: 0, humidityPct: 54, windKmh: 8, rainProbPct: 5 },
      { day: 'Tue', dateLabel: 'Nov 25', condition: 'Clear', tempMaxC: 25, tempMinC: 12, rainfallMm: 0, humidityPct: 56, windKmh: 7, rainProbPct: 5 },
      { day: 'Wed', dateLabel: 'Nov 26', condition: 'Clear', tempMaxC: 25, tempMinC: 12, rainfallMm: 0, humidityPct: 54, windKmh: 7, rainProbPct: 5 },
    ],
  },
  'meghna-basin': {
    currentWeather: {
      condition: 'Scattered Clouds',
      tempC: 31,
      feelsLikeC: 36,
      humidityPct: 81,
      rainfall24hMm: 14.5,
      windKmh: 15,
      windDir: 'S',
      uvIndex: 6,
      soilMoisturePct: 71,
      updatedLabel: 'Static baseline profile (not live)',
    },
    overallRiskScore: 51,
    overallRiskSeverity: 'Medium',
    extremeIndicators: [
      {
        id: 'cum-rain',
        label: '72h Heavy Rain Probability',
        value: '58%',
        status: 'Medium',
        thresholdNote: 'Moderate passing showers expected along embankment corridor',
      },
      {
        id: 'cum-disease',
        label: 'Stem Borer & Blight Watch',
        value: 'Elevated',
        status: 'Medium',
        thresholdNote: 'Warm nights (23°C) + 81% humidity favor late-season BPH and sheath blight',
      },
      {
        id: 'cum-heat',
        label: 'Daytime Heat Stress Index',
        value: '36°C',
        status: 'Medium',
        thresholdNote: 'Peak afternoon warmth around 14:00 requires evening irrigation timing',
      },
      {
        id: 'cum-flood',
        label: 'River Basin Level',
        value: '+0.28 m',
        status: 'Low',
        thresholdNote: 'Within normal seasonal embankment safety buffer',
      },
    ],
    forecast14Days: [
      { day: 'Thu', dateLabel: 'Nov 13', condition: 'Partly Cloudy', tempMaxC: 31, tempMinC: 23, rainfallMm: 12, humidityPct: 81, windKmh: 15, rainProbPct: 45 },
      { day: 'Fri', dateLabel: 'Nov 14', condition: 'Showers', tempMaxC: 30, tempMinC: 23, rainfallMm: 27, humidityPct: 85, windKmh: 17, rainProbPct: 65 },
      { day: 'Sat', dateLabel: 'Nov 15', condition: 'Showers', tempMaxC: 30, tempMinC: 22, rainfallMm: 19, humidityPct: 83, windKmh: 15, rainProbPct: 55 },
      { day: 'Sun', dateLabel: 'Nov 16', condition: 'Partly Cloudy', tempMaxC: 31, tempMinC: 22, rainfallMm: 4, humidityPct: 76, windKmh: 12, rainProbPct: 25 },
      { day: 'Mon', dateLabel: 'Nov 17', condition: 'Clear', tempMaxC: 31, tempMinC: 21, rainfallMm: 0, humidityPct: 71, windKmh: 10, rainProbPct: 10 },
      { day: 'Tue', dateLabel: 'Nov 18', condition: 'Clear', tempMaxC: 31, tempMinC: 20, rainfallMm: 0, humidityPct: 68, windKmh: 9, rainProbPct: 10 },
      { day: 'Wed', dateLabel: 'Nov 19', condition: 'Clear', tempMaxC: 31, tempMinC: 20, rainfallMm: 0, humidityPct: 67, windKmh: 10, rainProbPct: 10 },
      { day: 'Thu', dateLabel: 'Nov 20', condition: 'Partly Cloudy', tempMaxC: 30, tempMinC: 20, rainfallMm: 5, humidityPct: 73, windKmh: 12, rainProbPct: 25 },
      { day: 'Fri', dateLabel: 'Nov 21', condition: 'Clear', tempMaxC: 30, tempMinC: 19, rainfallMm: 0, humidityPct: 69, windKmh: 10, rainProbPct: 10 },
      { day: 'Sat', dateLabel: 'Nov 22', condition: 'Clear', tempMaxC: 29, tempMinC: 19, rainfallMm: 0, humidityPct: 66, windKmh: 9, rainProbPct: 5 },
      { day: 'Sun', dateLabel: 'Nov 23', condition: 'Partly Cloudy', tempMaxC: 29, tempMinC: 19, rainfallMm: 4, humidityPct: 71, windKmh: 11, rainProbPct: 20 },
      { day: 'Mon', dateLabel: 'Nov 24', condition: 'Showers', tempMaxC: 28, tempMinC: 19, rainfallMm: 11, humidityPct: 77, windKmh: 13, rainProbPct: 45 },
      { day: 'Tue', dateLabel: 'Nov 25', condition: 'Partly Cloudy', tempMaxC: 29, tempMinC: 18, rainfallMm: 0, humidityPct: 70, windKmh: 10, rainProbPct: 10 },
      { day: 'Wed', dateLabel: 'Nov 26', condition: 'Clear', tempMaxC: 29, tempMinC: 18, rainfallMm: 0, humidityPct: 66, windKmh: 9, rainProbPct: 5 },
    ],
  },
  'brahmaputra-central': {
    currentWeather: {
      condition: 'Light Passing Showers',
      tempC: 29,
      feelsLikeC: 33,
      humidityPct: 84,
      rainfall24hMm: 22.8,
      windKmh: 13,
      windDir: 'SE',
      uvIndex: 5,
      soilMoisturePct: 75,
      updatedLabel: 'Static baseline profile (not live)',
    },
    overallRiskScore: 46,
    overallRiskSeverity: 'Medium',
    extremeIndicators: [
      {
        id: 'mym-rain',
        label: '72h Heavy Rain Probability',
        value: '64%',
        status: 'Medium',
        thresholdNote: 'Moderate showers along sub-basin; monitor low char land drainage',
      },
      {
        id: 'mym-disease',
        label: 'Canopy Disease Pressure',
        value: 'Moderate (58/100)',
        status: 'Medium',
        thresholdNote: 'High morning dew + 84% humidity favors bacterial leaf blight in dense rice',
      },
      {
        id: 'mym-heat',
        label: 'Daytime Heat Stress Index',
        value: '33°C',
        status: 'Low',
        thresholdNote: 'Comfortable thermal range for grain filling',
      },
      {
        id: 'mym-dry',
        label: 'Soil Moisture Reserve',
        value: '75%',
        status: 'Low',
        thresholdNote: 'Optimal saturation; irrigation pumps can remain paused',
      },
    ],
    forecast14Days: [
      { day: 'Thu', dateLabel: 'Nov 13', condition: 'Showers', tempMaxC: 29, tempMinC: 22, rainfallMm: 23, humidityPct: 84, windKmh: 13, rainProbPct: 65 },
      { day: 'Fri', dateLabel: 'Nov 14', condition: 'Heavy Rain', tempMaxC: 28, tempMinC: 22, rainfallMm: 44, humidityPct: 88, windKmh: 17, rainProbPct: 80 },
      { day: 'Sat', dateLabel: 'Nov 15', condition: 'Showers', tempMaxC: 29, tempMinC: 21, rainfallMm: 18, humidityPct: 84, windKmh: 14, rainProbPct: 60 },
      { day: 'Sun', dateLabel: 'Nov 16', condition: 'Partly Cloudy', tempMaxC: 30, tempMinC: 21, rainfallMm: 5, humidityPct: 78, windKmh: 11, rainProbPct: 30 },
      { day: 'Mon', dateLabel: 'Nov 17', condition: 'Clear', tempMaxC: 30, tempMinC: 20, rainfallMm: 0, humidityPct: 72, windKmh: 9, rainProbPct: 10 },
      { day: 'Tue', dateLabel: 'Nov 18', condition: 'Clear', tempMaxC: 30, tempMinC: 19, rainfallMm: 0, humidityPct: 69, windKmh: 8, rainProbPct: 10 },
      { day: 'Wed', dateLabel: 'Nov 19', condition: 'Partly Cloudy', tempMaxC: 29, tempMinC: 19, rainfallMm: 2, humidityPct: 71, windKmh: 10, rainProbPct: 20 },
      { day: 'Thu', dateLabel: 'Nov 20', condition: 'Clear', tempMaxC: 29, tempMinC: 18, rainfallMm: 0, humidityPct: 67, windKmh: 9, rainProbPct: 10 },
      { day: 'Fri', dateLabel: 'Nov 21', condition: 'Clear', tempMaxC: 29, tempMinC: 18, rainfallMm: 0, humidityPct: 65, windKmh: 8, rainProbPct: 5 },
      { day: 'Sat', dateLabel: 'Nov 22', condition: 'Clear', tempMaxC: 28, tempMinC: 17, rainfallMm: 0, humidityPct: 64, windKmh: 8, rainProbPct: 5 },
      { day: 'Sun', dateLabel: 'Nov 23', condition: 'Partly Cloudy', tempMaxC: 28, tempMinC: 17, rainfallMm: 4, humidityPct: 70, windKmh: 10, rainProbPct: 20 },
      { day: 'Mon', dateLabel: 'Nov 24', condition: 'Showers', tempMaxC: 28, tempMinC: 18, rainfallMm: 10, humidityPct: 76, windKmh: 12, rainProbPct: 40 },
      { day: 'Tue', dateLabel: 'Nov 25', condition: 'Clear', tempMaxC: 28, tempMinC: 17, rainfallMm: 0, humidityPct: 68, windKmh: 9, rainProbPct: 10 },
      { day: 'Wed', dateLabel: 'Nov 26', condition: 'Clear', tempMaxC: 28, tempMinC: 16, rainfallMm: 0, humidityPct: 65, windKmh: 8, rainProbPct: 5 },
    ],
  },
  'chittagong-hill': {
    currentWeather: {
      condition: 'Humid Hill Showers',
      tempC: 29,
      feelsLikeC: 33,
      humidityPct: 86,
      rainfall24hMm: 38.4,
      windKmh: 16,
      windDir: 'SE',
      uvIndex: 5,
      soilMoisturePct: 77,
      updatedLabel: 'Static baseline profile (not live)',
    },
    overallRiskScore: 61,
    overallRiskSeverity: 'Medium',
    extremeIndicators: [
      {
        id: 'cht-rain',
        label: '72h Orographic Rain Probability',
        value: '78%',
        status: 'High',
        thresholdNote: 'Hill slope runoff accelerates valley flash-flow after >45 mm showers',
      },
      {
        id: 'cht-erosion',
        label: 'Terrace Slope Runoff Risk',
        value: 'Elevated',
        status: 'Medium',
        thresholdNote: 'Keep contour bunds and hillside drainage chutes clear on upland plots',
      },
      {
        id: 'cht-disease',
        label: 'Valley Dew & Leaf Blight',
        value: 'Moderate (63/100)',
        status: 'Medium',
        thresholdNote: 'Morning valley fog traps moisture on ginger, maize, and paddy leaves',
      },
      {
        id: 'cht-heat',
        label: 'Daytime Heat Stress Index',
        value: '33°C',
        status: 'Low',
        thresholdNote: 'Mild hill elevation moderates peak midday temperatures',
      },
    ],
    forecast14Days: [
      { day: 'Thu', dateLabel: 'Nov 13', condition: 'Showers', tempMaxC: 29, tempMinC: 21, rainfallMm: 36, humidityPct: 86, windKmh: 16, rainProbPct: 75 },
      { day: 'Fri', dateLabel: 'Nov 14', condition: 'Heavy Rain', tempMaxC: 28, tempMinC: 21, rainfallMm: 58, humidityPct: 90, windKmh: 20, rainProbPct: 85 },
      { day: 'Sat', dateLabel: 'Nov 15', condition: 'Showers', tempMaxC: 28, tempMinC: 20, rainfallMm: 26, humidityPct: 85, windKmh: 15, rainProbPct: 65 },
      { day: 'Sun', dateLabel: 'Nov 16', condition: 'Partly Cloudy', tempMaxC: 29, tempMinC: 20, rainfallMm: 8, humidityPct: 79, windKmh: 12, rainProbPct: 35 },
      { day: 'Mon', dateLabel: 'Nov 17', condition: 'Clear', tempMaxC: 30, tempMinC: 19, rainfallMm: 0, humidityPct: 73, windKmh: 10, rainProbPct: 15 },
      { day: 'Tue', dateLabel: 'Nov 18', condition: 'Clear', tempMaxC: 30, tempMinC: 19, rainfallMm: 0, humidityPct: 70, windKmh: 9, rainProbPct: 10 },
      { day: 'Wed', dateLabel: 'Nov 19', condition: 'Partly Cloudy', tempMaxC: 29, tempMinC: 18, rainfallMm: 3, humidityPct: 72, windKmh: 10, rainProbPct: 20 },
      { day: 'Thu', dateLabel: 'Nov 20', condition: 'Clear', tempMaxC: 29, tempMinC: 18, rainfallMm: 0, humidityPct: 69, windKmh: 9, rainProbPct: 10 },
      { day: 'Fri', dateLabel: 'Nov 21', condition: 'Clear', tempMaxC: 29, tempMinC: 17, rainfallMm: 0, humidityPct: 67, windKmh: 9, rainProbPct: 10 },
      { day: 'Sat', dateLabel: 'Nov 22', condition: 'Partly Cloudy', tempMaxC: 28, tempMinC: 17, rainfallMm: 4, humidityPct: 71, windKmh: 10, rainProbPct: 20 },
      { day: 'Sun', dateLabel: 'Nov 23', condition: 'Partly Cloudy', tempMaxC: 28, tempMinC: 17, rainfallMm: 6, humidityPct: 74, windKmh: 11, rainProbPct: 25 },
      { day: 'Mon', dateLabel: 'Nov 24', condition: 'Showers', tempMaxC: 28, tempMinC: 18, rainfallMm: 14, humidityPct: 79, windKmh: 13, rainProbPct: 45 },
      { day: 'Tue', dateLabel: 'Nov 25', condition: 'Partly Cloudy', tempMaxC: 28, tempMinC: 17, rainfallMm: 0, humidityPct: 71, windKmh: 10, rainProbPct: 15 },
      { day: 'Wed', dateLabel: 'Nov 26', condition: 'Clear', tempMaxC: 29, tempMinC: 16, rainfallMm: 0, humidityPct: 67, windKmh: 9, rainProbPct: 10 },
    ],
  },
};

function hashDistrictOffset(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) {
    h = (h * 31 + id.charCodeAt(i)) % 97;
  }
  return h;
}

export const DISTRICTS: DistrictProfile[] = BANGLADESH_DISTRICTS.map((meta) => {
  const tpl = ARCHETYPE_TEMPLATES[meta.climateArchetype];
  const seed = hashDistrictOffset(meta.id);
  const tempDelta = (seed % 3) - 1; // -1, 0, +1
  const humDelta = ((seed >> 1) % 5) - 2; // -2..+2
  const rainFactor = 0.9 + (seed % 5) * 0.05; // 0.90..1.10
  const moistureDelta = ((seed >> 2) % 7) - 3; // -3..+3

  const tempC = (tpl.currentWeather.tempC ?? 0) + tempDelta;
  const feelsLikeC = (tpl.currentWeather.feelsLikeC ?? 0) + tempDelta;
  const humidityPct = Math.max(45, Math.min(96, (tpl.currentWeather.humidityPct ?? 65) + humDelta));
  const rainfall24hMm = Number(((tpl.currentWeather.rainfall24hMm ?? 0) * rainFactor).toFixed(1));
  const soilMoisturePct = Math.max(25, Math.min(95, (tpl.currentWeather.soilMoisturePct ?? 60) + moistureDelta));
  const overallRiskScore = Math.max(20, Math.min(92, tpl.overallRiskScore + (seed % 7) - 3));
  const overallRiskSeverity: RiskSeverity =
    overallRiskScore >= 67 ? 'High' : overallRiskScore >= 38 ? 'Medium' : 'Low';

  const extremeIndicators: ExtremeWeatherIndicator[] = tpl.extremeIndicators.map((ind, idx) => ({
    ...ind,
    id: `${meta.id}-ind-${idx}`,
  }));

  return {
    id: meta.id,
    name: meta.name,
    division: meta.division,
    latitude: meta.latitude,
    longitude: meta.longitude,
    agroZone: meta.agroZone,
    riverBasin: meta.riverBasin,
    elevationM: meta.elevationM,
    soilType: meta.soilType,
    currentWeather: {
      ...tpl.currentWeather,
      tempC,
      feelsLikeC,
      humidityPct,
      rainfall24hMm,
      soilMoisturePct,
      isLive: false,
    },
    overallRiskScore,
    overallRiskSeverity,
    extremeIndicators,
    forecast14Days: tpl.forecast14Days.map((day, i) => ({
      ...day,
      tempMaxC: day.tempMaxC + (i % 2 === 0 ? tempDelta : 0),
      rainfallMm:
        day.rainfallMm === 0
          ? 0
          : Math.max(1, Math.round(day.rainfallMm * rainFactor)),
    })),
  };
});

export const CROPS: CropProfile[] = [
  {
    id: 'aman-rice',
    name: 'Aman Rice',
    localName: 'আমন ধান (BRRI dhan49 / dhan87)',
    season: 'Kharif-II (Monsoon / Post-Monsoon)',
    typicalCycleDays: 135,
    optimalTempRangeC: '24–32°C',
    waterNeedSummary: 'Rainfed with supplemental drainage control during grain filling',
    keyDiseases: ['Neck & Leaf Blast', 'Sheath Blight', 'Bacterial Leaf Blight'],
  },
  {
    id: 'boro-rice',
    name: 'Boro Rice',
    localName: 'বোরো ধান (BRRI dhan28 / dhan89)',
    season: 'Rabi (Winter / Dry Season)',
    typicalCycleDays: 145,
    optimalTempRangeC: '20–32°C',
    waterNeedSummary: 'Irrigated; Alternate Wetting & Drying (AWD) saves up to 25% water',
    keyDiseases: ['Rice Blast', 'Brown Spot', 'Tungro Virus'],
  },
  {
    id: 'potato',
    name: 'Potato',
    localName: 'আলু (Diamant / Asterix)',
    season: 'Rabi (Cool Dry Season)',
    typicalCycleDays: 95,
    optimalTempRangeC: '15–24°C',
    waterNeedSummary: 'Light ridge irrigation every 10–14 days; zero tolerance for waterlogging',
    keyDiseases: ['Late Blight (Phytophthora)', 'Early Blight', 'Bacterial Wilt'],
  },
  {
    id: 'jute',
    name: 'Jute',
    localName: 'পাট (Deshi / Tossa)',
    season: 'Kharif-I (Pre-Monsoon)',
    typicalCycleDays: 120,
    optimalTempRangeC: '25–35°C',
    waterNeedSummary: 'Moderate early moisture; requires standing clean water at retting stage',
    keyDiseases: ['Stem Rot', 'Black Band', 'Anthracnose'],
  },
  {
    id: 'wheat',
    name: 'Wheat',
    localName: 'গম (BARI Gom 30 / 33)',
    season: 'Rabi (Winter)',
    typicalCycleDays: 112,
    optimalTempRangeC: '14–25°C',
    waterNeedSummary: '2–3 timed irrigations (Crown Root, Booting, Grain Filling)',
    keyDiseases: ['Wheat Blast', 'Leaf Rust', 'Bipolaris Leaf Blight'],
  },
  {
    id: 'maize',
    name: 'Maize',
    localName: 'ভুট্টা (Hybrid Rabi Maize)',
    season: 'Rabi / Kharif-I',
    typicalCycleDays: 125,
    optimalTempRangeC: '18–30°C',
    waterNeedSummary: 'Sensitive to drought at tasseling/silking and waterlogging at emergence',
    keyDiseases: ['Fall Armyworm', 'Turcicum Leaf Blight', 'Stalk Rot'],
  },
];

function scoreToSeverity(score: number): RiskSeverity {
  if (score >= 67) return 'High';
  if (score >= 38) return 'Medium';
  return 'Low';
}

export function mergeLiveWeatherIntoDistrict(
  base: DistrictProfile,
  live: LiveWeatherForecastPayload
): DistrictProfile {
  const fetchedTime = new Date(live.fetchedAtIso).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return {
    ...base,
    elevationM: live.coordinates.elevationM ?? base.elevationM,
    currentWeather: {
      condition: live.current.condition,
      tempC: live.current.tempC,
      feelsLikeC: live.current.feelsLikeC,
      humidityPct: live.current.humidityPct,
      rainfall24hMm: live.current.rainfall24hMm,
      precipitationNowMm: live.current.precipitationNowMm,
      rainNowMm: live.current.rainNowMm,
      windKmh: live.current.windKmh,
      windDir: live.current.windDir,
      uvIndex: live.current.uvIndex,
      soilMoisturePct: live.current.soilMoisturePct,
      et0TodayMm: live.current.et0TodayMm,
      surfacePressureHpa: live.current.surfacePressureHpa,
      updatedLabel: `Live Open-Meteo · Updated ${fetchedTime}`,
      isLive: true,
    },
    extremeIndicators: live.extremeIndicators,
    forecast14Days: live.daily.length > 0 ? live.daily : base.forecast14Days,
  };
}

export function getCropDistrictRisk(
  cropId: CropId,
  districtId: DistrictId,
  liveDistrictOverride?: DistrictProfile
): CropDistrictRiskAssessment {
  const district =
    liveDistrictOverride ??
    DISTRICTS.find((d) => d.id === districtId) ??
    DISTRICTS[0];
  const meta = BANGLADESH_DISTRICTS.find((d) => d.id === districtId) ?? BANGLADESH_DISTRICTS[0];
  const crop = CROPS.find((c) => c.id === cropId) ?? CROPS[0];

  const arch = meta.climateArchetype;
  const isFloodProneDistrict =
    arch === 'haor-monsoon' ||
    arch === 'delta-tidal' ||
    arch === 'barind-floodplain' ||
    arch === 'chittagong-hill';
  const isCoastalSaline = arch === 'coastal-tidal' || arch === 'delta-tidal';
  const isDryNorth = arch === 'teesta-northern' || arch === 'piedmont-dry';
  const currentHumidity = district.currentWeather.humidityPct;
  const currentSoilMoisture = district.currentWeather.soilMoisturePct;
  const currentTemp = district.currentWeather.tempC;
  const currentFeelsLike = district.currentWeather.feelsLikeC;
  const isHighHumidity = currentHumidity !== null && currentHumidity >= 80;
  const upcomingRain3d = Number(
    district.forecast14Days
      .slice(0, 3)
      .reduce((sum, d) => sum + d.rainfallMm, 0)
      .toFixed(1)
  );

  // 1. Flood Risk (uses real 72h rain when live feed is active)
  let floodScore = 24;
  if (district.currentWeather.isLive) {
    floodScore = 15 + Math.min(58, Math.round(upcomingRain3d * 0.65));
    if (isFloodProneDistrict) floodScore += 12;
  } else {
    if (arch === 'haor-monsoon') floodScore = 84;
    else if (arch === 'delta-tidal') floodScore = 74;
    else if (arch === 'chittagong-hill') floodScore = 62;
    else if (arch === 'barind-floodplain') floodScore = 56;
    else if (arch === 'brahmaputra-central') floodScore = 50;
    else if (arch === 'meghna-basin') floodScore = 46;
    else if (arch === 'coastal-tidal') floodScore = 44;
    else floodScore = 18;
  }

  if (district.elevationM <= 8) floodScore = Math.min(92, floodScore + 4);
  if (cropId === 'potato' || cropId === 'wheat' || cropId === 'maize') {
    floodScore = Math.min(95, floodScore + 10);
  } else if (cropId === 'aman-rice' && isFloodProneDistrict) {
    floodScore = Math.min(92, floodScore + 4);
  }

  const floodSeverity = scoreToSeverity(floodScore);
  const floodDetail: RiskDimensionDetail = {
    type: 'Flood',
    severity: floodSeverity,
    score: floodScore,
    primaryDriver:
      floodSeverity === 'High'
        ? `${upcomingRain3d} mm 72h rain + ${district.riverBasin} drainage congestion`
        : floodSeverity === 'Medium'
        ? `Localized waterlogging in low ${district.soilType.toLowerCase()} pockets`
        : `Low seasonal river surge in ${district.riverBasin}`,
    explanation:
      floodSeverity === 'High'
        ? `${district.name} (${district.division} Division) sits in the ${district.riverBasin} (${district.elevationM} m elevation) where ${upcomingRain3d} mm of projected 72-hour rainfall slows natural runoff. For ${crop.name}, prolonged root-zone submergence depletes oxygen and causes tuber rot or panicle lodging.`
        : floodSeverity === 'Medium'
        ? `Moderate rain pulses (${upcomingRain3d} mm over 3 days) can temporarily pond water in low-bunded ${district.name} plots. ${crop.name} tolerates brief moisture, but standing water beyond 24 hours stresses roots.`
        : `${district.name} has well-drained ${district.soilType.toLowerCase()} and minimal river surge risk over the next 14 days, keeping ${crop.name} root zones safe from submergence.`,
    preventiveAction:
      floodSeverity === 'High'
        ? `Clear peripheral field drainage channels immediately, reinforce bund heights by 15 cm, and harvest mature sections before peak ${district.forecast14Days[1]?.dateLabel ?? 'weekend'} rainfall.`
        : floodSeverity === 'Medium'
        ? `Open outlet cuts on lower bund corners so excess rain drains within 12 hours, and delay basal urea application until heavy showers pass.`
        : `Maintain standard ridge height and keep field drains unobstructed as a precaution.`,
  };

  // 2. Drought Risk (responds dynamically to live soil moisture & 72h rain)
  let droughtScore = 22;
  if (district.currentWeather.isLive) {
    const soilDeficit =
      currentSoilMoisture !== null ? Math.max(0, 72 - currentSoilMoisture) : 0;
    droughtScore = 12 + Math.min(55, Math.round(soilDeficit * 1.1));
    if (upcomingRain3d < 3) droughtScore = Math.min(88, droughtScore + 12);
    if (isCoastalSaline) droughtScore = Math.min(88, droughtScore + 8);
  } else {
    if (arch === 'piedmont-dry') droughtScore = 66;
    else if (arch === 'teesta-northern') droughtScore = 60;
    else if (arch === 'coastal-tidal') droughtScore = 52;
    else if (arch === 'meghna-basin') droughtScore = 34;
    else if (arch === 'barind-floodplain') droughtScore = 31;
    else if (arch === 'brahmaputra-central') droughtScore = 24;
    else droughtScore = 16;
  }

  if (cropId === 'boro-rice' || cropId === 'maize') {
    droughtScore = Math.min(90, droughtScore + 10);
  } else if (cropId === 'jute') {
    droughtScore = Math.max(12, droughtScore - 8);
  }

  const soilMoistureText =
    currentSoilMoisture !== null ? `${currentSoilMoisture}%` : 'unavailable';
  const droughtSeverity = scoreToSeverity(droughtScore);
  const droughtDetail: RiskDimensionDetail = {
    type: 'Drought',
    severity: droughtSeverity,
    score: droughtScore,
    primaryDriver:
      currentSoilMoisture === null
        ? `Soil moisture unavailable; evaluated from ${upcomingRain3d} mm 72h rain outlook`
        : isCoastalSaline && droughtScore >= 40
        ? `Tidal salinity + falling freshwater availability in ${district.name}`
        : isDryNorth
        ? `Low soil moisture (${soilMoistureText}) & sandy loam percolation`
        : `Adequate soil moisture reserve (${soilMoistureText})`,
    explanation:
      currentSoilMoisture === null
        ? `Topsoil moisture data is currently unavailable from Open-Meteo for ${district.name}. Drought risk reflects the 72-hour precipitation outlook (${upcomingRain3d} mm) and ${district.soilType.toLowerCase()} retention characteristics.`
        : droughtSeverity === 'High'
        ? `${district.name}'s ${district.soilType.toLowerCase()} drains quickly during dry spells, pulling soil moisture down to ${soilMoistureText}. ${crop.name} faces moisture stress during critical vegetative or grain-filling stages.`
        : droughtSeverity === 'Medium'
        ? isCoastalSaline
          ? `While air humidity is high in ${district.name}, rising dry-season canal salinity restricts usable freshwater for ${crop.name}, creating localized physiological drought stress.`
          : `Extended dry days and ${soilMoistureText} soil moisture in ${district.name} mean ${crop.name} plots without scheduled irrigation risk uneven stand establishment.`
        : `Current rainfall and ${soilMoistureText} soil moisture in ${district.name} comfortably meet ${crop.name} evapotranspiration demand over the coming 7–10 days.`,
    preventiveAction:
      droughtSeverity === 'High'
        ? `Apply light supplemental irrigation (25–30 mm) during early morning or late afternoon, and apply straw mulching (3–4 cm) between rows to cut evaporation.`
        : droughtSeverity === 'Medium'
        ? isCoastalSaline
          ? `Check canal EC salinity before pumping; store rainwater in farm ponds and irrigate in split light doses.`
          : `Schedule light furrow or AWD irrigation within 48 hours and conserve moisture with shallow inter-row mulching.`
        : `Hold off on unnecessary pumping; monitor soil moisture manually before scheduling the next irrigation cycle.`,
  };

  // 3. Heat Stress Risk (responds dynamically to live temperature & feels-like)
  let heatScore = 26;
  if (district.currentWeather.isLive) {
    const tempCandidates = [
      ...(currentTemp !== null ? [currentTemp] : []),
      ...(currentFeelsLike !== null ? [currentFeelsLike] : []),
    ];
    const apparent =
      tempCandidates.length > 0
        ? Math.max(...tempCandidates)
        : district.forecast14Days[0]?.tempMaxC ?? 28;
    if (apparent >= 38) heatScore = 76;
    else if (apparent >= 34) heatScore = 54;
    else if (apparent >= 30) heatScore = 36;
    else heatScore = 18;
  } else {
    if (arch === 'coastal-tidal') heatScore = 70;
    else if (arch === 'meghna-basin') heatScore = 51;
    else if (arch === 'barind-floodplain') heatScore = 46;
    else if (arch === 'delta-tidal') heatScore = 42;
    else if (arch === 'teesta-northern') heatScore = 35;
    else if (arch === 'brahmaputra-central') heatScore = 32;
    else if (arch === 'chittagong-hill') heatScore = 29;
    else heatScore = 24;
  }

  if (cropId === 'potato' || cropId === 'wheat') {
    heatScore = Math.min(92, heatScore + 16);
  } else if (cropId === 'jute') {
    heatScore = Math.max(15, heatScore - 10);
  }

  const tempLabel = currentTemp !== null ? `${currentTemp}°C` : 'unavailable';
  const feelsLabel =
    currentFeelsLike !== null ? `${currentFeelsLike}°C` : 'unavailable';
  const heatSeverity = scoreToSeverity(heatScore);
  const heatDetail: RiskDimensionDetail = {
    type: 'Heat',
    severity: heatSeverity,
    score: heatScore,
    primaryDriver:
      currentTemp === null && currentFeelsLike === null
        ? `Current temperature unavailable; assessed from daily forecast highs`
        : heatSeverity === 'High'
        ? `Feels-like ${feelsLabel} exceeds ${crop.name} optimal range (${crop.optimalTempRangeC})`
        : heatSeverity === 'Medium'
        ? `Afternoon peaks (${tempLabel}) nearing upper crop comfort band`
        : `Temperatures (${tempLabel}) well aligned with ${crop.name} cycle`,
    explanation:
      heatSeverity === 'High'
        ? `Daytime temperatures (${tempLabel}, feels-like ${feelsLabel}) in ${district.name} exceed ${crop.name}'s optimal range (${crop.optimalTempRangeC}). High canopy heat accelerates respiration loss, reduces pollen viability, or delays tuber bulking.`
        : heatSeverity === 'Medium'
        ? `Warm afternoons in ${district.name} push canopy microclimate slightly above ${crop.name}'s ideal ${crop.optimalTempRangeC} window, raising daytime transpiration demand.`
        : `${district.name}'s current thermal profile (${tempLabel} daytime / cooler nights) supports healthy photosynthesis and grain or tuber development in ${crop.name}.`,
    preventiveAction:
      heatSeverity === 'High'
        ? `Maintain shallow standing moisture (2–3 cm for paddy) or evening mist/furrow cooling, avoid foliar sprays between 11:00–16:00, and apply Potash (MoP) split to boost thermal tolerance.`
        : heatSeverity === 'Medium'
        ? `Shift field spraying and irrigation to early morning (06:00–09:00) or dusk, and avoid heavy nitrogen top-dressing during peak midday heat.`
        : `No special heat mitigation required; follow standard seasonal sowing and nutrient timing.`,
  };

  // 4. Crop Disease Risk (responds dynamically to live humidity & rainfall)
  let diseaseScore = isHighHumidity ? 62 : 30;
  if (district.currentWeather.isLive) {
    if (currentHumidity !== null) {
      diseaseScore =
        18 + Math.max(0, currentHumidity - 45) + (upcomingRain3d >= 20 ? 12 : 0);
      diseaseScore = Math.min(88, Math.round(diseaseScore));
    } else {
      diseaseScore = upcomingRain3d >= 20 ? 45 : 25;
    }
  } else {
    if (arch === 'haor-monsoon') diseaseScore = 82;
    else if (arch === 'delta-tidal') diseaseScore = 71;
    else if (arch === 'chittagong-hill') diseaseScore = 64;
    else if (arch === 'brahmaputra-central') diseaseScore = 61;
    else if (arch === 'meghna-basin') diseaseScore = 60;
    else if (arch === 'barind-floodplain') diseaseScore = 57;
    else if (arch === 'coastal-tidal') diseaseScore = 54;
    else if (arch === 'teesta-northern') diseaseScore = 40;
    else diseaseScore = 28;
  }

  if (cropId === 'potato' && (arch === 'barind-floodplain' || arch === 'teesta-northern' || isHighHumidity)) {
    diseaseScore = Math.min(92, diseaseScore + 14);
  } else if (cropId === 'wheat' && isHighHumidity) {
    diseaseScore = Math.min(90, diseaseScore + 14);
  }

  const humidityText = currentHumidity !== null ? `${currentHumidity}%` : 'unavailable';
  const diseaseSeverity = scoreToSeverity(diseaseScore);
  const primaryDisease = crop.keyDiseases[0];
  const diseaseDetail: RiskDimensionDetail = {
    type: 'Disease',
    severity: diseaseSeverity,
    score: diseaseScore,
    primaryDriver:
      currentHumidity === null
        ? `Relative humidity unavailable; evaluated from ${upcomingRain3d} mm 72h rainfall`
        : diseaseSeverity === 'High'
        ? `${humidityText} RH + dense dew trigger ${primaryDisease}`
        : diseaseSeverity === 'Medium'
        ? `Moderate morning leaf wetness favors ${crop.keyDiseases[1] ?? primaryDisease}`
        : `Dry air (${humidityText} RH) limits fungal spore spread`,
    explanation:
      currentHumidity === null
        ? `Current relative humidity is unavailable from Open-Meteo for ${district.name}; disease estimate reflects 72-hour rainfall (${upcomingRain3d} mm) and seasonal ${crop.name} susceptibility.`
        : diseaseSeverity === 'High'
        ? `Sustained ${humidityText} relative humidity and warm-to-mild nights in ${district.name} create ideal leaf-wetness conditions for ${primaryDisease} and ${crop.keyDiseases[1] ?? 'foliar blight'} in ${crop.name}.`
        : diseaseSeverity === 'Medium'
        ? `Morning dew retention and intermittent showers in ${district.name} moderately elevate ${primaryDisease} risk in dense ${crop.name} canopies with excess nitrogen.`
        : `Lower ambient humidity (${humidityText}) and good airflow across ${district.name} keep fungal and bacterial pathogen pressure low for ${crop.name}.`,
    preventiveAction:
      diseaseSeverity === 'High'
        ? `Scout lower leaves every 48 hours for lesions, halt excess urea immediately, widen drainage alleys for airflow, and consult your local agriculture officer for targeted preventive fungicide timing.`
        : diseaseSeverity === 'Medium'
        ? `Inspect 20 random hills/plants twice weekly, remove infected lower leaves carefully, and ensure balanced Potash nutrition.`
        : `Continue routine weekly scouting and keep field borders weed-free to prevent pest harborage.`,
  };

  const dimensions = [floodDetail, droughtDetail, heatDetail, diseaseDetail];
  const compositeScore = Math.round(
    dimensions.reduce((acc, d) => acc + d.score, 0) / dimensions.length
  );
  const compositeSeverity = scoreToSeverity(compositeScore);

  const highestRisk = [...dimensions].sort((a, b) => b.score - a.score)[0];

  return {
    cropId,
    districtId,
    compositeScore,
    compositeSeverity,
    summary: `${crop.name} in ${district.name} carries a ${compositeSeverity} composite risk (${compositeScore}/100), led primarily by ${highestRisk.type.toLowerCase()} pressure (${highestRisk.score}/100).`,
    dimensions,
  };
}

export const EARLY_WARNINGS: EarlyWarningAlert[] = [
  {
    id: 'ew-sylhet-flood',
    title: 'Surma–Kushiyara Haor Flash Flood & Submergence Watch',
    category: 'Flood',
    severity: 'High',
    districtIds: ['sylhet', 'sunamganj', 'habiganj', 'moulvibazar', 'kishoreganj', 'netrokona'],
    areaLabel: 'Sylhet, Sunamganj, Habiganj, Moulvibazar, Kishoreganj & Netrokona Haor Belt',
    issuedLabel: 'Issued today · 06:30 BST (Simulated)',
    validWindow: 'Next 48–72 hours',
    triggerMetric: '+1.28 m river surge · 227 mm 72h forecast rain',
    affectedCrops: ['Aman Rice', 'Winter Vegetables'],
    impactSummary:
      'Rapid runoff from upstream hills may overtop low-lying haor sub-embankments, threatening standing grain-filling Aman rice.',
    actionChecklist: [
      'Harvest any Aman plots reaching 80%+ golden grain maturity immediately.',
      'Reinforce weak earthen bund sections with bamboo stakes and sandbags.',
      'Move harvested bundles and threshing tarpaulins to raised homestead yards.',
    ],
  },
  {
    id: 'ew-bogura-rain',
    title: 'Heavy Monsoon Shower & Field Waterlogging Advisory',
    category: 'Heavy Rainfall',
    severity: 'High',
    districtIds: [
      'bogura',
      'sirajganj',
      'pabna',
      'natore',
      'naogaon',
      'barishal',
      'jhalokathi',
      'pirojpur',
      'mymensingh',
      'jamalpur',
      'sherpur',
      'tangail',
      'dhaka',
      'manikganj',
      'chattogram',
      'bandarban',
      'rangamati',
      'khagrachhari',
    ],
    areaLabel: 'Rajshahi–Jamuna, Mymensingh, Barishal & Chattogram Basins',
    issuedLabel: 'Issued today · 08:00 BST (Simulated)',
    validWindow: 'Next 48 hours',
    triggerMetric: '44–56 mm/24h peak rainfall intensity',
    affectedCrops: ['Potato', 'Aman Rice', 'Maize'],
    impactSummary:
      'Intense 24-hour downpours can saturate clay-loam soils, causing ridge slumping in newly planted Potato and lodging in tall rice.',
    actionChecklist: [
      'Clear main drainage furrows before Friday afternoon showers begin.',
      'Postpone urea top-dressing and herbicide spraying until dry weather returns.',
      'Tie or support lodged rice clumps in groups of 4–5 hills once water recedes.',
    ],
  },
  {
    id: 'ew-khulna-heat',
    title: 'Coastal High Heat-Humidity Stress Alert',
    category: 'Heat Stress',
    severity: 'High',
    districtIds: ['khulna', 'bagerhat', 'satkhira', 'jashore', 'coxs-bazar', 'noakhali', 'patuakhali', 'barguna'],
    areaLabel: 'Khulna, Bagerhat, Satkhira, Jashore & Southern Coastal Belt',
    issuedLabel: 'Issued today · 09:15 BST (Simulated)',
    validWindow: 'Next 72 hours (11:30–15:30 BST daily)',
    triggerMetric: '39°C Apparent Heat Index · 82% RH',
    affectedCrops: ['Boro Rice', 'Wheat', 'Maize'],
    impactSummary:
      'High afternoon heat index increases evapotranspiration and risks spikelet sterility or poor pollination in flowering crops.',
    actionChecklist: [
      'Maintain 2–3 cm freshwater layer in flowering paddy if non-saline water is available.',
      'Perform irrigation and foliar nutrient applications strictly after 16:30 BST.',
      'Avoid spraying sulfur or oil-based formulations during peak sun hours.',
    ],
  },
  {
    id: 'ew-bogura-blight',
    title: 'Late Blight & Rice Sheath Blight High-Humidity Alert',
    category: 'Crop Disease',
    severity: 'Medium',
    districtIds: [
      'bogura',
      'joypurhat',
      'sylhet',
      'cumilla',
      'brahmanbaria',
      'chandpur',
      'feni',
      'munshiganj',
      'narayanganj',
      'narsingdi',
      'gazipur',
      'mymensingh',
      'faridpur',
    ],
    areaLabel: 'Bogura, Munshiganj, Cumilla, Mymensingh & Sylhet Crop Belts',
    issuedLabel: 'Issued yesterday · 17:45 BST (Simulated)',
    validWindow: 'Next 5 days',
    triggerMetric: '79–91% RH + >12h nocturnal leaf wetness',
    affectedCrops: ['Potato', 'Aman Rice', 'Wheat'],
    impactSummary:
      'Warm nights paired with prolonged morning dew accelerate fungal spore spread on Potato foliage and lower rice sheaths.',
    actionChecklist: [
      'Inspect shaded field edges and dense canopy patches at dawn for water-soaked lesions.',
      'Remove heavily infected lower leaves in sealed bags rather than leaving them in furrows.',
      'Pause excess nitrogen fertilizer until humidity drops below 75%.',
    ],
  },
  {
    id: 'ew-rangpur-drought',
    title: 'High Barind & Teesta Topsoil Moisture Deficit Warning',
    category: 'Drought',
    severity: 'Medium',
    districtIds: [
      'rangpur',
      'dinajpur',
      'thakurgaon',
      'panchagarh',
      'nilphamari',
      'lalmonirhat',
      'kurigram',
      'gaibandha',
      'rajshahi',
      'chapainawabganj',
      'chuadanga',
      'meherpur',
      'kushtia',
    ],
    areaLabel: 'Rangpur, Dinajpur, High Barind (Rajshahi) & Western Ganges Uplands',
    issuedLabel: 'Issued today · 07:00 BST (Simulated)',
    validWindow: 'Next 7 days',
    triggerMetric: '9–11 consecutive dry days · 38–41% soil moisture',
    affectedCrops: ['Potato', 'Wheat', 'Maize'],
    impactSummary:
      'Sandy loam uplands are drying rapidly, threatening uneven germination in newly sown Rabi Wheat and early tuber initiation in Potato.',
    actionChecklist: [
      'Apply light furrow irrigation (25 mm) in early morning to restore root-zone moisture.',
      'Spread rice-straw mulch between Potato and Maize rows to reduce soil evaporation by 30%.',
      'Check shallow tube-well schedules with local water-user groups to avoid peak losses.',
    ],
  },
  {
    id: 'ew-barishal-tidal',
    title: 'Spring High-Tide Drainage Congestion Notice',
    category: 'Flood',
    severity: 'Medium',
    districtIds: ['barishal', 'bhola', 'jhalokathi', 'patuakhali', 'barguna', 'pirojpur', 'gopalganj', 'madaripur', 'shariatpur', 'lakshmipur', 'khulna', 'narail', 'magura', 'jhenaidah', 'rajbari'],
    areaLabel: 'Barishal, Lower Meghna Estuary & Southern Tidal Polders',
    issuedLabel: 'Issued today · 10:00 BST (Simulated)',
    validWindow: 'Next 96 hours',
    triggerMetric: '+0.60 m tidal peak above normal sluice level',
    affectedCrops: ['Aman Rice', 'Jute'],
    impactSummary:
      'Elevated river tides restrict low-tide gravity drainage, increasing short-term submergence risk during coastal showers.',
    actionChecklist: [
      'Close outer polder sluice flaps during incoming high tide to block brackish inflow.',
      'Drain freshwater accumulation strictly during the 3-hour low-tide window.',
    ],
  },
];

export const INITIAL_TRACKED_PLOTS: TrackedCropPlot[] = [
  {
    id: 'plot-1',
    plotName: 'North Canal Plot (Plot A)',
    cropId: 'aman-rice',
    variety: 'BRRI dhan87',
    areaBigha: 2.5,
    daysAfterPlanting: 98,
    totalCycleDays: 135,
    currentStage: 'Milk to Dough Grain Filling',
    nextStage: 'Physiological Maturity',
    daysToNextStage: 14,
    healthStatus: 'Medium',
    soilMoisturePct: 76,
    targetMoistureRange: '65–80%',
    irrigationAction: 'Pause irrigation — rain expected in 24h',
    irrigationAmountMm: 0,
    nextIrrigationWindow: 'Skip cycle; re-check Nov 17',
    awdNote: 'AWD Pani Pipe at +1 cm; keep drain ready before Saturday rain peak.',
  },
  {
    id: 'plot-2',
    plotName: 'Homestead High Ridge (Plot B)',
    cropId: 'potato',
    variety: 'BARI Alu-25 (Asterix)',
    areaBigha: 1.5,
    daysAfterPlanting: 28,
    totalCycleDays: 95,
    currentStage: 'Stolonization & Earthing-Up',
    nextStage: 'Tuber Initiation',
    daysToNextStage: 11,
    healthStatus: 'Low',
    soilMoisturePct: 54,
    targetMoistureRange: '55–70%',
    irrigationAction: 'Hold irrigation & deepen ridge furrows',
    irrigationAmountMm: 0,
    nextIrrigationWindow: 'Wait until Nov 18 (after rain clears)',
    awdNote: 'Ensure furrow outlets open freely so tubers never sit in standing water.',
  },
  {
    id: 'plot-3',
    plotName: 'East Road Terraces (Plot C)',
    cropId: 'maize',
    variety: 'BARI Hybrid Bhutta-9',
    areaBigha: 1.0,
    daysAfterPlanting: 22,
    totalCycleDays: 125,
    currentStage: 'V5 Vegetative Leaf Stage',
    nextStage: 'V8 Rapid Stem Elongation',
    daysToNextStage: 12,
    healthStatus: 'Low',
    soilMoisturePct: 48,
    targetMoistureRange: '50–68%',
    irrigationAction: 'Light side-dress & soil moisture check',
    irrigationAmountMm: 15,
    nextIrrigationWindow: 'Nov 19 morning if <10 mm rain falls',
    awdNote: 'Side-dress urea only after weekend showers taper off to prevent leaching.',
  },
];

export const INITIAL_FARMING_ACTIVITIES: FarmingActivityItem[] = [
  {
    id: 'act-1',
    title: 'Clear Plot A & Plot B peripheral drainage outlets',
    plotName: 'North Canal Plot (Plot A)',
    category: 'Drainage & Bunds',
    dueDateLabel: 'Today · Before 17:00',
    priority: 'High',
    completed: false,
    notes: 'Forecast shows 52 mm rainfall on Saturday; clear silt from south corner outlet.',
  },
  {
    id: 'act-2',
    title: 'Scout Potato leaves for early/late blight lesions',
    plotName: 'Homestead High Ridge (Plot B)',
    category: 'Pest & Disease',
    dueDateLabel: 'Tomorrow · 07:00',
    priority: 'Medium',
    completed: false,
    notes: 'Check shaded east edge where morning dew persists longest.',
  },
  {
    id: 'act-3',
    title: 'Verify AWD Pani Pipe water depth in Aman field',
    plotName: 'North Canal Plot (Plot A)',
    category: 'Irrigation',
    dueDateLabel: 'Completed yesterday',
    priority: 'Low',
    completed: true,
    notes: 'Measured +1 cm above soil surface; no pump needed this week.',
  },
  {
    id: 'act-4',
    title: 'Prepare Potash (MoP) top-dress for V6 Maize stage',
    plotName: 'East Road Terraces (Plot C)',
    category: 'Fertilization',
    dueDateLabel: 'In 4 days (Nov 17)',
    priority: 'Medium',
    completed: false,
    notes: 'Apply 12 kg MoP per bigha once soil drains to field capacity.',
  },
  {
    id: 'act-5',
    title: 'Inspect bund height along lower canal embankment',
    plotName: 'North Canal Plot (Plot A)',
    category: 'Drainage & Bunds',
    dueDateLabel: 'Completed 2 days ago',
    priority: 'Medium',
    completed: true,
    notes: 'Patched two crab holes near south sluice.',
  },
];

export interface SimulatedAdvisorReply {
  content: string;
  recommendations: string[];
  timingNote: string;
}

export function generateSimulatedAdvisorResponse(
  query: string,
  districtId: DistrictId,
  cropId: CropId,
  liveDistrictOverride?: DistrictProfile
): SimulatedAdvisorReply {
  const district =
    liveDistrictOverride ??
    DISTRICTS.find((d) => d.id === districtId) ??
    DISTRICTS[0];
  const crop = CROPS.find((c) => c.id === cropId) ?? CROPS[0];
  const assessment = getCropDistrictRisk(cropId, districtId, district);
  const q = query.toLowerCase();

  if (q.includes('flood') || q.includes('rain') || q.includes('waterlog') || q.includes('drain')) {
    const flood = assessment.dimensions.find((d) => d.type === 'Flood')!;
    return {
      content: `For ${crop.name} in ${district.name} (${district.riverBasin}), flood & waterlogging risk is currently ${flood.severity} (${flood.score}/100). ${flood.explanation}`,
      recommendations: [
        'Cut shallow drainage notches (10–12 cm wide) at the lowest plot corner to move excess surface water into outer ditches.',
        'Pause nitrogen/urea top-dressing until heavy showers pass so fertilizer does not wash away.',
        'If your Aman rice is above 80% golden maturity, prioritize early harvesting before peak rain days.',
        'For ridge crops like Potato or Maize, deepen inter-row furrows by 5 cm so roots stay aerated.',
      ],
      timingNote: `Best action window: Complete drainage prep within the next 12–24 hours based on ${district.name}'s ${district.currentWeather.isLive ? 'live Open-Meteo' : 'regional'} forecast.`,
    };
  }

  if (q.includes('blight') || q.includes('disease') || q.includes('pest') || q.includes('fung') || q.includes('blast') || q.includes('insect')) {
    const disease = assessment.dimensions.find((d) => d.type === 'Disease')!;
    const rhLabel =
      district.currentWeather.humidityPct !== null
        ? `${district.currentWeather.humidityPct}%`
        : 'currently unavailable';
    return {
      content: `In ${district.name}, relative humidity is ${rhLabel} with ${disease.severity} disease risk (${disease.score}/100) for ${crop.name}. Primary watchpoints are ${crop.keyDiseases.join(', ')}.`,
      recommendations: [
        `Walk a diagonal W-pattern across your plot every 2 days at dawn to inspect lower leaves for ${crop.keyDiseases[0]} spots.`,
        'Avoid excessive urea application, which creates soft, lush tissue vulnerable to fungal infection and Brown Planthopper.',
        'Maintain clean bund borders and open alternate rows slightly if air circulation is blocked.',
        'Consult your local Upazila Agriculture Extension Officer (UAEO / SAAO) before applying any targeted crop protection spray.',
      ],
      timingNote: `Spray timing rule: If treatment is advised by an officer, apply strictly in calm morning (06:30–09:00) or late afternoon (16:30–17:30) dry windows.`,
    };
  }

  if (q.includes('irrigat') || q.includes('water') || q.includes('awd') || q.includes('drought') || q.includes('dry')) {
    const drought = assessment.dimensions.find((d) => d.type === 'Drought')!;
    const soilLabel =
      district.currentWeather.soilMoisturePct !== null
        ? `${district.currentWeather.soilMoisturePct}%`
        : 'unavailable';
    return {
      content: `${district.name}'s current soil moisture is ${district.currentWeather.isLive ? soilLabel : `simulated at ${soilLabel}`} on ${district.soilType.toLowerCase()}, placing ${crop.name} drought risk at ${drought.severity} (${drought.score}/100).`,
      recommendations: [
        cropId.includes('rice')
          ? 'Use Alternate Wetting & Drying (AWD / Pani Pipe): only irrigate when water drops 15 cm below soil surface, except during flowering when 2–3 cm standing water protects pollination.'
          : `Deliver light, uniform furrow irrigation (20–25 mm) rather than flooding ridges so roots avoid hypoxia.`,
        'Irrigate early morning (06:00–09:00) to minimize evaporation loss and fungal leaf wetness overnight.',
        'Apply rice straw or water hyacinth mulch between rows on upland plots to preserve moisture for 5–7 extra days.',
      ],
      timingNote: `Irrigation check: Re-evaluate soil moisture in 48 hours after accounting for ${district.forecast14Days[1]?.rainfallMm ?? 0} mm projected rain.`,
    };
  }

  if (q.includes('heat') || q.includes('temp') || q.includes('hot') || q.includes('fertil') || q.includes('urea')) {
    const heat = assessment.dimensions.find((d) => d.type === 'Heat')!;
    const tempText =
      district.currentWeather.tempC !== null ? `${district.currentWeather.tempC}°C` : 'unavailable';
    const feelsText =
      district.currentWeather.feelsLikeC !== null
        ? `${district.currentWeather.feelsLikeC}°C`
        : 'unavailable';
    return {
      content: `${district.name} is currently at ${tempText} (feels-like ${feelsText}), giving ${crop.name} (optimal ${crop.optimalTempRangeC}) a ${heat.severity} heat stress rating (${heat.score}/100).`,
      recommendations: [
        'Split Potassium (MoP) application during early reproductive stages to strengthen cell walls against heat and lodging.',
        'Never apply foliar sprays or urea during midday peak heat (11:00–15:30 BST) to avoid leaf scorch.',
        'Keep shallow moisture in root zones before predicted warm spells to cool the crop canopy via transpiration.',
      ],
      timingNote: `Thermal window: Morning field operations before 10:00 BST protect both crop tissue and farmer comfort.`,
    };
  }

  const fallbackSoilText =
    district.currentWeather.soilMoisturePct !== null
      ? `${district.currentWeather.soilMoisturePct}%`
      : 'unavailable';

  return {
    content: `Based on ${district.currentWeather.isLive ? 'live weather' : 'static baseline'} conditions for ${crop.name} (${crop.localName}) in ${district.name}: overall composite risk is ${assessment.compositeSeverity} (${assessment.compositeScore}/100). ${assessment.summary}`,
    recommendations: [
      `Priority focus: ${assessment.dimensions.sort((a, b) => b.score - a.score)[0].preventiveAction}`,
      `Moisture plan: ${crop.waterNeedSummary}. Current district soil moisture is ${fallbackSoilText}.`,
      `Disease watch: Scout weekly for ${crop.keyDiseases.slice(0, 2).join(' and ')} whenever humidity stays above 80%.`,
    ],
    timingNote: `District context: ${district.name} · ${district.agroZone} · Advisory Prototype`,
  };
}
