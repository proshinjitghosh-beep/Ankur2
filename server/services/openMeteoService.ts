import type {
  DailyForecastPoint,
  ExtremeWeatherIndicator,
  HistoricalWeatherDay,
  HistoricalWeatherPayload,
  LiveWeatherForecastPayload,
  RiskSeverity,
  SoilMoistureProxyMeta,
} from '../../src/types/agri.ts';

const OPEN_METEO_FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const OPEN_METEO_ARCHIVE_URL = 'https://archive-api.open-meteo.com/v1/archive';
const DEFAULT_TIMEZONE = 'Asia/Dhaka';
const REQUEST_TIMEOUT_MS = 10_000;
const CACHE_TTL_MS = 5 * 60 * 1000;

export type ArchiveDatasetId = 'era5' | 'era5_land' | 'ecmwf_ifs_historical_forecast';

export const ARCHIVE_DATASET_LAG_DAYS: Record<ArchiveDatasetId, number> = {
  era5: 5,
  era5_land: 5,
  ecmwf_ifs_historical_forecast: 0,
};

export function getArchiveDatasetLagDays(dataset: ArchiveDatasetId = 'era5'): number {
  const envOverride = process.env.OPEN_METEO_ARCHIVE_LAG_DAYS;
  if (envOverride !== undefined && envOverride.trim() !== '') {
    const parsed = Number(envOverride);
    if (Number.isInteger(parsed) && parsed >= 0 && parsed <= 30) {
      return parsed;
    }
  }
  return ARCHIVE_DATASET_LAG_DAYS[dataset] ?? 5;
}

interface CacheEntry<T> {
  expiresAt: number;
  value: T;
}

const rawForecastCache = new Map<string, CacheEntry<RawOpenMeteoForecast>>();
const forecastCache = new Map<string, CacheEntry<LiveWeatherForecastPayload>>();
const historicalCache = new Map<string, CacheEntry<HistoricalWeatherPayload>>();
const inFlightRawForecast = new Map<string, Promise<RawOpenMeteoForecast>>();
const inFlightHistorical = new Map<string, Promise<HistoricalWeatherPayload>>();

export class OpenMeteoServiceError extends Error {
  statusCode: number;
  details?: string;

  constructor(message: string, statusCode = 500, details?: string) {
    super(message);
    this.name = 'OpenMeteoServiceError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

export function validateCoordinates(
  rawLat: unknown,
  rawLon: unknown
): { latitude: number; longitude: number } {
  const latStr = typeof rawLat === 'string' ? rawLat.trim() : rawLat;
  const lonStr = typeof rawLon === 'string' ? rawLon.trim() : rawLon;
  if (latStr === undefined || latStr === null || latStr === '') {
    throw new OpenMeteoServiceError('Missing required query parameter: lat (latitude).', 400);
  }
  if (lonStr === undefined || lonStr === null || lonStr === '') {
    throw new OpenMeteoServiceError('Missing required query parameter: lon (longitude).', 400);
  }

  const latitude = Number(latStr);
  const longitude = Number(lonStr);

  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    throw new OpenMeteoServiceError(
      'Invalid latitude. Must be a number between -90 and 90.',
      400
    );
  }
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    throw new OpenMeteoServiceError(
      'Invalid longitude. Must be a number between -180 and 180.',
      400
    );
  }

  return {
    latitude: Number(latitude.toFixed(4)),
    longitude: Number(longitude.toFixed(4)),
  };
}

export function validateForecastDays(rawDays: unknown): number {
  if (rawDays === undefined || rawDays === null || rawDays === '') {
    return 7;
  }
  const days = Number(rawDays);
  if (!Number.isInteger(days) || days < 1 || days > 16) {
    throw new OpenMeteoServiceError(
      'Invalid days parameter. Must be an integer between 1 and 16.',
      400
    );
  }
  return days;
}

function formatIsoDateUtc(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function parseStrictUtcIsoDate(isoDate: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
    return null;
  }
  const [yearStr, monthStr, dayStr] = isoDate.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);

  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  const ms = Date.UTC(year, month - 1, day);
  const parsed = new Date(ms);
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return null;
  }

  return ms;
}

