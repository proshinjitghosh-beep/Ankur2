import type {
  DailyForecastPoint,
  ExtremeWeatherIndicator,
  HistoricalWeatherDay,
  HistoricalWeatherPayload,
  LiveWeatherForecastPayload,
  RiskSeverity,
} from '../../src/types/agri.ts';

const OPEN_METEO_FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const OPEN_METEO_ARCHIVE_URL = 'https://archive-api.open-meteo.com/v1/archive';
const DEFAULT_TIMEZONE = 'Asia/Dhaka';
const REQUEST_TIMEOUT_MS = 10_000;
const CACHE_TTL_MS = 5 * 60 * 1000;

interface CacheEntry<T> {
  expiresAt: number;
  value: T;
}

const forecastCache = new Map<string, CacheEntry<LiveWeatherForecastPayload>>();
const historicalCache = new Map<string, CacheEntry<HistoricalWeatherPayload>>();

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

export function validateHistoricalRange(
  rawStartDate: unknown,
  rawEndDate: unknown
): { startDate: string; endDate: string } {
  // Open-Meteo ERA5 archive typically has a ~5-day operational lag
  const maxAvailableDate = new Date();
  maxAvailableDate.setUTCDate(maxAvailableDate.getUTCDate() - 5);

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

  const startMs = Date.parse(`${startDate}T00:00:00Z`);
  const endMs = Date.parse(`${endDate}T00:00:00Z`);
  if (Number.isNaN(startMs) || Number.isNaN(endMs)) {
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

function deriveAgroIndicators(
  current: LiveWeatherForecastPayload['current'],
  daily: DailyForecastPoint[]
): ExtremeWeatherIndicator[] {
  const next3d = daily.slice(0, 3);
  const maxRainProb3d = Math.max(0, ...next3d.map((d) => d.rainProbPct));
  const rain3dTotal = Number(next3d.reduce((sum, d) => sum + d.rainfallMm, 0).toFixed(1));
  const peakFeelsLike = Math.max(current.feelsLikeC, ...next3d.map((d) => d.tempMaxC + 2));

  const rainStatus: RiskSeverity =
    rain3dTotal >= 75 || maxRainProb3d >= 80
      ? 'High'
      : rain3dTotal >= 25 || maxRainProb3d >= 50
      ? 'Medium'
      : 'Low';

  const heatStatus: RiskSeverity =
    peakFeelsLike >= 37 ? 'High' : peakFeelsLike >= 33 ? 'Medium' : 'Low';

  const humidityStatus: RiskSeverity =
    current.humidityPct >= 85 ? 'High' : current.humidityPct >= 75 ? 'Medium' : 'Low';

  const moistureStatus: RiskSeverity =
    current.soilMoisturePct <= 35 || current.soilMoisturePct >= 88
      ? 'High'
      : current.soilMoisturePct <= 48 || current.soilMoisturePct >= 80
      ? 'Medium'
      : 'Low';

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
      value: `${Math.round(peakFeelsLike)}°C`,
      status: heatStatus,
      thresholdNote:
        heatStatus === 'High'
          ? 'Above 37°C heat stress threshold; avoid midday spraying'
          : heatStatus === 'Medium'
          ? 'Warm afternoon canopy temperatures expected'
          : 'Temperatures within comfortable crop development band',
    },
    {
      id: 'live-canopy-rh',
      label: 'Relative Humidity & Leaf Wetness',
      value: `${Math.round(current.humidityPct)}%`,
      status: humidityStatus,
      thresholdNote:
        humidityStatus === 'High'
          ? 'Sustained >85% RH favors rice blast & potato late blight'
          : humidityStatus === 'Medium'
          ? 'Moderate morning dew; scout lower foliage twice weekly'
          : 'Drier canopy air limits fungal spore spread',
    },
    {
      id: 'live-soil-moisture',
      label: 'Topsoil Moisture (0–7 cm) & ET0',
      value: `${Math.round(current.soilMoisturePct)}% · ${current.et0TodayMm.toFixed(1)} mm`,
      status: moistureStatus,
      thresholdNote:
        current.soilMoisturePct <= 35
          ? 'Dry root-zone topsoil; supplemental irrigation advised'
          : current.soilMoisturePct >= 85
          ? 'Saturated topsoil; hold irrigation and clear drains'
          : 'Adequate root-zone moisture balance',
    },
  ];
}

async function fetchJsonWithTimeout<T>(url: string): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new OpenMeteoServiceError(
        `Open-Meteo API returned HTTP ${response.status}`,
        502,
        errorText.slice(0, 300)
      );
    }
    return (await response.json()) as T;
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

