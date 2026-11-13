import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Bug,
  Calendar,
  CloudRainWind,
  ExternalLink,
  Flame,
  Info,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Sprout,
  SunMedium,
  Wind,
} from 'lucide-react';
import {
  CROPS,
  DISTRICTS,
  getCropDistrictRisk,
} from '../../data/bangladeshAgriData';
import {
  fetchCropRiskAssessment,
  fetchRiskCrops,
  type RiskCropCatalogItem,
} from '../../services/riskApi';
import type {
  AgriculturalRiskAssessment,
  CropId,
  DistrictId,
  DistrictProfile,
  ForecastWindow,
  RiskCropId,
  RiskDimensionDetail,
  RiskDimensionId,
  UserPreferences,
  VegetableSubtype,
} from '../../types/agri';
import { LocationSelector } from '../common/LocationSelector';
import { SeverityIndicator } from '../common/SeverityIndicator';

interface CropRiskAnalysisViewProps {
  preferences: UserPreferences;
  liveDistrict: DistrictProfile;
  weatherLoading: boolean;
  weatherError: string | null;
  onRefreshWeather: () => void;
  onChangeDistrict: (districtId: DistrictId) => void;
}

const PHASE2_DIMENSION_ICONS: Record<
  RiskDimensionId,
  React.ComponentType<{ className?: string }>
> = {
  heat_stress: Flame,
  excessive_rainfall_waterlogging: CloudRainWind,
  drought: SunMedium,
  disease_conducive_weather: Bug,
  wind_damage: Wind,
};

function mapInitialCrop(prefCrop: CropId): {
  cropId: RiskCropId;
  varietyId: string;
} {
  if (prefCrop === 'aman-rice') return { cropId: 'rice', varietyId: 'aman' };
  if (prefCrop === 'boro-rice') return { cropId: 'rice', varietyId: 'boro' };
  return { cropId: prefCrop as RiskCropId, varietyId: '' };
}

function mapToLegacyCropId(cropId: RiskCropId, varietyId: string): CropId {
  if (cropId === 'rice') {
    return varietyId === 'boro' ? 'boro-rice' : 'aman-rice';
  }
  if (
    cropId === 'potato' ||
    cropId === 'jute' ||
    cropId === 'wheat' ||
    cropId === 'maize'
  ) {
    return cropId;
  }
  return 'aman-rice';
}