export function validateHistoricalRange(
  rawStartDate: unknown,
  rawEndDate: unknown,
  dataset: ArchiveDatasetId = 'era5'
): { startDate: string; endDate: string } {
  const lagDays = getArchiveDatasetLagDays(dataset);
  const maxAvailableDate = new Date();
  maxAvailableDate.setUTCDate(maxAvailableDate.getUTCDate() - lagDays);

  const defaultEnd = new Date(maxAvailableDate);
  const defaultStart = new Date(defaultEnd);
  defaultStart.setUTCDate(defaultStart.getUTCDate() - 29);

  const startDate =
    typeof rawStartDate === 'string' && rawStartDate.trim()
      ? rawStartDate.trim()
      : formatIsoDateUtc(defaultStart);
  const endDate =
    typeof rawEndDate === 'string' && rawEndDate.trim()
      ? rawEndDate.trim()
      : formatIsoDateUtc(defaultEnd);

  const isoPattern = /^\d{4}-\d{2}-\d{2}$/;
  if (!isoPattern.test(startDate) || !isoPattern.test(endDate)) {
    throw new OpenMeteoServiceError(
      'Invalid date format. Use YYYY-MM-DD for startDate and endDate.',
      400
    );
  }

  const startMs = parseStrictUtcIsoDate(startDate);
  const endMs = parseStrictUtcIsoDate(endDate);
  if (startMs === null || endMs === null) {
    throw new OpenMeteoServiceError('Invalid calendar date provided.', 400);
  }

  if (startMs > endMs) {
    throw new OpenMeteoServiceError('startDate must be earlier than or equal to endDate.', 400);
  }

  const diffDays = Math.round((endMs - startMs) / (1000 * 60 * 60 * 24)) + 1;
  if (diffDays > 366) {
    throw new OpenMeteoServiceError(
      'Historical date range cannot exceed 366 days per request.',
      400
    );
  }

  if (endMs > maxAvailableDate.getTime() + 24 * 60 * 60 * 1000) {
    throw new OpenMeteoServiceError(
      `Historical archive data is available up to ${formatIsoDateUtc(maxAvailableDate)}.`,
      400
    );
  }

  return { startDate, endDate };
}

function degreesToCompass(deg: number): string {
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round(((deg % 360) / 22.5)) % 16;
  return dirs[index] ?? 'N';
}

function mapWmoCodeToDailyCondition(
  code: number,
  tempMaxC: number,
  precipMm: number
): DailyForecastPoint['condition'] {
  if (code >= 95) return 'Thunderstorm';
  if (precipMm >= 40 || code === 65 || code === 82) return 'Heavy Rain';
  if ((code >= 51 && code <= 86) || precipMm >= 3) return 'Showers';
  if (tempMaxC >= 35 && code <= 2) return 'Heat Haze';
  if (code === 0 || code === 1) return 'Clear';
  return 'Partly Cloudy';
}

function mapWmoCodeToText(code: number): string {
  if (code === 0) return 'Clear Sky';
  if (code === 1) return 'Mainly Clear';
  if (code === 2) return 'Partly Cloudy';
  if (code === 3) return 'Overcast';
  if (code === 45 || code === 48) return 'Morning Fog / Mist';
  if (code >= 51 && code <= 57) return 'Light Drizzle';
  if (code >= 61 && code <= 63) return 'Moderate Rain';
  if (code === 65 || code === 82) return 'Heavy Rain';
  if (code >= 80 && code <= 81) return 'Rain Showers';
  if (code >= 95) return 'Thunderstorm';
  return 'Partly Cloudy';
}

function formatShortDate(isoDate: string): { day: string; dateLabel: string } {
  const date = new Date(`${isoDate}T12:00:00Z`);
  const day = date.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
  const dateLabel = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
  return { day, dateLabel };
}

function isFiniteNumber(val: unknown): val is number {
  return typeof val === 'number' && Number.isFinite(val);
}

function roundNullable(val: unknown, decimals = 0): number | null {
  if (!isFiniteNumber(val)) return null;
  return decimals === 0 ? Math.round(val) : Number(val.toFixed(decimals));
}