interface RawOpenMeteoForecast {
  latitude: number;
  longitude: number;
  elevation: number;
  timezone: string;
  current: {
    time: string;
    temperature_2m: number;
    relative_humidity_2m: number;
    apparent_temperature: number;
    precipitation: number;
    rain: number;
    weather_code: number;
    wind_speed_10m: number;
    wind_direction_10m: number;
    surface_pressure?: number;
  };
  hourly: {
    time: string[];
    soil_moisture_0_to_7cm?: Array<number | null>;
    uv_index?: Array<number | null>;
    precipitation?: Array<number | null>;
    relative_humidity_2m?: Array<number | null>;
  };
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_sum: number[];
    rain_sum?: number[];
    precipitation_probability_max?: Array<number | null>;
    wind_speed_10m_max: number[];
    et0_fao_evapotranspiration?: Array<number | null>;
    relative_humidity_2m_mean?: Array<number | null>;
  };
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
      'wind_direction_10m',
      'surface_pressure',
    ].join(','),
    hourly: [
      'relative_humidity_2m',
      'soil_moisture_0_to_7cm',
      'uv_index',
      'precipitation',
    ].join(','),
    daily: [
      'weather_code',
      'temperature_2m_max',
      'temperature_2m_min',
      'precipitation_sum',
      'rain_sum',
      'precipitation_probability_max',
      'wind_speed_10m_max',
      'et0_fao_evapotranspiration',
      'relative_humidity_2m_mean',
    ].join(','),
    forecast_days: String(days),
    timezone,
  });

  const raw = await fetchJsonWithTimeout<RawOpenMeteoForecast>(
    `${OPEN_METEO_FORECAST_URL}?${query.toString()}`
  );

  if (!raw?.current || !raw?.daily?.time?.length || !raw?.hourly?.time?.length) {
    throw new OpenMeteoServiceError(
      'Open-Meteo forecast response was incomplete.',
      502
    );
  }

  // Match nearest hourly index to current time
  const currentHourPrefix = raw.current.time.slice(0, 13);
  const matchedIdx = raw.hourly.time.findIndex((t) => t.startsWith(currentHourPrefix));
  const hourIdx = matchedIdx >= 0 ? matchedIdx : 0;

  // Convert volumetric soil moisture (typically 0.05..0.50 m³/m³) to percentage scale (0..100%)
  const rawSoilVol = raw.hourly.soil_moisture_0_to_7cm?.[hourIdx] ?? 0.3;
  const soilMoisturePct = Math.max(
    10,
    Math.min(98, Math.round((rawSoilVol / 0.48) * 100))
  );

  const uvIndex = Math.round(raw.hourly.uv_index?.[hourIdx] ?? 0);

  // Sum trailing 24 hourly rainfall values up to current hour, or fall back to today's daily precipitation_sum
  let rainfall24hMm = raw.daily.precipitation_sum[0] ?? 0;
  if (raw.hourly.precipitation && hourIdx > 0) {
    const startIdx = Math.max(0, hourIdx - 23);
    const slice = raw.hourly.precipitation.slice(startIdx, hourIdx + 1);
    const sum = slice.reduce<number>((acc, v) => acc + (typeof v === 'number' ? v : 0), 0);
    rainfall24hMm = Number(sum.toFixed(1));
  }

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

    // Derive daily mean RH from API daily mean or hourly slice for that day
    let humidityPct = Math.round(raw.daily.relative_humidity_2m_mean?.[i] ?? 0);
    if (!humidityPct && raw.hourly.relative_humidity_2m) {
      const dayRh = raw.hourly.relative_humidity_2m.slice(i * 24, i * 24 + 24).filter(
        (v): v is number => typeof v === 'number'
      );
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
      humidityPct: humidityPct || Math.round(raw.current.relative_humidity_2m),
      windKmh,
      rainProbPct,
      et0Mm,
    };
  });

  const current: LiveWeatherForecastPayload['current'] = {
    timeIso: raw.current.time,
    condition: mapWmoCodeToText(raw.current.weather_code),
    weatherCode: raw.current.weather_code,
    tempC: Number(raw.current.temperature_2m.toFixed(1)),
    feelsLikeC: Number(raw.current.apparent_temperature.toFixed(1)),
    humidityPct: Math.round(raw.current.relative_humidity_2m),
    precipitationNowMm: Number(raw.current.precipitation.toFixed(1)),
    rainNowMm: Number(raw.current.rain.toFixed(1)),
    rainfall24hMm,
    windKmh: Math.round(raw.current.wind_speed_10m),
    windDirectionDeg: Math.round(raw.current.wind_direction_10m),
    windDir: degreesToCompass(raw.current.wind_direction_10m),
    uvIndex,
    soilMoisturePct,
    et0TodayMm: Number((raw.daily.et0_fao_evapotranspiration?.[0] ?? 0).toFixed(2)),
    surfacePressureHpa: Math.round(raw.current.surface_pressure ?? 1013),
  };

  const payload: LiveWeatherForecastPayload = {
    source: 'open-meteo-forecast',
    coordinates: {
      latitude: raw.latitude,
      longitude: raw.longitude,
      elevationM: Math.round(raw.elevation),
      timezone: raw.timezone,
    },
    fetchedAtIso: new Date().toISOString(),
    current,
    daily,
    extremeIndicators: deriveAgroIndicators(current, daily),
  };

  forecastCache.set(cacheKey, {
    expiresAt: Date.now() + CACHE_TTL_MS,
    value: payload,
  });

  return payload;
}

interface RawOpenMeteoArchive {
  latitude: number;
  longitude: number;
  elevation: number;
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

  const raw = await fetchJsonWithTimeout<RawOpenMeteoArchive>(
    `${OPEN_METEO_ARCHIVE_URL}?${query.toString()}`
  );

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

  const payload: HistoricalWeatherPayload = {
    source: 'open-meteo-archive',
    coordinates: {
      latitude: raw.latitude,
      longitude: raw.longitude,
      elevationM: Math.round(raw.elevation),
      timezone: raw.timezone,
    },
    startDate: params.startDate,
    endDate: params.endDate,
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

  historicalCache.set(cacheKey, {
    expiresAt: Date.now() + CACHE_TTL_MS,
    value: payload,
  });

  return payload;
}