export const CropRiskAnalysisView: React.FC<CropRiskAnalysisViewProps> = ({
  preferences,
  liveDistrict,
  onRefreshWeather,
  onChangeDistrict,
}) => {
  const initialCrop = useMemo(
    () => mapInitialCrop(preferences.primaryCrop),
    [preferences.primaryCrop]
  );

  const [catalog, setCatalog] = useState<RiskCropCatalogItem[]>([]);
  const [selectedCrop, setSelectedCrop] = useState<RiskCropId>(initialCrop.cropId);
  const [varietyId, setVarietyId] = useState<string>(initialCrop.varietyId);
  const [vegetableSubtype, setVegetableSubtype] = useState<VegetableSubtype | ''>('');
  const [plantingDate, setPlantingDate] = useState<string>('');
  const [growthStageId, setGrowthStageId] = useState<string>('');
  const [windowHorizon, setWindowHorizon] = useState<ForecastWindow>('72h');
  const [tableScope, setTableScope] = useState<'division' | 'all'>('division');

  const [assessment, setAssessment] = useState<AgriculturalRiskAssessment | null>(null);
  const [riskLoading, setRiskLoading] = useState<boolean>(true);
  const [riskError, setRiskError] = useState<string | null>(null);
  const [retryNonce, setRetryNonce] = useState<number>(0);

  const district = liveDistrict;

  useEffect(() => {
    const controller = new AbortController();
    fetchRiskCrops(controller.signal)
      .then((items) => setCatalog(items))
      .catch(() => {
        // Fallback smoothly if aborted
      });
    return () => controller.abort();
  }, []);

  const activeCatalogItem = useMemo(
    () => catalog.find((c) => c.id === selectedCrop) ?? null,
    [catalog, selectedCrop]
  );

  useEffect(() => {
    const controller = new AbortController();
    setRiskLoading(true);
    setRiskError(null);

    fetchCropRiskAssessment({
      districtId: district.id,
      cropId: selectedCrop,
      varietyId: varietyId || undefined,
      vegetableSubtype:
        selectedCrop === 'vegetables' && vegetableSubtype ? vegetableSubtype : undefined,
      plantingDate:
        activeCatalogItem?.phenologyTrack !== 'perennial_mango' && plantingDate
          ? plantingDate
          : undefined,
      growthStageId: growthStageId || undefined,
      window: windowHorizon,
      includeHistorical: true,
      signal: controller.signal,
    })
      .then((payload) => {
        setAssessment(payload);
        setRiskLoading(false);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setRiskError(
          err instanceof Error ? err.message : 'Unable to compute agricultural risk assessment'
        );
        setRiskLoading(false);
      });

    return () => controller.abort();
  }, [
    district.id,
    selectedCrop,
    varietyId,
    vegetableSubtype,
    plantingDate,
    growthStageId,
    windowHorizon,
    activeCatalogItem?.phenologyTrack,
    retryNonce,
  ]);

  const handleCropChange = (nextCrop: RiskCropId) => {
    setSelectedCrop(nextCrop);
    setVarietyId('');
    setVegetableSubtype('');
    setGrowthStageId('');
    if (nextCrop === 'mango') {
      setPlantingDate('');
    }
  };

  const legacyCropId = mapToLegacyCropId(selectedCrop, varietyId);
  const legacyCropObj = CROPS.find((c) => c.id === legacyCropId) ?? CROPS[0];
  const tableDistricts =
    tableScope === 'division'
      ? DISTRICTS.filter((d) => d.division === district.division)
      : DISTRICTS;

  const confidenceBadgeClass =
    assessment?.confidence.level === 'High'
      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
      : assessment?.confidence.level === 'Moderate'
      ? 'bg-amber-50 border-amber-200 text-amber-900'
      : 'bg-slate-100 border-slate-300 text-slate-800';

  return (
    <div className="space-y-6">
      {/* Control Header */}
      <section className="bg-white border border-[#DCE3DC] rounded-xl p-6">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
          <div>
            <h2 className="font-display text-xl sm:text-2xl font-bold text-[#172019]">
              Agricultural Risk Intelligence
            </h2>
            <p className="text-sm text-[#526056] mt-1 max-w-2xl">
              Explainable 5-dimension risk engine evaluating heat stress, excessive rainfall, drought, disease-conducive weather, and wind damage across 8 Bangladesh crops.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 shrink-0">
            <label className="block">
              <span className="block text-xs font-medium text-[#526056] mb-1">
                Priority Crop (8)
              </span>
              <select
                value={selectedCrop}
                onChange={(e) => handleCropChange(e.target.value as RiskCropId)}
                className="w-full bg-[#F6F8F5] border border-[#DCE3DC] rounded-lg px-3 py-2 text-sm font-medium text-[#172019] focus:outline-none focus:ring-2 focus:ring-emerald-700"
              >
                {(catalog.length > 0
                  ? catalog
                  : [
                      { id: 'rice', name: 'Rice' },
                      { id: 'wheat', name: 'Wheat' },
                      { id: 'maize', name: 'Maize' },
                      { id: 'potato', name: 'Potato' },
                      { id: 'vegetables', name: 'Vegetables' },
                      { id: 'jute', name: 'Jute' },
                      { id: 'mango', name: 'Mango' },
                      { id: 'chili', name: 'Chili' },
                    ]
                ).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="block text-xs font-medium text-[#526056] mb-1">
                Forecast Window
              </span>
              <select
                value={windowHorizon}
                onChange={(e) => setWindowHorizon(e.target.value as ForecastWindow)}
                className="w-full bg-[#F6F8F5] border border-[#DCE3DC] rounded-lg px-3 py-2 text-sm font-medium text-[#172019] focus:outline-none focus:ring-2 focus:ring-emerald-700"
              >
                <option value="24h">Next 24 Hours</option>
                <option value="72h">Next 72 Hours</option>
                <option value="7d">7-Day Outlook</option>
                <option value="14d">14-Day Extended</option>
              </select>
            </label>

            <div className="sm:col-span-2">
              <LocationSelector
                selectedDistrict={district.id}
                onChangeDistrict={onChangeDistrict}
                variant="panel"
                divisionLabel="Bangladesh Division"
                districtLabel="Bangladesh District"
              />
            </div>
          </div>
        </div>

        {/* Crop Stage, Variety & Subtype Inputs */}
        <div className="mt-4 pt-4 border-t border-[#EBF0EB] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {activeCatalogItem && activeCatalogItem.varieties.length > 0 && (
            <label className="block">
              <span className="block text-xs font-medium text-[#526056] mb-1">
                Variety / Season (Optional)
              </span>
              <select
                value={varietyId}
                onChange={(e) => setVarietyId(e.target.value)}
                className="w-full bg-[#F6F8F5] border border-[#DCE3DC] rounded-lg px-3 py-2 text-xs font-medium text-[#172019] focus:outline-none focus:ring-2 focus:ring-emerald-700"
              >
                <option value="">General / Unspecified</option>
                {activeCatalogItem.varieties.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.label}
                  </option>
                ))}
              </select>
            </label>
          )}

          {selectedCrop === 'vegetables' && activeCatalogItem?.vegetableSubtypes && (
            <label className="block">
              <span className="block text-xs font-medium text-[#526056] mb-1">
                Vegetable Sub-Type
              </span>
              <select
                value={vegetableSubtype}
                onChange={(e) =>
                  setVegetableSubtype(e.target.value as VegetableSubtype | '')
                }
                className="w-full bg-[#F6F8F5] border border-[#DCE3DC] rounded-lg px-3 py-2 text-xs font-medium text-[#172019] focus:outline-none focus:ring-2 focus:ring-emerald-700"
              >
                <option value="">Unspecified (Generic Bounds)</option>
                {activeCatalogItem.vegetableSubtypes.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.label}
                  </option>
                ))}
              </select>
            </label>
          )}

          {activeCatalogItem?.phenologyTrack !== 'perennial_mango' && (
            <label className="block">
              <span className="block text-xs font-medium text-[#526056] mb-1">
                Planting Date (Optional)
              </span>
              <div className="relative">
                <input
                  type="date"
                  value={plantingDate}
                  max={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setPlantingDate(e.target.value)}
                  className="w-full bg-[#F6F8F5] border border-[#DCE3DC] rounded-lg px-3 py-1.5 text-xs font-medium text-[#172019] focus:outline-none focus:ring-2 focus:ring-emerald-700"
                />
              </div>
            </label>
          )}

          <label className="block">
            <span className="block text-xs font-medium text-[#526056] mb-1">
              {activeCatalogItem?.phenologyTrack === 'perennial_mango'
                ? 'Mango Phenological Stage'
                : 'Growth Stage Override (Optional)'}
            </span>
            <select
              value={growthStageId}
              onChange={(e) => setGrowthStageId(e.target.value)}
              className="w-full bg-[#F6F8F5] border border-[#DCE3DC] rounded-lg px-3 py-2 text-xs font-medium text-[#172019] focus:outline-none focus:ring-2 focus:ring-emerald-700"
            >
              <option value="">
                {plantingDate && activeCatalogItem?.phenologyTrack !== 'perennial_mango'
                  ? 'Auto from Planting Date'
                  : 'Unspecified (No Stage Assumed)'}
              </option>
              {(activeCatalogItem?.growthStages ?? []).map((st) => (
                <option key={st.id} value={st.id}>
                  {st.label}
                  {st.minDay !== null && st.maxDay !== null
                    ? ` (Day ${st.minDay}–${st.maxDay})`
                    : ''}
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* Summary Strip */}
        <div className="mt-5 pt-5 border-t border-[#EBF0EB] flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {riskLoading && !assessment ? (
            <div className="flex items-center gap-2 text-sm text-[#526056]">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-700" aria-hidden="true" />
              <span>Evaluating live Open-Meteo weather & crop thresholds…</span>
            </div>
          ) : riskError ? (
            <div className="flex flex-wrap items-center justify-between gap-3 w-full rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-950">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-700 shrink-0" aria-hidden="true" />
                <span>Risk evaluation unavailable: {riskError}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setRetryNonce((n) => n + 1);
                  onRefreshWeather();
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-red-300 bg-white font-semibold hover:bg-red-100"
              >
                <RefreshCw className="w-3 h-3" aria-hidden="true" />
                <span>Retry Assessment</span>
              </button>
            </div>
          ) : assessment ? (
            <>
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-[#172019]">
                  <Sprout className="w-4 h-4 text-emerald-700" aria-hidden="true" />
                  <span>{assessment.cropContext.cropName}</span>
                  {preferences.showBengaliTerms && activeCatalogItem && (
                    <span className="text-xs font-normal text-[#526056]">
                      ({activeCatalogItem.localName})
                    </span>
                  )}
                  <span className="text-[#94A396]" aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-md border bg-emerald-50 border-emerald-200 text-emerald-900">
                    {riskLoading ? (
                      <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />
                    ) : (
                      <Calendar className="w-3 h-3" aria-hidden="true" />
                    )}
                    {assessment.cropContext.stageStatus === 'Specified'
                      ? `${assessment.cropContext.growthStageLabel}${
                          assessment.cropContext.daysAfterPlanting !== null
                            ? ` (Day ${assessment.cropContext.daysAfterPlanting})`
                            : ''
                        }`
                      : 'Stage Unspecified'}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs text-[#526056]">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border font-medium ${confidenceBadgeClass}`}
                    title={assessment.confidence.note}
                  >
                    <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
                    Confidence: {assessment.confidence.level} ({assessment.confidence.index.toFixed(2)})
                  </span>
                  <span className="font-mono tabular-nums">
                    Data {(assessment.confidence.components.dataCompleteness * 100).toFixed(0)}% · Lead{' '}
                    {assessment.confidence.components.leadTimeFactor.toFixed(2)} · Stage{' '}
                    {assessment.confidence.components.stageSpecificity.toFixed(2)}
                  </span>
                  <span>·</span>
                  <span className="font-mono tabular-nums">
                    Topsoil Proxy:{' '}
                    {assessment.weatherContext.soilMoistureProxy.rawM3PerM3 !== null
                      ? `${assessment.weatherContext.soilMoistureProxy.rawM3PerM3.toFixed(3)} m³/m³`
                      : 'Unavailable'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right">
                  <div className="text-xs text-[#526056]">
                    Overall Risk ({assessment.forecastWindow})
                  </div>
                  <div className="font-mono tabular-nums text-lg font-bold text-[#172019]">
                    {assessment.overallRisk.score !== null
                      ? `${assessment.overallRisk.score}/100`
                      : '—'}
                  </div>
                </div>
                <SeverityIndicator severity={assessment.overallRisk.severity} />
              </div>
            </>
          ) : null}
        </div>

        {/* Off-Season Plausibility Notice */}
        {assessment?.cropContext.seasonPlausibility.status === 'off_season_warning' && (
          <div
            role="status"
            className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-950 flex items-start gap-2"
          >
            <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" aria-hidden="true" />
            <span>{assessment.cropContext.seasonPlausibility.warningMessage}</span>
          </div>
        )}
      </section>

      {/* 5 Risk Dimensions */}
      {assessment && (
        <section
          aria-label="5-Dimension Agricultural Risk Breakdown"
          className="grid grid-cols-1 lg:grid-cols-2 gap-6"
        >
          {assessment.dimensions.map((dim) => {
            const Icon = PHASE2_DIMENSION_ICONS[dim.dimensionId];
            const barColor =
              dim.severity === 'Critical'
                ? 'bg-red-700'
                : dim.severity === 'High'
                ? 'bg-orange-600'
                : dim.severity === 'Moderate'
                ? 'bg-amber-600'
                : dim.severity === 'Low'
                ? 'bg-emerald-700'
                : 'bg-slate-400';

            return (
              <article
                key={dim.dimensionId}
                className="bg-white border border-[#DCE3DC] rounded-xl p-6 flex flex-col justify-between gap-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[#F1F4EF] text-[#172019] flex items-center justify-center shrink-0">
                        <Icon className="w-5 h-5" aria-hidden="true" />
                      </div>
                      <div>
                        <h3 className="font-display text-base font-semibold text-[#172019]">
                          {dim.label}
                        </h3>
                        <p className="text-xs text-[#526056]">
                          Weight {(dim.weight * 100).toFixed(0)}% · Window {dim.expectedWindow}
                          {dim.excludedFromComposite ? ' · Excluded from composite' : ''}
                        </p>
                      </div>
                    </div>
                    <SeverityIndicator severity={dim.severity} score={dim.score} />
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-4 w-full h-2 bg-[#EDF1EC] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${barColor}`}
                      style={{ width: `${dim.score ?? 0}%` }}
                    />
                  </div>

                  {/* Trigger Variables */}
                  {dim.triggers.length > 0 && (
                    <div className="mt-4 space-y-1.5 bg-[#FAFBF9] border border-[#EBF0EB] rounded-lg p-3">
                      {dim.triggers.map((t, idx) => (
                        <div key={idx} className="text-xs flex flex-col gap-0.5">
                          <span className="font-mono text-[#172019] font-medium">
                            {t.variable}: {t.observedValue}
                          </span>
                          <span className="text-[#647368]">Cue: {t.threshold}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Explanation */}
                  <div className="mt-4 space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-[#172019]">
                      <Info className="w-3.5 h-3.5 text-emerald-800" aria-hidden="true" />
                      <span>Explanation</span>
                    </div>
                    <p className="text-sm text-[#3A473E] leading-relaxed">
                      {dim.explanation}
                    </p>
                  </div>
                </div>

                {/* Recommendation & Provenance */}
                <div className="pt-4 border-t border-[#EBF0EB] space-y-2.5">
                  <div>
                    <div className="text-xs font-semibold text-emerald-900">
                      Recommended Action
                    </div>
                    <p className="text-xs sm:text-sm text-[#526056] mt-0.5 leading-relaxed">
                      {dim.recommendedAction}
                    </p>
                  </div>

                  <div className="text-[11px] text-[#647368] space-y-1">
                    <div>
                      <span className="font-semibold text-[#3A473E]">Provenance: </span>
                      <span>
                        {dim.provenance.status === 'verified_reference'
                          ? 'Verified Reference'
                          : 'Proposed (Requires DAE/BRRI/BARI Validation)'}
                      </span>
                      {dim.provenance.sourceTitle && (
                        <span>
                          {' '}
                          — {dim.provenance.sourceTitle}
                          {dim.provenance.publicationYear
                            ? ` (${dim.provenance.publicationYear})`
                            : ''}
                        </span>
                      )}
                      {dim.provenance.urlOrDoi && (
                        <>
                          {' '}
                          <a
                            href={dim.provenance.urlOrDoi}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-0.5 text-emerald-800 underline"
                          >
                            <span>Source</span>
                            <ExternalLink className="w-2.5 h-2.5" aria-hidden="true" />
                          </a>
                        </>
                      )}
                    </div>
                    {dim.nonWeatherBlindSpots.length > 0 && (
                      <div>
                        <span className="font-semibold text-[#3A473E]">Limitations: </span>
                        <span>{dim.nonWeatherBlindSpots.join(' ')}</span>
                      </div>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}

      {/* Epistemic Disclosures & Antecedent Baseline */}
      {assessment && (
        <section className="bg-white border border-[#DCE3DC] rounded-xl p-5 space-y-2 text-xs text-[#526056]">
          <div className="font-semibold text-[#172019]">
            Scientific Scope & Antecedent Context
          </div>
          <p>
            {assessment.weatherContext.historicalBaseline.source === 'open-meteo-archive'
              ? `Trailing 30-day ERA5 baseline (${assessment.weatherContext.historicalBaseline.startDate} to ${assessment.weatherContext.historicalBaseline.endDate}, ${assessment.weatherContext.historicalBaseline.archiveLagDays}d lag): ${assessment.weatherContext.historicalBaseline.totalPrecipitationMm} mm rain, ${assessment.weatherContext.historicalBaseline.totalEt0Mm} mm ET0, ${assessment.weatherContext.historicalBaseline.dryDaysCount} dry days. ${assessment.weatherContext.historicalBaseline.roleNote}`
              : `Historical baseline: ${assessment.weatherContext.historicalBaseline.roleNote}`}
          </p>
          <ul className="list-disc pl-5 space-y-1">
            {assessment.scientificDisclosures.map((d, idx) => (
              <li key={idx}>{d}</li>
            ))}
          </ul>
        </section>
      )}

      {/* Cross-District Comparison Table (Preserved Static Baseline Regional Overview) */}
      <section className="bg-white border border-[#DCE3DC] rounded-xl p-6">
        <div className="pb-4 border-b border-[#EBF0EB] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="font-display text-base font-semibold text-[#172019]">
              {legacyCropObj.name} Regional Comparison —{' '}
              {tableScope === 'division'
                ? `${district.division} Division (${tableDistricts.length} Districts)`
                : 'All 64 Districts (Static Baseline)'}
            </h3>
            <p className="text-xs text-[#526056] mt-0.5">
              Unselected rows display static regional baselines; click any district to run a live 5-dimension Open-Meteo assessment.
            </p>
          </div>

          <div className="inline-flex items-center p-1 bg-[#F1F4EF] rounded-lg self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setTableScope('division')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                tableScope === 'division'
                  ? 'bg-white text-[#172019] shadow-xs font-semibold'
                  : 'text-[#526056] hover:text-[#172019]'
              }`}
            >
              {district.division} Division
            </button>
            <button
              type="button"
              onClick={() => setTableScope('all')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                tableScope === 'all'
                  ? 'bg-white text-[#172019] shadow-xs font-semibold'
                  : 'text-[#526056] hover:text-[#172019]'
              }`}
            >
              All 64 Districts
            </button>
          </div>
        </div>

        <div className="overflow-x-auto mt-2">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#EBF0EB] text-xs font-medium text-[#526056]">
                <th className="py-2.5 pr-4">District</th>
                <th className="py-2.5 pr-4 text-right">Flood</th>
                <th className="py-2.5 pr-4 text-right">Drought</th>
                <th className="py-2.5 pr-4 text-right">Heat</th>
                <th className="py-2.5 pr-4 text-right">Disease</th>
                <th className="py-2.5 text-right">Baseline Severity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EBF0EB] text-sm">
              {tableDistricts.map((d) => {
                const isSelected = d.id === district.id;
                const rowRisk = getCropDistrictRisk(
                  legacyCropObj.id,
                  d.id,
                  isSelected ? district : undefined
                );
                const getDim = (t: RiskDimensionDetail['type']) =>
                  rowRisk.dimensions.find((dim) => dim.type === t)!;

                return (
                  <tr
                    key={d.id}
                    onClick={() => onChangeDistrict(d.id)}
                    className={`cursor-pointer transition-colors ${
                      isSelected ? 'bg-emerald-50/70' : 'hover:bg-[#F7FAF7]'
                    }`}
                  >
                    <td className="py-3 pr-4">
                      <div className="font-medium text-[#172019]">
                        {d.name}
                        {isSelected && (
                          <span className="ml-2 text-xs text-emerald-800 font-semibold">
                            (Selected)
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-[#526056]">{d.riverBasin}</div>
                    </td>
                    {(['Flood', 'Drought', 'Heat', 'Disease'] as const).map((type) => {
                      const item = getDim(type);
                      return (
                        <td
                          key={type}
                          className="py-3 pr-4 text-right font-mono tabular-nums text-xs"
                        >
                          <span className="font-medium text-[#172019]">{item.score}</span>
                          <span className="text-[#647368] ml-1">({item.severity[0]})</span>
                        </td>
                      );
                    })}
                    <td className="py-3 text-right">
                      <SeverityIndicator
                        severity={rowRisk.compositeSeverity}
                        score={rowRisk.compositeScore}
                        compact
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