function deriveAgroIndicators(
  current: LiveWeatherForecastPayload['current'],
  daily: DailyForecastPoint[]
): ExtremeWeatherIndicator[] {
  const next3d = daily.slice(0, 3);
  const maxRainProb3d = Math.max(0, ...next3d.map((d) => d.rainProbPct));
  const rain3dTotal = Number(next3d.reduce((sum, d) => sum + d.rainfallMm, 0).toFixed(1));
  const heatCandidates = [
    ...(isFiniteNumber(current.feelsLikeC) ? [current.feelsLikeC] : []),
    ...next3d.map((d) => d.tempMaxC + 2),
  ];
  const peakFeelsLike = heatCandidates.length > 0 ? Math.max(...heatCandidates) : null;

  const rainStatus: RiskSeverity =
    rain3dTotal >= 75 || maxRainProb3d >= 80
      ? 'High'
      : rain3dTotal >= 25 || maxRainProb3d >= 50
      ? 'Medium'
      : 'Low';

  const heatStatus: RiskSeverity =
    peakFeelsLike === null
      ? 'Low'
      : peakFeelsLike >= 37
      ? 'High'
      : peakFeelsLike >= 33
      ? 'Medium'
      : 'Low';

  const humidityStatus: RiskSeverity =
    current.humidityPct === null
      ? 'Low'
      : current.humidityPct >= 85
      ? 'High'
      : current.humidityPct >= 75
      ? 'Medium'
      : 'Low';

  const moistureStatus: RiskSeverity =
    current.soilMoisturePct === null
      ? 'Low'
      : current.soilMoisturePct <= 35 || current.soilMoisturePct >= 88
      ? 'High'
      : current.soilMoisturePct <= 48 || current.soilMoisturePct >= 80
      ? 'Medium'
      : 'Low';

  const et0Label =
    current.et0TodayMm !== null ? `${current.et0TodayMm.toFixed(1)} mm` : 'ET0 N/A';

  return [
    {
      id: 'live-rain-72h',
      label: '72h Rain Probability & Accumulation',
      value: `${maxRainProb3d}% · ${rain3dTotal} mm`,
      status: rainStatus,
      thresholdNote:
        rainStatus === 'High'
          ? 'Exceeds 75 mm / 80% 72h heavy-rain runoff threshold'
          : rainStatus === 'Medium'
          ? 'Moderate rainfall expected; inspect field drainage cuts'
          : 'Low 72h precipitation accumulation',
    },
    {
      id: 'live-heat-index',
      label: 'Apparent Heat Stress Index',
      value: peakFeelsLike !== null ? `${Math.round(peakFeelsLike)}°C` : 'Unavailable',
      status: heatStatus,
      thresholdNote:
        peakFeelsLike === null
          ? 'Apparent heat temperature unavailable from Open-Meteo'
          : heatStatus === 'High'
          ? 'Above 37°C heat stress threshold; avoid midday spraying'
          : heatStatus === 'Medium'
          ? 'Warm afternoon canopy temperatures expected'
          : 'Temperatures within comfortable crop development band',
    },
    {
      id: 'live-canopy-rh',
      label: 'Relative Humidity & Leaf Wetness',
      value: current.humidityPct !== null ? `${Math.round(current.humidityPct)}%` : 'Unavailable',
      status: humidityStatus,
      thresholdNote:
        current.humidityPct === null
          ? 'Current relative humidity reading unavailable from Open-Meteo'
          : humidityStatus === 'High'
          ? 'Sustained >85% RH favors rice blast & potato late blight'
          : humidityStatus === 'Medium'
          ? 'Moderate morning dew; scout lower foliage twice weekly'
          : 'Drier canopy air limits fungal spore spread',
    },
    {
      id: 'live-soil-moisture',
      label: 'Topsoil Moisture (0–7 cm) & ET0',
      value:
        current.soilMoisturePct !== null
          ? `${Math.round(current.soilMoisturePct)}% · ${et0Label}`
          : `Unavailable · ${et0Label}`,
      status: moistureStatus,
      thresholdNote:
        current.soilMoisturePct === null
          ? 'Upstream topsoil moisture reading unavailable for this grid hour'
          : current.soilMoisturePct <= 35
          ? 'Dry root-zone topsoil; supplemental irrigation advised'
          : current.soilMoisturePct >= 85
          ? 'Saturated topsoil; hold irrigation and clear drains'
          : 'Adequate root-zone moisture balance',
    },
  ];
}

