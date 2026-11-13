import React, { useState } from 'react';
import {
  Bug,
  CloudRainWind,
  Flame,
  Info,
  Sprout,
  SunMedium,
} from 'lucide-react';
import {
  CROPS,
  DISTRICTS,
  getCropDistrictRisk,
} from '../../data/bangladeshAgriData';
import {
  CropId,
  DistrictId,
  DistrictProfile,
  RiskDimensionDetail,
  UserPreferences,
} from '../../types/agri';
import { LocationSelector } from '../common/LocationSelector';
import { SeverityIndicator } from '../common/SeverityIndicator';

interface CropRiskAnalysisViewProps {
  preferences: UserPreferences;
  liveDistrict: DistrictProfile;
  onChangeDistrict: (districtId: DistrictId) => void;
}

const DIMENSION_ICONS: Record<
  RiskDimensionDetail['type'],
  React.ComponentType<{ className?: string }>
> = {
  Flood: CloudRainWind,
  Drought: SunMedium,
  Heat: Flame,
  Disease: Bug,
};

export const CropRiskAnalysisView: React.FC<CropRiskAnalysisViewProps> = ({
  preferences,
  liveDistrict,
  onChangeDistrict,
}) => {
  const [selectedCrop, setSelectedCrop] = useState<CropId>(preferences.primaryCrop);
  const [tableScope, setTableScope] = useState<'division' | 'all'>('division');

  const district = liveDistrict;
  const crop = CROPS.find((c) => c.id === selectedCrop) ?? CROPS[0];
  const assessment = getCropDistrictRisk(crop.id, district.id, district);
  const tableDistricts =
    tableScope === 'division'
      ? DISTRICTS.filter((d) => d.division === district.division)
      : DISTRICTS;

  return (
    <div className="space-y-6">
      {/* Control Header */}
      <section className="bg-white border border-[#DCE3DC] rounded-xl p-6">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
          <div>
            <h2 className="font-display text-xl sm:text-2xl font-bold text-[#172019]">
              Crop Risk Analysis
            </h2>
            <p className="text-sm text-[#526056] mt-1 max-w-2xl">
              Evaluate flood, drought, heat stress, and crop disease exposure for any major Bangladesh crop and district, with transparent explanations of why each risk exists.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 shrink-0">
            <label className="block">
              <span className="block text-xs font-medium text-[#526056] mb-1">
                Select Crop
              </span>
              <select
                value={selectedCrop}
                onChange={(e) => setSelectedCrop(e.target.value as CropId)}
                className="w-full md:w-44 bg-[#F6F8F5] border border-[#DCE3DC] rounded-lg px-3 py-2 text-sm font-medium text-[#172019] focus:outline-none focus:ring-2 focus:ring-emerald-700"
              >
                {CROPS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="md:col-span-2">
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

        {/* Crop & District Context Summary */}
        <div className="mt-6 pt-5 border-t border-[#EBF0EB] flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-[#172019]">
              <Sprout className="w-4 h-4 text-emerald-700" aria-hidden="true" />
              <span>{crop.name}</span>
              {preferences.showBengaliTerms && (
                <span className="text-xs font-normal text-[#526056]">
                  ({crop.localName})
                </span>
              )}
              <span className="text-[#94A396]" aria-hidden="true">·</span>
              <span className="text-xs font-normal text-[#526056]">
                {crop.season} · Optimal {crop.optimalTempRangeC}
              </span>
            </div>
            <p className="text-sm text-[#3A473E]">{assessment.summary}</p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right">
              <div className="text-xs text-[#526056]">Composite Risk</div>
              <div className="font-mono tabular-nums text-lg font-bold text-[#172019]">
                {assessment.compositeScore}/100
              </div>
            </div>
            <SeverityIndicator severity={assessment.compositeSeverity} />
          </div>
        </div>
      </section>

      {/* 4 Risk Dimensions with Why Each Risk Exists */}
      <section
        aria-label="Hazard Specific Risk Breakdown"
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
      >
        {assessment.dimensions.map((dim) => {
          const Icon = DIMENSION_ICONS[dim.type];
          const barColor =
            dim.severity === 'High'
              ? 'bg-red-600'
              : dim.severity === 'Medium'
              ? 'bg-amber-600'
              : 'bg-emerald-700';

          return (
            <article
              key={dim.type}
              className="bg-white border border-[#DCE3DC] rounded-xl p-6 flex flex-col justify-between gap-5"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#F1F4EF] text-[#172019] flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5" aria-hidden="true" />
                    </div>
                    <div>
                      <h3 className="font-display text-base font-semibold text-[#172019]">
                        {dim.type} Risk
                      </h3>
                      <p className="text-xs text-[#526056]">{dim.primaryDriver}</p>
                    </div>
                  </div>
                  <SeverityIndicator severity={dim.severity} score={dim.score} />
                </div>

                {/* Progress Bar */}
                <div className="mt-4 w-full h-2 bg-[#EDF1EC] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${barColor}`}
                    style={{ width: `${dim.score}%` }}
                  />
                </div>

                {/* Why This Risk Exists */}
                <div className="mt-5 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-[#172019]">
                    <Info className="w-3.5 h-3.5 text-emerald-800" aria-hidden="true" />
                    <span>Why this risk exists</span>
                  </div>
                  <p className="text-sm text-[#3A473E] leading-relaxed">
                    {dim.explanation}
                  </p>
                </div>
              </div>

              {/* Preventive Recommendation */}
              <div className="pt-4 border-t border-[#EBF0EB]">
                <div className="text-xs font-semibold text-emerald-900">
                  Recommended Mitigation
                </div>
                <p className="text-xs sm:text-sm text-[#526056] mt-1 leading-relaxed">
                  {dim.preventiveAction}
                </p>
              </div>
            </article>
          );
        })}
      </section>

      {/* Cross-District Comparison Table */}
      <section className="bg-white border border-[#DCE3DC] rounded-xl p-6">
        <div className="pb-4 border-b border-[#EBF0EB] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="font-display text-base font-semibold text-[#172019]">
              {crop.name} Risk Across{' '}
              {tableScope === 'division'
                ? `${district.division} Division (${tableDistricts.length} Districts)`
                : 'All 64 Districts (Simulated)'}
            </h3>
            <p className="text-xs text-[#526056] mt-0.5">
              Click any district row to inspect its full risk drivers above
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
                <th className="py-2.5 text-right">Overall Severity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EBF0EB] text-sm">
              {tableDistricts.map((d) => {
                const isSelected = d.id === district.id;
                const rowRisk = getCropDistrictRisk(
                  crop.id,
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
