import type {
  ForecastWindow,
  HistoricalBaselineContext,
  SoilMoistureProxyMeta,
} from '../../../src/types/agri.ts';
import {
  fetchOpenMeteoHistorical,
  getArchiveDatasetLagDays,
  type RawOpenMeteoForecast,
} from '../openMeteoService.ts';
import type { ExtractedWeatherFeatures } from './types.ts';

function isFiniteNum(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

export function windowToDaysCount(window: ForecastWindow): number {
  if (window === '24h') return 1;
  if (window === '72h') return 3;
  if (window === '7d') return 7;
  return 14;
}

export function extractWeatherFeatures(params: {
  raw: RawOpenMeteoForecast;
  soilMoistureProxy: SoilMoistureProxyMeta;
  historicalBaseline: HistoricalBaselineContext;
  window: ForecastWindow;
  dayStartOffset?: number;
  dayCountOverride?: number;
}): ExtractedWeatherFeatures {
  const { raw, soilMoistureProxy, historicalBaseline, window } = params;
  const startDay = params.dayStartOffset ?? 0;
  const daysRequested = params.dayCountOverride ?? windowToDaysCount(window);
  const availableDays = raw.daily.time.length;
  const endDay = Math.min(availableDays, startDay + daysRequested);
  const windowDaysCount = Math.max(0, endDay - startDay);

  const dailyTmax = (raw.daily.temperature_2m_max ?? []).slice(startDay, endDay).filter(isFiniteNum);
  const dailyTmin = (raw.daily.temperature_2m_min ?? []).slice(startDay, endDay).filter(isFiniteNum);
  const dailyPrecipRaw = (raw.daily.precipitation_sum ?? []).slice(startDay, endDay);
  const dailyPrecip = dailyPrecipRaw.filter(isFiniteNum);
  const dailyPrecipProb = (raw.daily.precipitation_probability_max ?? [])
    .slice(startDay, endDay)
    .filter(isFiniteNum);
  const dailyEt0 = (raw.daily.et0_fao_evapotranspiration ?? [])
    .slice(startDay, endDay)
    .filter(isFiniteNum);
  const dailyWindMax = (raw.daily.wind_speed_10m_max ?? [])
    .slice(startDay, endDay)
    .filter(isFiniteNum);
  const dailyGustMax = (raw.daily.wind_gusts_10m_max ?? [])
    .slice(startDay, endDay)
    .filter(isFiniteNum);
  const dailyRhMean = (raw.daily.relative_humidity_2m_mean ?? [])
    .slice(startDay, endDay)
    .filter(isFiniteNum);

  const startHour = startDay * 24;
  const endHour = endDay * 24;
  const hourlyTemps = (raw.hourly.temperature_2m ?? []).slice(startHour, endHour);
  const hourlyRhs = (raw.hourly.relative_humidity_2m ?? []).slice(startHour, endHour);
  const hourlyGusts = (raw.hourly.wind_gusts_10m ?? [])
    .slice(startHour, endHour)
    .filter(isFiniteNum);

  const hasHourlyTemps = hourlyTemps.some(isFiniteNum);
  const hasHourlyRh = hourlyRhs.some(isFiniteNum);

  const maxTempMaxC =
    dailyTmax.length > 0
      ? Number(Math.max(...dailyTmax).toFixed(1))
      : isFiniteNum(raw.current.temperature_2m)
      ? Number(raw.current.temperature_2m.toFixed(1))
      : null;

  const maxNightTempMinC =
    dailyTmin.length > 0 ? Number(Math.max(...dailyTmin).toFixed(1)) : null;
  const minNightTempMinC =
    dailyTmin.length > 0 ? Number(Math.min(...dailyTmin).toFixed(1)) : null;

  const rain24hMaxMm =
    dailyPrecip.length > 0 ? Number(Math.max(...dailyPrecip).toFixed(1)) : null;

  let rain72hMaxMm: number | null = null;
  if (dailyPrecip.length > 0) {
    if (dailyPrecip.length <= 3) {
      rain72hMaxMm = Number(
        dailyPrecip.reduce((sum, v) => sum + v, 0).toFixed(1)
      );
    } else {
      let best3d = 0;
      for (let i = 0; i <= dailyPrecip.length - 3; i += 1) {
        const s3 = dailyPrecip[i] + dailyPrecip[i + 1] + dailyPrecip[i + 2];
        if (s3 > best3d) best3d = s3;
      }
      rain72hMaxMm = Number(best3d.toFixed(1));
    }
  }

  const rainWindowTotalMm =
    dailyPrecip.length > 0
      ? Number(dailyPrecip.reduce((s, v) => s + v, 0).toFixed(1))
      : null;

  const maxRainProbPct =
    dailyPrecipProb.length > 0 ? Math.round(Math.max(...dailyPrecipProb)) : null;

  const et0WindowTotalMm =
    dailyEt0.length > 0
      ? Number(dailyEt0.reduce((s, v) => s + v, 0).toFixed(2))
      : null;

  const netWaterDeficitMm =
    et0WindowTotalMm !== null && rainWindowTotalMm !== null
      ? Number((et0WindowTotalMm - rainWindowTotalMm).toFixed(1))
      : null;

  const maxSustainedWindKmh =
    dailyWindMax.length > 0
      ? Math.round(Math.max(...dailyWindMax))
      : isFiniteNum(raw.current.wind_speed_10m)
      ? Math.round(raw.current.wind_speed_10m)
      : null;

  const gustCandidates = [
    ...dailyGustMax,
    ...hourlyGusts,
    ...(isFiniteNum(raw.current.wind_gusts_10m) ? [raw.current.wind_gusts_10m] : []),
  ];
  const maxWindGustKmh =
    gustCandidates.length > 0 ? Math.round(Math.max(...gustCandidates)) : null;

  const countHoursTempAtLeast = (cutoffC: number): number | null => {
    if (!hasHourlyTemps) return null;
    let count = 0;
    for (const t of hourlyTemps) {
      if (isFiniteNum(t) && t >= cutoffC) count += 1;
    }
    return count;
  };

  const maxConsecutiveWetHours = (
    rhCutoffPct: number,
    tempMinC: number,
    tempMaxC: number
  ): number | null => {
    if (!hasHourlyRh) return null;
    let best = 0;
    let streak = 0;
    const len = hourlyRhs.length;
    for (let i = 0; i < len; i += 1) {
      const rh = hourlyRhs[i];
      const temp = hourlyTemps[i];
      const rhOk = isFiniteNum(rh) && rh >= rhCutoffPct;
      const tempOk = !hasHourlyTemps || (isFiniteNum(temp) && temp >= tempMinC && temp <= tempMaxC);
      if (rhOk && tempOk) {
        streak += 1;
        if (streak > best) best = streak;
      } else {
        streak = 0;
      }
    }
    return best;
  };

  const totalWetHours = (
    rhCutoffPct: number,
    tempMinC: number,
    tempMaxC: number
  ): number | null => {
    if (!hasHourlyRh) return null;
    let total = 0;
    for (let i = 0; i < hourlyRhs.length; i += 1) {
      const rh = hourlyRhs[i];
      const temp = hourlyTemps[i];
      const rhOk = isFiniteNum(rh) && rh >= rhCutoffPct;
      const tempOk = !hasHourlyTemps || (isFiniteNum(temp) && temp >= tempMinC && temp <= tempMaxC);
      if (rhOk && tempOk) total += 1;
    }
    return total;
  };

  const humidityAvailable = hasHourlyRh || dailyRhMean.length > 0;
  const gustAvailable = maxWindGustKmh !== null;
  const soilAvailable = soilMoistureProxy.rawM3PerM3 !== null;
  const historicalOk = historicalBaseline.source === 'open-meteo-archive';

  const variableAvailability = {
    dailyTempMax: dailyTmax.length > 0,
    dailyTempMin: dailyTmin.length > 0,
    hourlyTemp: hasHourlyTemps,
    humidity: humidityAvailable,
    dailyPrecipSum: dailyPrecip.length > 0,
    dailyPrecipProb: dailyPrecipProb.length > 0,
    dailyEt0: dailyEt0.length > 0,
    dailyWindMax: dailyWindMax.length > 0,
    windGusts: gustAvailable,
    soilMoistureProxy: soilAvailable,
    historicalContext: historicalOk,
  };

  const missingVariables: string[] = [];
  if (!variableAvailability.dailyTempMax) missingVariables.push('daily.temperature_2m_max');
  if (!variableAvailability.dailyTempMin) missingVariables.push('daily.temperature_2m_min');
  if (!variableAvailability.hourlyTemp) missingVariables.push('hourly.temperature_2m');
  if (!variableAvailability.humidity) missingVariables.push('hourly.relative_humidity_2m');
  if (!variableAvailability.dailyPrecipSum) missingVariables.push('daily.precipitation_sum');
  if (!variableAvailability.dailyPrecipProb) missingVariables.push('daily.precipitation_probability_max');
  if (!variableAvailability.dailyEt0) missingVariables.push('daily.et0_fao_evapotranspiration');
  if (!variableAvailability.dailyWindMax) missingVariables.push('daily.wind_speed_10m_max');
  if (!variableAvailability.windGusts) missingVariables.push('daily.wind_gusts_10m_max');
  if (!variableAvailability.soilMoistureProxy) missingVariables.push('hourly.soil_moisture_0_to_7cm');
  if (!variableAvailability.historicalContext) missingVariables.push('archive.historical_baseline');

  return {
    window,
    windowDaysCount,
    maxTempMaxC,
    maxNightTempMinC,
    minNightTempMinC,
    countHoursTempAtLeast,
    maxConsecutiveWetHours,
    totalWetHours,
    rain24hMaxMm,
    rain72hMaxMm,
    rainWindowTotalMm,
    maxRainProbPct,
    et0WindowTotalMm,
    netWaterDeficitMm,
    maxSustainedWindKmh,
    maxWindGustKmh,
    soilMoistureProxy,
    historicalBaseline,
    variableAvailability,
    missingVariables,
  };
}

export async function fetchContextualHistoricalBaseline(params: {
  latitude: number;
  longitude: number;
  enabled: boolean;
}): Promise<HistoricalBaselineContext> {
  const lagDays = getArchiveDatasetLagDays('era5');
  if (!params.enabled) {
    return {
      source: 'unavailable',
      dataset: 'era5',
      archiveLagDays: lagDays,
      startDate: null,
      endDate: null,
      totalPrecipitationMm: null,
      totalEt0Mm: null,
      dryDaysCount: null,
      heavyRainDaysCount: null,
      roleNote: 'Historical archive baseline omitted by request parameter includeHistorical=false.',
    };
  }

  const endDateObj = new Date();
  endDateObj.setUTCDate(endDateObj.getUTCDate() - lagDays);
  const startDateObj = new Date(endDateObj);
  startDateObj.setUTCDate(startDateObj.getUTCDate() - 29);

  const startDate = startDateObj.toISOString().slice(0, 10);
  const endDate = endDateObj.toISOString().slice(0, 10);

  try {
    const hist = await fetchOpenMeteoHistorical({
      latitude: params.latitude,
      longitude: params.longitude,
      startDate,
      endDate,
    });
    return {
      source: 'open-meteo-archive',
      dataset: 'era5',
      archiveLagDays: lagDays,
      startDate: hist.startDate,
      endDate: hist.endDate,
      totalPrecipitationMm: hist.summary.totalPrecipitationMm,
      totalEt0Mm: hist.summary.totalEt0Mm,
      dryDaysCount: hist.summary.dryDaysCount,
      heavyRainDaysCount: hist.summary.heavyRainDaysCount,
      roleNote:
        'Contextual trailing 30-day antecedent baseline only; not used as proof of future risk.',
    };
  } catch (err) {
    return {
      source: 'unavailable',
      dataset: 'era5',
      archiveLagDays: lagDays,
      startDate,
      endDate,
      totalPrecipitationMm: null,
      totalEt0Mm: null,
      dryDaysCount: null,
      heavyRainDaysCount: null,
      roleNote: 'Historical baseline could not be retrieved; forecast assessment proceeded independently.',
      unavailableReason: err instanceof Error ? err.message : 'Archive API unavailable',
    };
  }
}