interface OpenMeteoErrorBody {
  error?: boolean;
  reason?: string;
}

export async function fetchJsonWithTimeout<T>(url: string): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });

    const rawText = await response.text();
    let parsedJson: unknown = null;
    if (rawText) {
      try {
        parsedJson = JSON.parse(rawText);
      } catch {
        if (!response.ok) {
          throw new OpenMeteoServiceError(
            `Open-Meteo API returned HTTP ${response.status}`,
            502,
            rawText.slice(0, 300)
          );
        }
        throw new OpenMeteoServiceError(
          'Open-Meteo API returned malformed JSON.',
          502,
          rawText.slice(0, 300)
        );
      }
    }

    const errorPayload = parsedJson as OpenMeteoErrorBody | null;
    if (
      errorPayload &&
      typeof errorPayload === 'object' &&
      errorPayload.error === true
    ) {
      const reason =
        typeof errorPayload.reason === 'string' && errorPayload.reason.trim()
          ? errorPayload.reason.trim()
          : 'Upstream Open-Meteo error flag returned.';
      throw new OpenMeteoServiceError(
        `Open-Meteo API error: ${reason}`,
        502,
        reason
      );
    }

    if (!response.ok) {
      throw new OpenMeteoServiceError(
        `Open-Meteo API returned HTTP ${response.status}`,
        502,
        rawText.slice(0, 300)
      );
    }

    return parsedJson as T;
  } catch (err) {
    if (err instanceof OpenMeteoServiceError) {
      throw err;
    }
    if (err instanceof Error && err.name === 'AbortError') {
      throw new OpenMeteoServiceError(
        'Open-Meteo API request timed out.',
        504
      );
    }
    throw new OpenMeteoServiceError(
      'Unable to reach Open-Meteo API.',
      502,
      err instanceof Error ? err.message : String(err)
    );
  } finally {
    clearTimeout(timeout);
  }
}

export interface RawOpenMeteoForecast {
  latitude: number;
  longitude: number;
  elevation?: number | null;
  timezone: string;
  current: {
    time?: string;
    temperature_2m?: number | null;
    relative_humidity_2m?: number | null;
    apparent_temperature?: number | null;
    precipitation?: number | null;
    rain?: number | null;
    weather_code?: number | null;
    wind_speed_10m?: number | null;
    wind_gusts_10m?: number | null;
    wind_direction_10m?: number | null;
    surface_pressure?: number | null;
  };
  hourly: {
    time: string[];
    temperature_2m?: Array<number | null>;
    relative_humidity_2m?: Array<number | null>;
    precipitation?: Array<number | null>;
    wind_speed_10m?: Array<number | null>;
    wind_gusts_10m?: Array<number | null>;
    soil_moisture_0_to_7cm?: Array<number | null>;
    uv_index?: Array<number | null>;
    et0_fao_evapotranspiration?: Array<number | null>;
  };
  daily: {
    time: string[];
    weather_code: Array<number | null>;
    temperature_2m_max: Array<number | null>;
    temperature_2m_min: Array<number | null>;
    precipitation_sum: Array<number | null>;
    rain_sum?: Array<number | null>;
    precipitation_probability_max?: Array<number | null>;
    wind_speed_10m_max: Array<number | null>;
    wind_gusts_10m_max?: Array<number | null>;
    et0_fao_evapotranspiration?: Array<number | null>;
    relative_humidity_2m_mean?: Array<number | null>;
  };
}

