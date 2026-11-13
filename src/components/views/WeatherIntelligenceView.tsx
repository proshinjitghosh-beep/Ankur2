import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Calendar,
  Cloud,
  CloudLightning,
  CloudRain,
  Droplets,
  Gauge,
  Loader2,
  MapPin,
  RefreshCw,
  Sun,
  Wind,
} from 'lucide-react';
import { fetchHistoricalByCoordinates } from '../../services/weatherApi';
import {
  DailyForecastPoint,
  DistrictProfile,
  HistoricalWeatherPayload,
  UserPreferences,
} from '../../types/agri';
import { RainfallTrendChart, TemperatureTrendChart } from '../charts/AgriCharts';
import { formatTemp, SeverityIndicator } from '../common/SeverityIndicator';

interface WeatherIntelligenceViewProps {
  preferences: UserPreferences;
  liveDistrict: DistrictProfile;
  weatherLoading: boolean;
  weatherError: string | null;
  onRefreshWeather: () => void;
}

function getConditionIcon(condition: DailyForecastPoint['condition']) {
  switch (condition) {
    case 'Clear':
      return <Sun className="w-4 h-4 text-amber-600 shrink-0" aria-hidden="true" />;
    case 'Partly Cloudy':
      return <Cloud className="w-4 h-4 text-[#526056] shrink-0" aria-hidden="true" />;
    case 'Showers':
    case 'Heavy Rain':
      return <CloudRain className="w-4 h-4 text-emerald-700 shrink-0" aria-hidden="true" />;
    case 'Thunderstorm':
      return <CloudLightning className="w-4 h-4 text-amber-700 shrink-0" aria-hidden="true" />;
    case 'Heat Haze':
      return <Sun className="w-4 h-4 text-red-600 shrink-0" aria-hidden="true" />;
  }
}

function getDefaultHistoricalDates(): { startDate: string; endDate: string; maxDate: string } {
  const maxAvailable = new Date();
  maxAvailable.setUTCDate(maxAvailable.getUTCDate() - 5);
  const start = new Date(maxAvailable);
  start.setUTCDate(start.getUTCDate() - 29);

  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: maxAvailable.toISOString().slice(0, 10),
    maxDate: maxAvailable.toISOString().slice(0, 10),
  };
}

