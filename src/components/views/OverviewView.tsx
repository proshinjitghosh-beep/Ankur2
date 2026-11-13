import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CloudRain,
  Droplets,
  Loader2,
  ShieldAlert,
  Sprout,
  Thermometer,
  Wind,
} from 'lucide-react';
import {
  CROPS,
  EARLY_WARNINGS,
  getCropDistrictRisk,
} from '../../data/bangladeshAgriData';
import {
  DistrictProfile,
  NavSection,
  TrackedCropPlot,
  UserPreferences,
} from '../../types/agri';
import { RainfallTrendChart, RiskBreakdownChart } from '../charts/AgriCharts';
import { formatTemp, SeverityIndicator } from '../common/SeverityIndicator';

interface OverviewViewProps {
  preferences: UserPreferences;
  plots: TrackedCropPlot[];
  liveDistrict: DistrictProfile;
  weatherLoading: boolean;
  weatherError: string | null;
  onNavigate: (section: NavSection) => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  preferences,
  plots,
  liveDistrict,
  weatherLoading,
  weatherError,
  onNavigate,
}) => {
  const [bannerError, setBannerError] = useState(false);

  const district = liveDistrict;
  const primaryCrop =
    CROPS.find((c) => c.id === preferences.primaryCrop) ?? CROPS[0];
  const cropRisk = getCropDistrictRisk(primaryCrop.id, district.id, district);

  const districtWarnings = EARLY_WARNINGS.filter((w) =>
    w.districtIds.includes(district.id)
  );
  const displayedWarnings =
    districtWarnings.length > 0 ? districtWarnings : EARLY_WARNINGS.slice(0, 2);

  return (
    <div className="space-y-6">
      {weatherError && (
        <div
          role="alert"
          className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-950 flex items-center gap-2.5"
        >
          <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" aria-hidden="true" />
          <span>
            Live weather feed warning for {district.name}: {weatherError}. Showing baseline station profile.
          </span>
        </div>
      )}

      {/* Welcome Banner with Field Context */}
      <section className="relative rounded-xl overflow-hidden border border-[#DCE3DC] bg-[#163020] min-h-[196px] flex items-end">
        {!bannerError && (
          <img
            src="/src/assets/images/bangladesh_paddy_banner_1794556571453.jpg"
            alt={`Agricultural landscape in ${district.name}, Bangladesh`}
            referrerPolicy="no-referrer"
            onError={() => setBannerError(true)}
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        <div
          className="absolute inset-0 bg-gradient-to-t from-[#0D1E13]/92 via-[#0D1E13]/60 to-[#0D1E13]/25"
          aria-hidden="true"
        />
        <div className="relative z-10 w-full p-6 sm:p-8 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          <div className="max-w-2xl">
            <p className="text-xs font-medium text-emerald-200 tracking-wide flex flex-wrap items-center gap-2">
              <span>
                {district.name}, {district.division} Division · {district.agroZone} ({district.latitude.toFixed(2)}°N, {district.longitude.toFixed(2)}°E)
              </span>
              {weatherLoading && (
                <span className="inline-flex items-center gap-1 text-emerald-100">
                  <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />
                  Syncing Open-Meteo…
                </span>
              )}
            </p>
            <h2 className="mt-1.5 font-display text-2xl sm:text-3xl font-bold text-white tracking-tight text-balance">
              Welcome back, {preferences.farmerName}
            </h2>
            <p className="mt-1.5 text-sm text-emerald-50/90 leading-relaxed max-w-xl">
              {preferences.farmName} ({preferences.farmSizeBigha} Bigha) · Primary focus on{' '}
              <span className="font-semibold text-white">{primaryCrop.name}</span>.{' '}
              {weatherLoading && !district.currentWeather.isLive
                ? 'Fetching live Open-Meteo station feed…'
                : district.currentWeather.updatedLabel}
              .
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => onNavigate('crop-risk')}
              className="px-4 py-2.5 rounded-lg bg-white text-[#172019] text-sm font-semibold hover:bg-emerald-50 transition-colors whitespace-nowrap shrink-0"
            >
              Inspect Crop Risk
            </button>
            <button
              type="button"
              onClick={() => onNavigate('warnings')}
              className="px-4 py-2.5 rounded-lg bg-emerald-700/90 text-white border border-emerald-500/40 text-sm font-medium hover:bg-emerald-700 transition-colors whitespace-nowrap shrink-0"
            >
              Early Warning Center
            </button>
          </div>
        </div>
      </section>

      {/* Primary 4-Column KPI Strip */}
      <section
        aria-label="Current Field & Weather Summary"
        className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4"
      >
        <div className="bg-white border border-[#DCE3DC] rounded-xl p-5">
          <div className="flex items-center justify-between text-xs text-[#526056]">
            <span>Temperature & Feels Like</span>
            <Thermometer className="w-4 h-4 text-amber-700" aria-hidden="true" />
          </div>
          <div className="mt-2.5 flex items-baseline gap-2.5">
            <span className="font-display text-3xl font-bold text-[#172019] tabular-nums">
              {formatTemp(district.currentWeather.tempC, preferences.tempUnit)}
            </span>
            <span className="text-xs text-[#526056] font-mono tabular-nums">
              Feels {formatTemp(district.currentWeather.feelsLikeC, preferences.tempUnit)}
            </span>
          </div>
          <p className="mt-2 text-xs text-[#526056]">
            {district.currentWeather.condition} · Wind {district.currentWeather.windKmh} km/h{' '}
            {district.currentWeather.windDir}
          </p>
        </div>

        <div className="bg-white border border-[#DCE3DC] rounded-xl p-5">
          <div className="flex items-center justify-between text-xs text-[#526056]">
            <span>Humidity & Soil Moisture</span>
            <Droplets className="w-4 h-4 text-emerald-700" aria-hidden="true" />
          </div>
          <div className="mt-2.5 flex items-baseline gap-2.5">
            <span className="font-display text-3xl font-bold text-[#172019] tabular-nums">
              {district.currentWeather.humidityPct}%
            </span>
            <span className="text-xs text-[#526056] font-mono tabular-nums">
              Soil {district.currentWeather.soilMoisturePct}%
            </span>
          </div>
          <p className="mt-2 text-xs text-[#526056]">
            {district.currentWeather.humidityPct >= 80
              ? 'Elevated morning dew & fungal spore window'
              : 'Comfortable canopy evaporation rate'}
          </p>
        </div>

        <div className="bg-white border border-[#DCE3DC] rounded-xl p-5">
          <div className="flex items-center justify-between text-xs text-[#526056]">
            <span>24h Rainfall Total</span>
            <CloudRain className="w-4 h-4 text-emerald-800" aria-hidden="true" />
          </div>
          <div className="mt-2.5 flex items-baseline gap-2.5">
            <span className="font-display text-3xl font-bold text-[#172019] tabular-nums">
              {district.currentWeather.rainfall24hMm.toFixed(1)} mm
            </span>
          </div>
          <p className="mt-2 text-xs text-[#526056] flex items-center gap-1.5">
            <Wind className="w-3.5 h-3.5 text-[#647368]" aria-hidden="true" />
            <span>{district.riverBasin}</span>
          </p>
        </div>

        <div className="bg-white border border-[#DCE3DC] rounded-xl p-5">
          <div className="flex items-center justify-between text-xs text-[#526056]">
            <span>Agricultural Risk Score</span>
            <ShieldAlert className="w-4 h-4 text-[#526056]" aria-hidden="true" />
          </div>
          <div className="mt-2.5 flex items-center justify-between gap-2">
            <span className="font-display text-3xl font-bold text-[#172019] tabular-nums">
              {cropRisk.compositeScore}
              <span className="text-base font-normal text-[#647368]">/100</span>
            </span>
            <SeverityIndicator severity={cropRisk.compositeSeverity} compact />
          </div>
          <p className="mt-2 text-xs text-[#526056] truncate">
            For {primaryCrop.name} in {district.name}
          </p>
        </div>
      </section>

      {/* Active Warnings + Crop Monitoring Summary */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Active Warnings Panel */}
        <section className="xl:col-span-5 bg-white border border-[#DCE3DC] rounded-xl p-6 flex flex-col">
          <div className="flex items-center justify-between gap-4 pb-4 border-b border-[#EBF0EB]">
            <div>
              <h3 className="font-display text-base font-semibold text-[#172019]">
                Active Warnings for {district.name}
              </h3>
              <p className="text-xs text-[#526056] mt-0.5">
                Simulated early alerts affecting nearby upazilas
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('warnings')}
              className="text-xs font-semibold text-emerald-800 hover:text-emerald-950 inline-flex items-center gap-1 whitespace-nowrap shrink-0"
            >
              <span>All Alerts</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-[#EBF0EB] flex-1">
            {displayedWarnings.map((warning) => (
              <div key={warning.id} className="py-4 first:pt-4 last:pb-0 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="text-xs text-[#526056] font-medium">
                    {warning.category} · {warning.validWindow}
                  </div>
                  <SeverityIndicator severity={warning.severity} compact />
                </div>
                <h4 className="text-sm font-semibold text-[#172019] leading-snug">
                  {warning.title}
                </h4>
                <p className="text-xs text-[#526056] leading-relaxed">
                  {warning.impactSummary}
                </p>
                <div className="text-xs font-mono tabular-nums text-[#3A473E]">
                  Trigger: {warning.triggerMetric}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Crop Monitoring Summary */}
        <section className="xl:col-span-7 bg-white border border-[#DCE3DC] rounded-xl p-6 flex flex-col">
          <div className="flex items-center justify-between gap-4 pb-4 border-b border-[#EBF0EB]">
            <div>
              <h3 className="font-display text-base font-semibold text-[#172019]">
                Crop Monitoring Summary
              </h3>
              <p className="text-xs text-[#526056] mt-0.5">
                Tracked plots, growth stages & immediate irrigation status
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('smart-farming')}
              className="text-xs font-semibold text-emerald-800 hover:text-emerald-950 inline-flex items-center gap-1 whitespace-nowrap shrink-0"
            >
              <span>Manage Plots</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto mt-2">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#EBF0EB] text-xs font-medium text-[#526056]">
                  <th className="py-2.5 pr-4">Plot & Crop</th>
                  <th className="py-2.5 pr-4">Growth Stage</th>
                  <th className="py-2.5 pr-4 text-right">Moisture</th>
                  <th className="py-2.5 text-right">Stress Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EBF0EB] text-sm">
                {plots.map((plot) => {
                  const crop = CROPS.find((c) => c.id === plot.cropId);
                  const pct = Math.min(
                    100,
                    Math.round((plot.daysAfterPlanting / plot.totalCycleDays) * 100)
                  );
                  return (
                    <tr
                      key={plot.id}
                      onClick={() => onNavigate('smart-farming')}
                      className="hover:bg-[#F7FAF7] cursor-pointer transition-colors"
                    >
                      <td className="py-3.5 pr-4">
                        <div className="font-medium text-[#172019] flex items-center gap-2">
                          <Sprout className="w-4 h-4 text-emerald-700 shrink-0" aria-hidden="true" />
                          <span>{plot.plotName}</span>
                        </div>
                        <div className="text-xs text-[#526056] mt-0.5 pl-6">
                          {crop?.name} ({plot.variety}) · {plot.areaBigha} Bigha
                        </div>
                      </td>
                      <td className="py-3.5 pr-4">
                        <div className="text-xs font-medium text-[#172019]">
                          {plot.currentStage}
                        </div>
                        <div className="mt-1.5 flex items-center gap-2">
                          <div className="w-24 h-1.5 bg-[#E6ECE6] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-700 rounded-full"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-[11px] font-mono tabular-nums text-[#526056]">
                            Day {plot.daysAfterPlanting}/{plot.totalCycleDays}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 pr-4 text-right font-mono tabular-nums text-xs text-[#172019]">
                        {plot.soilMoisturePct}%
                      </td>
                      <td className="py-3.5 text-right">
                        <SeverityIndicator severity={plot.healthStatus} compact />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* Weather & Risk Visualizations */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <section className="xl:col-span-7 bg-white border border-[#DCE3DC] rounded-xl p-6">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <h3 className="font-display text-base font-semibold text-[#172019]">
                7-Day Rainfall Outlook — {district.name}
              </h3>
              <p className="text-xs text-[#526056] mt-0.5">
                {district.currentWeather.isLive
                  ? 'Live Open-Meteo daily precipitation vs. field waterlogging threshold'
                  : 'Baseline daily precipitation vs. field waterlogging threshold'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('weather')}
              className="text-xs font-semibold text-emerald-800 hover:text-emerald-950 whitespace-nowrap shrink-0"
            >
              Full Forecast
            </button>
          </div>
          <RainfallTrendChart data={district.forecast14Days.slice(0, 7)} />
        </section>

        <section className="xl:col-span-5 bg-white border border-[#DCE3DC] rounded-xl p-6">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <h3 className="font-display text-base font-semibold text-[#172019]">
                {primaryCrop.name} Risk Breakdown
              </h3>
              <p className="text-xs text-[#526056] mt-0.5">
                Simulated multi-hazard scores in {district.name}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('crop-risk')}
              className="text-xs font-semibold text-emerald-800 hover:text-emerald-950 whitespace-nowrap shrink-0"
            >
              Why Risks Exist
            </button>
          </div>
          <RiskBreakdownChart dimensions={cropRisk.dimensions} />
        </section>
      </div>
    </div>
  );
};