export function extractLatestSoilMoistureProxy(
  raw: RawOpenMeteoForecast
): SoilMoistureProxyMeta {
  const times = raw?.hourly?.time ?? [];
  const values = raw?.hourly?.soil_moisture_0_to_7cm ?? [];
  const currentTimeIso = typeof raw?.current?.time === 'string' ? raw.current.time : '';
  const currentHourPrefix = currentTimeIso.slice(0, 13);
  const matchedIdx = currentHourPrefix
    ? times.findIndex((t) => t.startsWith(currentHourPrefix))
    : -1;
  const anchorIdx = matchedIdx >= 0 ? matchedIdx : 0;

  let foundVal: number | null = null;
  let foundTime: string | null = null;
  for (let offset = 0; offset <= 3; offset += 1) {
    const idx = anchorIdx - offset;
    if (idx < 0 || idx >= values.length) continue;
    const candidate = values[idx];
    if (isFiniteNumber(candidate)) {
      foundVal = Number(candidate.toFixed(3));
      foundTime = times[idx] ?? null;
      break;
    }
  }

  const heuristicPct =
    foundVal !== null
      ? Math.max(0, Math.min(100, Math.round((foundVal / 0.48) * 100)))
      : null;

  return {
    rawM3PerM3: foundVal,
    unit: 'm3/m3',
    depthLayer: '0-7 cm',
    source: foundVal !== null ? 'hourly_model_proxy' : 'unavailable',
    observationHourIso: foundTime,
    isObservedSensor: false,
    heuristicPct,
    isUnvalidatedHeuristic: true,
    heuristicNote:
      'Unvalidated linear scaling (rawM3PerM3 / 0.48) for legacy gauge continuity only; does not represent actual clay/loam porosity or field capacity.',
  };
}