export const WeatherIntelligenceView: React.FC<WeatherIntelligenceViewProps> = ({
  preferences,
  liveDistrict,
  weatherLoading,
  weatherError,
  onRefreshWeather,
}) => {
  const [horizon, setHorizon] = useState<'7d' | '14d' | 'historical'>('7d');
  const district = liveDistrict;

  const defaultDates = useMemo(() => getDefaultHistoricalDates(), []);
  const [histLat, setHistLat] = useState<string>(String(district.latitude));
  const [histLon, setHistLon] = useState<string>(String(district.longitude));
  const [startDate, setStartDate] = useState<string>(defaultDates.startDate);
  const [endDate, setEndDate] = useState<string>(defaultDates.endDate);
  const [historicalData, setHistoricalData] = useState<HistoricalWeatherPayload | null>(null);
  const [historicalLoading, setHistoricalLoading] = useState(false);
  const [historicalError, setHistoricalError] = useState<string | null>(null);

  // Sync coordinate inputs when the active Bangladesh district changes
  useEffect(() => {
    setHistLat(String(district.latitude));
    setHistLon(String(district.longitude));
  }, [district.id, district.latitude, district.longitude]);

  const loadHistoricalWeather = useCallback(
    async (latVal: number, lonVal: number, startVal: string, endVal: string, signal?: AbortSignal) => {
      setHistoricalLoading(true);
      setHistoricalError(null);
      try {
        const data = await fetchHistoricalByCoordinates({
          latitude: latVal,
          longitude: lonVal,
          startDate: startVal,
          endDate: endVal,
          signal,
        });
        setHistoricalData(data);
      } catch (err) {
        if (signal?.aborted) return;
        setHistoricalError(
          err instanceof Error ? err.message : 'Unable to fetch historical Open-Meteo archive data'
        );
      } finally {
        if (!signal?.aborted) {
          setHistoricalLoading(false);
        }
      }
    },
    []
  );

  // Auto-load historical archive when user enters Historical mode or switches district while in it
  useEffect(() => {
    if (horizon !== 'historical') return;
    const controller = new AbortController();
    loadHistoricalWeather(
      district.latitude,
      district.longitude,
      startDate,
      endDate,
      controller.signal
    );
    return () => controller.abort();
  }, [horizon, district.id, district.latitude, district.longitude, startDate, endDate, loadHistoricalWeather]);

  const handleHistoricalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedLat = Number(histLat);
    const parsedLon = Number(histLon);
    if (!Number.isFinite(parsedLat) || parsedLat < -90 || parsedLat > 90) {
      setHistoricalError('Latitude must be a valid number between -90 and 90.');
      return;
    }
    if (!Number.isFinite(parsedLon) || parsedLon < -180 || parsedLon > 180) {
      setHistoricalError('Longitude must be a valid number between -180 and 180.');
      return;
    }
    loadHistoricalWeather(parsedLat, parsedLon, startDate, endDate);
  };

  const forecastSlice =
    horizon === '7d'
      ? district.forecast14Days.slice(0, 7)
      : district.forecast14Days;

  const totalRainPeriod = Number(
    forecastSlice.reduce((s, d) => s + d.rainfallMm, 0).toFixed(1)
  );
  const peakTemp = Math.max(...forecastSlice.map((d) => d.tempMaxC));
  const avgHumidity = Math.round(
    forecastSlice.reduce((s, d) => s + d.humidityPct, 0) / Math.max(1, forecastSlice.length)
  );

  const historicalChartPoints: DailyForecastPoint[] = useMemo(() => {
    if (!historicalData) return [];
    return historicalData.daily.map((d) => {
      const weekday = new Date(`${d.isoDate}T12:00:00Z`).toLocaleDateString('en-US', {
        weekday: 'short',
        timeZone: 'UTC',
      });
      return {
        isoDate: d.isoDate,
        day: weekday,
        dateLabel: d.dateLabel,
        condition: d.precipitationMm >= 45 ? 'Heavy Rain' : d.precipitationMm >= 3 ? 'Showers' : 'Clear',
        tempMaxC: Math.round(d.tempMaxC),
        tempMinC: Math.round(d.tempMinC),
        rainfallMm: d.precipitationMm,
        rainOnlyMm: d.rainMm,
        humidityPct: d.humidityMeanPct,
        windKmh: d.windMaxKmh,
        rainProbPct: d.precipitationMm > 0 ? 100 : 0,
        et0Mm: d.et0Mm,
      };
    });
  }, [historicalData]);

  return (
    <div className="space-y-6">
      {/* Header & Horizon Switch */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="font-display text-xl sm:text-2xl font-bold text-[#172019]">
              Weather Intelligence · {district.name}
            </h2>
            <span className="inline-flex items-center gap-1 text-xs font-mono tabular-nums px-2 py-0.5 rounded-md bg-[#EBF0EB] text-[#3A473E]">
              <MapPin className="w-3 h-3 text-emerald-700" aria-hidden="true" />
              {district.latitude.toFixed(4)}°N, {district.longitude.toFixed(4)}°E · {district.elevationM} m
            </span>
          </div>
          <p className="text-sm text-[#526056] mt-1">
            {district.agroZone} · {district.riverBasin} ·{' '}
            {weatherLoading && !district.currentWeather.isLive
              ? 'Fetching live Open-Meteo feed…'
              : district.currentWeather.updatedLabel}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-auto">
          <div className="inline-flex items-center p-1 bg-[#EBF0EB] rounded-lg">
            <button
              type="button"
              onClick={() => setHorizon('7d')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                horizon === '7d'
                  ? 'bg-white text-[#172019] shadow-xs'
                  : 'text-[#526056] hover:text-[#172019]'
              }`}
            >
              7-Day Forecast
            </button>
            <button
              type="button"
              onClick={() => setHorizon('14d')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                horizon === '14d'
                  ? 'bg-white text-[#172019] shadow-xs'
                  : 'text-[#526056] hover:text-[#172019]'
              }`}
            >
              14-Day Outlook
            </button>
            <button
              type="button"
              onClick={() => setHorizon('historical')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                horizon === 'historical'
                  ? 'bg-white text-[#172019] shadow-xs'
                  : 'text-[#526056] hover:text-[#172019]'
              }`}
            >
              Historical Weather
            </button>
          </div>

          <button
            type="button"
            onClick={onRefreshWeather}
            disabled={weatherLoading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#DCE3DC] bg-white text-xs font-semibold text-[#172019] hover:bg-[#F1F4EF] disabled:opacity-60 transition-colors"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 text-emerald-700 ${weatherLoading ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
            <span>{weatherLoading ? 'Syncing…' : 'Refresh Live'}</span>
          </button>
        </div>
      </div>

      {weatherError && (
        <div
          role="alert"
          className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-950 flex items-center gap-2.5"
        >
          <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" aria-hidden="true" />
          <span>
            Live Open-Meteo forecast error: {weatherError}. Displaying fallback station data until connection recovers.
          </span>
        </div>
      )}

      {horizon !== 'historical' ? (
        <>
          {/* Current Station Summary Strip */}
          <section className="bg-white border border-[#DCE3DC] rounded-xl p-5 grid grid-cols-2 sm:grid-cols-4 gap-5">
            <div>
              <div className="text-xs text-[#526056]">Current Conditions</div>
              <div className="mt-1 font-display text-xl font-bold text-[#172019] tabular-nums">
                {formatTemp(district.currentWeather.tempC, preferences.tempUnit)}
              </div>
              <div className="text-xs text-[#526056] mt-0.5">
                {district.currentWeather.condition} · Feels{' '}
                {formatTemp(district.currentWeather.feelsLikeC, preferences.tempUnit)}
              </div>
            </div>
            <div>
              <div className="text-xs text-[#526056]">
                Cumulative {horizon === '7d' ? '7-Day' : '14-Day'} Rain
              </div>
              <div className="mt-1 font-display text-xl font-bold text-[#172019] tabular-nums">
                {totalRainPeriod} mm
              </div>
              <div className="text-xs text-[#526056] mt-0.5">
                24h total: {district.currentWeather.rainfall24hMm} mm
                {district.currentWeather.precipitationNowMm !== undefined
                  ? ` · Now ${district.currentWeather.precipitationNowMm} mm`
                  : ''}
              </div>
            </div>
            <div>
              <div className="text-xs text-[#526056]">Peak Forecast High</div>
              <div className="mt-1 font-display text-xl font-bold text-[#172019] tabular-nums">
                {formatTemp(peakTemp, preferences.tempUnit)}
              </div>
              <div className="text-xs text-[#526056] mt-0.5">
                Avg humidity {avgHumidity}% · UV {district.currentWeather.uvIndex}
              </div>
            </div>
            <div>
              <div className="text-xs text-[#526056]">Surface Wind, Soil & ET0</div>
              <div className="mt-1 font-display text-xl font-bold text-[#172019] tabular-nums">
                {district.currentWeather.windKmh} km/h {district.currentWeather.windDir}
              </div>
              <div className="text-xs text-[#526056] mt-0.5">
                Soil {district.currentWeather.soilMoisturePct}%
                {district.currentWeather.et0TodayMm !== undefined
                  ? ` · ET0 ${district.currentWeather.et0TodayMm.toFixed(1)} mm/d`
                  : ''}
              </div>
            </div>
          </section>

          {/* Extreme Weather Indicators */}
          <section aria-label="Extreme Weather Indicators">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display text-base font-semibold text-[#172019]">
                Extreme Weather & Agro-Hazard Indicators
              </h3>
              <span className="text-xs text-[#526056]">
                Thresholds calibrated for Bangladesh crop calendars
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              {district.extremeIndicators.map((ind) => (
                <div
                  key={ind.id}
                  className="bg-white border border-[#DCE3DC] rounded-xl p-5 flex flex-col justify-between gap-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-xs font-medium text-[#526056] leading-snug">
                      {ind.label}
                    </div>
                    <SeverityIndicator severity={ind.status} compact />
                  </div>
                  <div className="font-display text-2xl font-bold text-[#172019] tabular-nums">
                    {ind.value}
                  </div>
                  <p className="text-xs text-[#526056] leading-relaxed">
                    {ind.thresholdNote}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Rainfall & Temperature Trends Charts */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <section className="bg-white border border-[#DCE3DC] rounded-xl p-6">
              <h3 className="font-display text-base font-semibold text-[#172019]">
                Rainfall Trends ({horizon === '7d' ? 'Next 7 Days' : '14-Day Window'})
              </h3>
              <p className="text-xs text-[#526056] mt-0.5 mb-4">
                Daily precipitation volume in millimeters compared against 45 mm heavy rain trigger
              </p>
              <RainfallTrendChart data={forecastSlice} />
            </section>

            <section className="bg-white border border-[#DCE3DC] rounded-xl p-6">
              <h3 className="font-display text-base font-semibold text-[#172019]">
                Temperature Trends ({horizon === '7d' ? 'Next 7 Days' : '14-Day Window'})
              </h3>
              <p className="text-xs text-[#526056] mt-0.5 mb-4">
                Diurnal high/low spread impacting crop pollination, blight dew, and grain fill
              </p>
              <TemperatureTrendChart data={forecastSlice} tempUnit={preferences.tempUnit} />
            </section>
          </div>

          {/* Forecast Data Table */}
          <section className="bg-white border border-[#DCE3DC] rounded-xl p-6">
            <div className="flex items-center justify-between gap-4 pb-4 border-b border-[#EBF0EB]">
              <div>
                <h3 className="font-display text-base font-semibold text-[#172019]">
                  Daily Agro-Meteorological Forecast
                </h3>
                <p className="text-xs text-[#526056] mt-0.5">
                  {district.currentWeather.isLive
                    ? `Live Open-Meteo projections for ${district.name} (${district.soilType})`
                    : `Baseline station projections for ${district.name} (${district.soilType})`}
                </p>
              </div>
              <div className="hidden sm:flex items-center gap-4 text-xs text-[#526056]">
                <span className="inline-flex items-center gap-1">
                  <Droplets className="w-3.5 h-3.5" aria-hidden="true" /> Rain Prob
                </span>
                <span className="inline-flex items-center gap-1">
                  <Gauge className="w-3.5 h-3.5" aria-hidden="true" /> Humidity
                </span>
                <span className="inline-flex items-center gap-1">
                  <Wind className="w-3.5 h-3.5" aria-hidden="true" /> Wind
                </span>
              </div>
            </div>

            <div className="overflow-x-auto mt-2">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#EBF0EB] text-xs font-medium text-[#526056]">
                    <th className="py-2.5 pr-4">Date</th>
                    <th className="py-2.5 pr-4">Condition</th>
                    <th className="py-2.5 pr-4 text-right">High / Low</th>
                    <th className="py-2.5 pr-4 text-right">Rainfall</th>
                    <th className="py-2.5 pr-4 text-right">Rain Prob</th>
                    <th className="py-2.5 pr-4 text-right">Humidity</th>
                    <th className="py-2.5 pr-4 text-right">ET0</th>
                    <th className="py-2.5 text-right">Wind</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EBF0EB] text-sm">
                  {forecastSlice.map((day) => (
                    <tr
                      key={day.isoDate ?? day.dateLabel}
                      className="hover:bg-[#F7FAF7] transition-colors"
                    >
                      <td className="py-3 pr-4 whitespace-nowrap">
                        <span className="font-medium text-[#172019]">{day.day}</span>
                        <span className="text-xs text-[#526056] ml-2 font-mono tabular-nums">
                          {day.dateLabel}
                        </span>
                      </td>
                      <td className="py-3 pr-4 whitespace-nowrap">
                        <div className="inline-flex items-center gap-2 text-[#172019]">
                          {getConditionIcon(day.condition)}
                          <span>{day.condition}</span>
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-right font-mono tabular-nums whitespace-nowrap">
                        <span className="font-semibold text-[#172019]">
                          {formatTemp(day.tempMaxC, preferences.tempUnit)}
                        </span>
                        <span className="text-[#647368] mx-1">/</span>
                        <span className="text-[#526056]">
                          {formatTemp(day.tempMinC, preferences.tempUnit)}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-right font-mono tabular-nums whitespace-nowrap">
                        <span
                          className={
                            day.rainfallMm >= 45
                              ? 'text-amber-800 font-semibold'
                              : 'text-[#172019]'
                          }
                        >
                          {day.rainfallMm} mm
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-right font-mono tabular-nums text-[#526056]">
                        {day.rainProbPct}%
                      </td>
                      <td className="py-3 pr-4 text-right font-mono tabular-nums text-[#526056]">
                        {day.humidityPct}%
                      </td>
                      <td className="py-3 pr-4 text-right font-mono tabular-nums text-[#526056]">
                        {day.et0Mm !== undefined ? `${day.et0Mm.toFixed(1)} mm` : '—'}
                      </td>
                      <td className="py-3 text-right font-mono tabular-nums text-[#526056]">
                        {day.windKmh} km/h
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : (
        /* Historical Weather Archive Mode */
        <div className="space-y-6">
          <section className="bg-white border border-[#DCE3DC] rounded-xl p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-4 border-b border-[#EBF0EB]">
              <div>
                <h3 className="font-display text-base font-semibold text-[#172019] flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-emerald-700" aria-hidden="true" />
                  <span>Open-Meteo Historical Weather Archive Query</span>
                </h3>
                <p className="text-xs text-[#526056] mt-0.5">
                  Retrieve observed daily rainfall, temperature, humidity, wind, and FAO evapotranspiration (ET0) for any coordinates (archive available through {defaultDates.maxDate}).
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setHistLat(String(district.latitude));
                  setHistLon(String(district.longitude));
                  setStartDate(defaultDates.startDate);
                  setEndDate(defaultDates.endDate);
                }}
                className="text-xs font-semibold text-emerald-800 hover:text-emerald-950 self-start sm:self-auto whitespace-nowrap"
              >
                Reset to {district.name}
              </button>
            </div>

            <form
              onSubmit={handleHistoricalSubmit}
              className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end"
            >
              <label className="block">
                <span className="block text-xs font-medium text-[#526056] mb-1">
                  Latitude
                </span>
                <input
                  type="number"
                  step="0.0001"
                  value={histLat}
                  onChange={(e) => setHistLat(e.target.value)}
                  className="w-full bg-[#F6F8F5] border border-[#DCE3DC] rounded-lg px-3 py-2 text-sm font-mono text-[#172019] focus:outline-none focus:ring-2 focus:ring-emerald-700"
                  required
                />
              </label>

              <label className="block">
                <span className="block text-xs font-medium text-[#526056] mb-1">
                  Longitude
                </span>
                <input
                  type="number"
                  step="0.0001"
                  value={histLon}
                  onChange={(e) => setHistLon(e.target.value)}
                  className="w-full bg-[#F6F8F5] border border-[#DCE3DC] rounded-lg px-3 py-2 text-sm font-mono text-[#172019] focus:outline-none focus:ring-2 focus:ring-emerald-700"
                  required
                />
              </label>

              <label className="block">
                <span className="block text-xs font-medium text-[#526056] mb-1">
                  Start Date
                </span>
                <input
                  type="date"
                  value={startDate}
                  max={endDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-[#F6F8F5] border border-[#DCE3DC] rounded-lg px-3 py-2 text-sm font-mono text-[#172019] focus:outline-none focus:ring-2 focus:ring-emerald-700"
                  required
                />
              </label>

              <label className="block">
                <span className="block text-xs font-medium text-[#526056] mb-1">
                  End Date
                </span>
                <input
                  type="date"
                  value={endDate}
                  min={startDate}
                  max={defaultDates.maxDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-[#F6F8F5] border border-[#DCE3DC] rounded-lg px-3 py-2 text-sm font-mono text-[#172019] focus:outline-none focus:ring-2 focus:ring-emerald-700"
                  required
                />
              </label>

              <button
                type="submit"
                disabled={historicalLoading}
                className="w-full px-4 py-2 rounded-lg bg-emerald-800 text-white text-sm font-semibold hover:bg-emerald-900 disabled:opacity-60 transition-colors inline-flex items-center justify-center gap-2"
              >
                {historicalLoading && (
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                )}
                <span>{historicalLoading ? 'Loading…' : 'Load Archive'}</span>
              </button>
            </form>

            {historicalError && (
              <div
                role="alert"
                className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-900 flex items-center gap-2"
              >
                <AlertTriangle className="w-4 h-4 text-red-700 shrink-0" aria-hidden="true" />
                <span>{historicalError}</span>
              </div>
            )}
          </section>

          {historicalData && (
            <>
              <section className="bg-white border border-[#DCE3DC] rounded-xl p-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                <div>
                  <div className="text-xs text-[#526056]">Window</div>
                  <div className="mt-1 font-display text-lg font-bold text-[#172019] tabular-nums">
                    {historicalData.summary.daysCount} Days
                  </div>
                  <div className="text-[11px] text-[#526056] font-mono">
                    {historicalData.startDate} → {historicalData.endDate}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-[#526056]">Total Precipitation</div>
                  <div className="mt-1 font-display text-lg font-bold text-[#172019] tabular-nums">
                    {historicalData.summary.totalPrecipitationMm} mm
                  </div>
                  <div className="text-[11px] text-[#526056]">
                    Rain only: {historicalData.summary.totalRainMm} mm
                  </div>
                </div>
                <div>
                  <div className="text-xs text-[#526056]">Avg High / Low</div>
                  <div className="mt-1 font-display text-lg font-bold text-[#172019] tabular-nums">
                    {formatTemp(historicalData.summary.avgTempMaxC, preferences.tempUnit)} /{' '}
                    {formatTemp(historicalData.summary.avgTempMinC, preferences.tempUnit)}
                  </div>
                  <div className="text-[11px] text-[#526056]">Mean daily thermal band</div>
                </div>
                <div>
                  <div className="text-xs text-[#526056]">Avg Humidity</div>
                  <div className="mt-1 font-display text-lg font-bold text-[#172019] tabular-nums">
                    {historicalData.summary.avgHumidityPct}%
                  </div>
                  <div className="text-[11px] text-[#526056]">Daily mean RH</div>
                </div>
                <div>
                  <div className="text-xs text-[#526056]">Total FAO ET0</div>
                  <div className="mt-1 font-display text-lg font-bold text-[#172019] tabular-nums">
                    {historicalData.summary.totalEt0Mm} mm
                  </div>
                  <div className="text-[11px] text-[#526056]">Cumulative crop water demand</div>
                </div>
                <div>
                  <div className="text-xs text-[#526056]">Rain Regime</div>
                  <div className="mt-1 font-display text-lg font-bold text-[#172019] tabular-nums">
                    {historicalData.summary.dryDaysCount} dry
                  </div>
                  <div className="text-[11px] text-[#526056]">
                    {historicalData.summary.heavyRainDaysCount} heavy rain days (≥45 mm)
                  </div>
                </div>
              </section>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <section className="bg-white border border-[#DCE3DC] rounded-xl p-6">
                  <h3 className="font-display text-base font-semibold text-[#172019]">
                    Observed Historical Rainfall
                  </h3>
                  <p className="text-xs text-[#526056] mt-0.5 mb-4">
                    Open-Meteo ERA5 archive at ({historicalData.coordinates.latitude.toFixed(2)}°N,{' '}
                    {historicalData.coordinates.longitude.toFixed(2)}°E)
                  </p>
                  <RainfallTrendChart data={historicalChartPoints} mode="historical" />
                </section>

                <section className="bg-white border border-[#DCE3DC] rounded-xl p-6">
                  <h3 className="font-display text-base font-semibold text-[#172019]">
                    Observed Historical Temperatures
                  </h3>
                  <p className="text-xs text-[#526056] mt-0.5 mb-4">
                    Historical daytime peak and nighttime minimum temperatures
                  </p>
                  <TemperatureTrendChart
                    data={historicalChartPoints}
                    tempUnit={preferences.tempUnit}
                  />
                </section>
              </div>

              <section className="bg-white border border-[#DCE3DC] rounded-xl p-6">
                <div className="pb-4 border-b border-[#EBF0EB]">
                  <h3 className="font-display text-base font-semibold text-[#172019]">
                    Daily Historical Archive Records
                  </h3>
                  <p className="text-xs text-[#526056] mt-0.5">
                    Elevation {historicalData.coordinates.elevationM} m · Timezone{' '}
                    {historicalData.coordinates.timezone}
                  </p>
                </div>

                <div className="overflow-x-auto mt-2">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[#EBF0EB] text-xs font-medium text-[#526056]">
                        <th className="py-2.5 pr-4">Date</th>
                        <th className="py-2.5 pr-4 text-right">High / Low (Mean)</th>
                        <th className="py-2.5 pr-4 text-right">Precipitation</th>
                        <th className="py-2.5 pr-4 text-right">Rain Only</th>
                        <th className="py-2.5 pr-4 text-right">Mean Humidity</th>
                        <th className="py-2.5 pr-4 text-right">ET0</th>
                        <th className="py-2.5 text-right">Max Wind</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EBF0EB] text-sm">
                      {historicalData.daily.map((day) => (
                        <tr key={day.isoDate} className="hover:bg-[#F7FAF7] transition-colors">
                          <td className="py-3 pr-4 whitespace-nowrap">
                            <span className="font-medium text-[#172019]">{day.dateLabel}</span>
                            <span className="text-xs text-[#526056] ml-2 font-mono tabular-nums">
                              {day.isoDate}
                            </span>
                          </td>
                          <td className="py-3 pr-4 text-right font-mono tabular-nums whitespace-nowrap">
                            <span className="font-semibold text-[#172019]">
                              {formatTemp(day.tempMaxC, preferences.tempUnit)}
                            </span>
                            <span className="text-[#647368] mx-1">/</span>
                            <span className="text-[#526056]">
                              {formatTemp(day.tempMinC, preferences.tempUnit)}
                            </span>
                            <span className="text-xs text-[#647368] ml-1.5">
                              ({formatTemp(day.tempMeanC, preferences.tempUnit)})
                            </span>
                          </td>
                          <td className="py-3 pr-4 text-right font-mono tabular-nums whitespace-nowrap">
                            <span
                              className={
                                day.precipitationMm >= 45
                                  ? 'text-amber-800 font-semibold'
                                  : 'text-[#172019]'
                              }
                            >
                              {day.precipitationMm} mm
                            </span>
                          </td>
                          <td className="py-3 pr-4 text-right font-mono tabular-nums text-[#526056]">
                            {day.rainMm} mm
                          </td>
                          <td className="py-3 pr-4 text-right font-mono tabular-nums text-[#526056]">
                            {day.humidityMeanPct}%
                          </td>
                          <td className="py-3 pr-4 text-right font-mono tabular-nums text-[#526056]">
                            {day.et0Mm.toFixed(1)} mm
                          </td>
                          <td className="py-3 text-right font-mono tabular-nums text-[#526056]">
                            {day.windMaxKmh} km/h
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}
        </div>
      )}
    </div>
  );
};