export function parseOpenMeteoForecastResponse(
  raw: RawOpenMeteoForecast
): LiveWeatherForecastPayload {
  if (!raw?.current || !raw?.daily?.time?.length || !raw?.hourly?.time?.length) {
    throw new OpenMeteoServiceError(
      'Open-Meteo forecast response was incomplete.',
      502
    );
  }

  // Match nearest hourly index to current time
  const currentTimeIso = typeof raw.current.time === 'string' ? raw.current.time : '';
  const currentHourPrefix = currentTimeIso.slice(0, 13);
  const matchedIdx = currentHourPrefix
    ? raw.hourly.time.findIndex((t) => t.startsWith(currentHourPrefix))
    : -1;
  const hourIdx = matchedIdx >= 0 ? matchedIdx : 0;

  const soilProxy = extractLatestSoilMoistureProxy(raw);
  const soilMoisturePct = soilProxy.heuristicPct;

  const uvIndex = roundNullable(raw.hourly.uv_index?.[hourIdx], 0);

  // Sum trailing 24 hourly rainfall values up to current hour, or fall back to today's daily precipitation_sum
  let rainfall24hMm = roundNullable(raw.daily.precipitation_sum[0], 1);
  if (raw.hourly.precipitation && hourIdx > 0) {
    const startIdx = Math.max(0, hourIdx - 23);
    const slice = raw.hourly.precipitation.slice(startIdx, hourIdx + 1);
    const finiteValues = slice.filter((v): v is number => isFiniteNumber(v));
    if (finiteValues.length > 0) {
      const sum = finiteValues.reduce((acc, v) => acc + v, 0);
      rainfall24hMm = Number(sum.toFixed(1));
    }
  }

  const currentRhFallback = roundNullable(raw.current.relative_humidity_2m, 0);

  const daily: DailyForecastPoint[] = raw.daily.time.map((isoDate, i) => {
    const { day, dateLabel } = formatShortDate(isoDate);
    const tempMaxC = Math.round(raw.daily.temperature_2m_max[i] ?? 0);
    const tempMinC = Math.round(raw.daily.temperature_2m_min[i] ?? 0);
    const rainfallMm = Number((raw.daily.precipitation_sum[i] ?? 0).toFixed(1));
    const rainOnlyMm = Number((raw.daily.rain_sum?.[i] ?? rainfallMm).toFixed(1));
    const rainProbPct = Math.round(raw.daily.precipitation_probability_max?.[i] ?? 0);
    const windKmh = Math.round(raw.daily.wind_speed_10m_max[i] ?? 0);
    const et0Mm = Number((raw.daily.et0_fao_evapotranspiration?.[i] ?? 0).toFixed(2));
    const wmoCode = raw.daily.weather_code[i] ?? 0;

    // Derive daily mean RH from API daily mean or hourly slice for that day (preserving valid 0%)
    const rawDailyRh = raw.daily.relative_humidity_2m_mean?.[i];
    let humidityPct: number | null = isFiniteNumber(rawDailyRh)
      ? Math.round(rawDailyRh)
      : null;
    if (humidityPct === null && raw.hourly.relative_humidity_2m) {
      const dayRh = raw.hourly.relative_humidity_2m
        .slice(i * 24, i * 24 + 24)
        .filter((v): v is number => isFiniteNumber(v));
      if (dayRh.length > 0) {
        humidityPct = Math.round(dayRh.reduce((a, b) => a + b, 0) / dayRh.length);
      }
    }

    return {
      isoDate,
      day,
      dateLabel,
      condition: mapWmoCodeToDailyCondition(wmoCode, tempMaxC, rainfallMm),
      tempMaxC,
      tempMinC,
      rainfallMm,
      rainOnlyMm,
      humidityPct: humidityPct ?? currentRhFallback,
      windKmh,
      rainProbPct,
      et0Mm,
    };
  });

  const weatherCode = isFiniteNumber(raw.current.weather_code)
    ? raw.current.weather_code
    : null;
  const windDirectionDeg = roundNullable(raw.current.wind_direction_10m, 0);

  const current: LiveWeatherForecastPayload['current'] = {
    timeIso: currentTimeIso,
    condition: weatherCode !== null ? mapWmoCodeToText(weatherCode) : 'Unavailable',
    weatherCode,
    tempC: roundNullable(raw.current.temperature_2m, 1),
    feelsLikeC: roundNullable(raw.current.apparent_temperature, 1),
    humidityPct: currentRhFallback,
    precipitationNowMm: roundNullable(raw.current.precipitation, 1),
    rainNowMm: roundNullable(raw.current.rain, 1),
    rainfall24hMm,
    windKmh: roundNullable(raw.current.wind_speed_10m, 0),
    windDirectionDeg,
    windDir: isFiniteNumber(raw.current.wind_direction_10m)
      ? degreesToCompass(raw.current.wind_direction_10m)
      : null,
    uvIndex,
    soilMoisturePct,
    et0TodayMm: roundNullable(raw.daily.et0_fao_evapotranspiration?.[0], 2),
    surfacePressureHpa: roundNullable(raw.current.surface_pressure, 0),
  };

  return {
    source: 'open-meteo-forecast',
    coordinates: {
      latitude: raw.latitude,
      longitude: raw.longitude,
      elevationM: roundNullable(raw.elevation, 0),
      timezone: raw.timezone,
    },
    fetchedAtIso: new Date().toISOString(),
    current,
    daily,
    extremeIndicators: deriveAgroIndicators(current, daily),
  };
}

async function fetchRawOpenMeteoForecast(params: {
  latitude: number;
  longitude: number;
  forecastDays: number;
  timezone: string;
}): Promise<RawOpenMeteoForecast> {
  const cacheKey = `${params.latitude}:${params.longitude}:${params.forecastDays}:${params.timezone}`;
  const cached = rawForecastCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const existingPromise = inFlightRawForecast.get(cacheKey);
  if (existingPromise) {
    return existingPromise;
  }

  const query = new URLSearchParams({
    latitude: String(params.latitude),
    longitude: String(params.longitude),
    current: [
      'temperature_2m',
      'relative_humidity_2m',
      'apparent_temperature',
      'precipitation',
      'rain',
      'weather_code',
      'wind_speed_10m',
      'wind_gusts_10m',
      'wind_direction_10m',
      'surface_pressure',
    ].join(','),
    hourly: [
      'temperature_2m',
      'relative_humidity_2m',
      'precipitation',
      'wind_speed_10m',
      'wind_gusts_10m',
      'soil_moisture_0_to_7cm',
      'uv_index',
      'et0_fao_evapotranspiration',
    ].join(','),
    daily: [
      'weather_code',
      'temperature_2m_max',
      'temperature_2m_min',
      'precipitation_sum',
      'rain_sum',
      'precipitation_probability_max',
      'wind_speed_10m_max',
      'wind_gusts_10m_max',
      'et0_fao_evapotranspiration',
      'relative_humidity_2m_mean',
    ].join(','),
    forecast_days: String(params.forecastDays),
    timezone: params.timezone,
  });

  const promise = fetchJsonWithTimeout<RawOpenMeteoForecast>(
    `${OPEN_METEO_FORECAST_URL}?${query.toString()}`
  )
    .then((raw) => {
      rawForecastCache.set(cacheKey, {
        expiresAt: Date.now() + CACHE_TTL_MS,
        value: raw,
      });
      return raw;
    })
    .finally(() => {
      inFlightRawForecast.delete(cacheKey);
    });

  inFlightRawForecast.set(cacheKey, promise);
  return promise;
}

export async function fetchOpenMeteoForecast(params: {
  latitude: number;
  longitude: number;
  forecastDays?: number;
  timezone?: string;
}): Promise<LiveWeatherForecastPayload> {
  const days = params.forecastDays ?? 7;
  const timezone = params.timezone ?? DEFAULT_TIMEZONE;
  const cacheKey = `${params.latitude}:${params.longitude}:${days}:${timezone}`;

  const cached = forecastCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const raw = await fetchRawOpenMeteoForecast({
    latitude: params.latitude,
    longitude: params.longitude,
    forecastDays: days,
    timezone,
  });

  const payload = parseOpenMeteoForecastResponse(raw);

  forecastCache.set(cacheKey, {
    expiresAt: Date.now() + CACHE_TTL_MS,
    value: payload,
  });

  return payload;
}

export async function fetchOpenMeteoRiskWeather(params: {
  latitude: number;
  longitude: number;
  forecastDays?: number;
  timezone?: string;
}): Promise<{
  raw: RawOpenMeteoForecast;
  payload: LiveWeatherForecastPayload;
  soilMoistureProxy: SoilMoistureProxyMeta;
}> {
  const days = params.forecastDays ?? 14;
  const timezone = params.timezone ?? DEFAULT_TIMEZONE;
  const raw = await fetchRawOpenMeteoForecast({
    latitude: params.latitude,
    longitude: params.longitude,
    forecastDays: days,
    timezone,
  });
  const payload = parseOpenMeteoForecastResponse(raw);
  const soilMoistureProxy = extractLatestSoilMoistureProxy(raw);
  return { raw, payload, soilMoistureProxy };
}

export interface RawOpenMeteoArchive {
  latitude: number;
  longitude: number;
  elevation?: number | null;
  timezone: string;
  daily: {
    time: string[];
    temperature_2m_max: Array<number | null>;
    temperature_2m_min: Array<number | null>;
    temperature_2m_mean?: Array<number | null>;
    precipitation_sum: Array<number | null>;
    rain_sum?: Array<number | null>;
    wind_speed_10m_max: Array<number | null>;
    et0_fao_evapotranspiration?: Array<number | null>;
    relative_humidity_2m_mean?: Array<number | null>;
  };
}

export function parseOpenMeteoHistoricalResponse(
  raw: RawOpenMeteoArchive,
  startDate: string,
  endDate: string
): HistoricalWeatherPayload {
  if (!raw?.daily?.time?.length) {
    throw new OpenMeteoServiceError(
      'Open-Meteo archive returned no daily records for this range.',
      502
    );
  }

  const daily: HistoricalWeatherDay[] = raw.daily.time.map((isoDate, i) => {
    const { dateLabel } = formatShortDate(isoDate);
    const tempMaxC = Number((raw.daily.temperature_2m_max[i] ?? 0).toFixed(1));
    const tempMinC = Number((raw.daily.temperature_2m_min[i] ?? 0).toFixed(1));
    const tempMeanC = Number(
      (raw.daily.temperature_2m_mean?.[i] ?? (tempMaxC + tempMinC) / 2).toFixed(1)
    );
    const precipitationMm = Number((raw.daily.precipitation_sum[i] ?? 0).toFixed(1));
    const rainMm = Number((raw.daily.rain_sum?.[i] ?? precipitationMm).toFixed(1));
    const windMaxKmh = Math.round(raw.daily.wind_speed_10m_max[i] ?? 0);
    const humidityMeanPct = Math.round(raw.daily.relative_humidity_2m_mean?.[i] ?? 0);
    const et0Mm = Number((raw.daily.et0_fao_evapotranspiration?.[i] ?? 0).toFixed(2));

    return {
      isoDate,
      dateLabel,
      tempMaxC,
      tempMinC,
      tempMeanC,
      precipitationMm,
      rainMm,
      windMaxKmh,
      humidityMeanPct,
      et0Mm,
    };
  });

  const daysCount = daily.length || 1;
  const totalPrecipitationMm = Number(
    daily.reduce((s, d) => s + d.precipitationMm, 0).toFixed(1)
  );
  const totalRainMm = Number(daily.reduce((s, d) => s + d.rainMm, 0).toFixed(1));
  const avgTempMaxC = Number(
    (daily.reduce((s, d) => s + d.tempMaxC, 0) / daysCount).toFixed(1)
  );
  const avgTempMinC = Number(
    (daily.reduce((s, d) => s + d.tempMinC, 0) / daysCount).toFixed(1)
  );
  const avgHumidityPct = Math.round(
    daily.reduce((s, d) => s + d.humidityMeanPct, 0) / daysCount
  );
  const totalEt0Mm = Number(daily.reduce((s, d) => s + d.et0Mm, 0).toFixed(1));
  const dryDaysCount = daily.filter((d) => d.precipitationMm < 1).length;
  const heavyRainDaysCount = daily.filter((d) => d.precipitationMm >= 45).length;

  return {
    source: 'open-meteo-archive',
    coordinates: {
      latitude: raw.latitude,
      longitude: raw.longitude,
      elevationM: roundNullable(raw.elevation, 0) ?? 0,
      timezone: raw.timezone,
    },
    startDate,
    endDate,
    fetchedAtIso: new Date().toISOString(),
    summary: {
      daysCount: daily.length,
      totalPrecipitationMm,
      totalRainMm,
      avgTempMaxC,
      avgTempMinC,
      avgHumidityPct,
      totalEt0Mm,
      dryDaysCount,
      heavyRainDaysCount,
    },
    daily,
  };
}

export async function fetchOpenMeteoHistorical(params: {
  latitude: number;
  longitude: number;
  startDate: string;
  endDate: string;
  timezone?: string;
}): Promise<HistoricalWeatherPayload> {
  const timezone = params.timezone ?? DEFAULT_TIMEZONE;
  const cacheKey = `${params.latitude}:${params.longitude}:${params.startDate}:${params.endDate}:${timezone}`;

  const cached = historicalCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const existingPromise = inFlightHistorical.get(cacheKey);
  if (existingPromise) {
    return existingPromise;
  }

  const query = new URLSearchParams({
    latitude: String(params.latitude),
    longitude: String(params.longitude),
    start_date: params.startDate,
    end_date: params.endDate,
    daily: [
      'temperature_2m_max',
      'temperature_2m_min',
      'temperature_2m_mean',
      'precipitation_sum',
      'rain_sum',
      'wind_speed_10m_max',
      'et0_fao_evapotranspiration',
      'relative_humidity_2m_mean',
    ].join(','),
    timezone,
  });

  const promise = fetchJsonWithTimeout<RawOpenMeteoArchive>(
    `${OPEN_METEO_ARCHIVE_URL}?${query.toString()}`
  )
    .then((raw) => {
      const payload = parseOpenMeteoHistoricalResponse(
        raw,
        params.startDate,
        params.endDate
      );

      historicalCache.set(cacheKey, {
        expiresAt: Date.now() + CACHE_TTL_MS,
        value: payload,
      });

      return payload;
    })
    .finally(() => {
      inFlightHistorical.delete(cacheKey);
    });

  inFlightHistorical.set(cacheKey, promise);
  return promise;
}
