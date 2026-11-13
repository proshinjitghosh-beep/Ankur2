import React, { useState } from 'react';
import {
  BotMessageSquare,
  Check,
  Search,
} from 'lucide-react';
import { DISTRICTS, EARLY_WARNINGS } from '../../data/bangladeshAgriData';
import {
  RiskSeverity,
  UserPreferences,
  WarningCategory,
} from '../../types/agri';
import { SeverityIndicator } from '../common/SeverityIndicator';

interface EarlyWarningCenterViewProps {
  preferences: UserPreferences;
  acknowledgedIds: string[];
  onToggleAcknowledge: (id: string) => void;
  onAskAdvisorAboutAlert: (prompt: string) => void;
}

const CATEGORIES: ('All' | WarningCategory)[] = [
  'All',
  'Flood',
  'Heavy Rainfall',
  'Drought',
  'Heat Stress',
  'Crop Disease',
];

export const EarlyWarningCenterView: React.FC<EarlyWarningCenterViewProps> = ({
  preferences,
  acknowledgedIds,
  onToggleAcknowledge,
  onAskAdvisorAboutAlert,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<'All' | WarningCategory>('All');
  const [severityFilter, setSeverityFilter] = useState<'All' | RiskSeverity>('All');
  const [onlyMyDistrict, setOnlyMyDistrict] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const activeDistrict =
    DISTRICTS.find((d) => d.id === preferences.selectedDistrict) ?? DISTRICTS[0];

  const filteredWarnings = EARLY_WARNINGS.filter((alert) => {
    if (selectedCategory !== 'All' && alert.category !== selectedCategory) return false;
    if (severityFilter !== 'All' && alert.severity !== severityFilter) return false;
    if (onlyMyDistrict && !alert.districtIds.includes(activeDistrict.id)) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        alert.title.toLowerCase().includes(q) ||
        alert.areaLabel.toLowerCase().includes(q) ||
        alert.impactSummary.toLowerCase().includes(q) ||
        alert.affectedCrops.some((c) => c.toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header & Filter Bar */}
      <section className="bg-white border border-[#DCE3DC] rounded-xl p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className="font-display text-xl sm:text-2xl font-bold text-[#172019]">
              Early Warning Center
            </h2>
            <p className="text-sm text-[#526056] mt-1">
              Simulated multi-hazard advisories covering flood, heavy rainfall, drought, heat stress, and crop disease alerts across Bangladesh.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex items-center gap-2 text-xs font-medium text-[#172019] bg-[#F6F8F5] border border-[#DCE3DC] rounded-lg px-3 py-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={onlyMyDistrict}
                onChange={(e) => setOnlyMyDistrict(e.target.checked)}
                className="rounded border-[#94A396] text-emerald-800 focus:ring-emerald-700"
              />
              <span>Only {activeDistrict.name} alerts</span>
            </label>

            <div className="relative">
              <Search
                className="w-4 h-4 text-[#647368] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search alerts or crops..."
                className="pl-9 pr-3 py-2 text-sm bg-[#F6F8F5] border border-[#DCE3DC] rounded-lg text-[#172019] placeholder-[#647368] focus:outline-none focus:ring-2 focus:ring-emerald-700 w-56"
              />
            </div>
          </div>
        </div>

        {/* Category Tabs & Severity Filter */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 pt-4 border-t border-[#EBF0EB]">
          <div className="flex flex-wrap items-center gap-1 p-1 bg-[#F1F4EF] rounded-lg">
            {CATEGORIES.map((cat) => {
              const active = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? 'bg-white text-[#172019] shadow-xs font-semibold'
                      : 'text-[#526056] hover:text-[#172019]'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-1 p-1 bg-[#F1F4EF] rounded-lg self-start md:self-auto">
            {(['All', 'High', 'Medium', 'Low'] as const).map((sev) => (
              <button
                key={sev}
                type="button"
                onClick={() => setSeverityFilter(sev)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  severityFilter === sev
                    ? 'bg-white text-[#172019] shadow-xs font-semibold'
                    : 'text-[#526056] hover:text-[#172019]'
                }`}
              >
                {sev === 'All' ? 'All Severities' : sev}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Warning Feed */}
      {filteredWarnings.length === 0 ? (
        <section className="bg-white border border-[#DCE3DC] rounded-xl p-10 text-center space-y-3">
          <h3 className="font-display text-base font-semibold text-[#172019]">
            No active warnings match your current filters
          </h3>
          <p className="text-sm text-[#526056] max-w-md mx-auto">
            Try switching off the district-only filter or resetting category and severity filters to view all simulated Bangladesh advisories.
          </p>
          <button
            type="button"
            onClick={() => {
              setSelectedCategory('All');
              setSeverityFilter('All');
              setOnlyMyDistrict(false);
              setSearchQuery('');
            }}
            className="px-4 py-2 rounded-lg bg-emerald-800 text-white text-sm font-medium hover:bg-emerald-900 transition-colors"
          >
            Reset Filters
          </button>
        </section>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredWarnings.map((alert) => {
            const isAck = acknowledgedIds.includes(alert.id);
            const affectsUserDistrict = alert.districtIds.includes(activeDistrict.id);

            return (
              <article
                key={alert.id}
                className={`bg-white border rounded-xl p-6 flex flex-col justify-between gap-5 ${
                  affectsUserDistrict ? 'border-emerald-700/40' : 'border-[#DCE3DC]'
                }`}
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="text-xs text-[#526056] font-medium">
                        {alert.category} · {alert.validWindow}
                        {affectsUserDistrict && (
                          <span className="text-emerald-800 font-semibold">
                            {' '}
                            · Impacts {activeDistrict.name}
                          </span>
                        )}
                      </div>
                      <h3 className="font-display text-lg font-semibold text-[#172019] leading-snug">
                        {alert.title}
                      </h3>
                    </div>
                    <SeverityIndicator severity={alert.severity} compact />
                  </div>

                  <div className="text-xs text-[#526056] space-y-1">
                    <div>
                      <span className="font-medium text-[#172019]">Region:</span>{' '}
                      {alert.areaLabel}
                    </div>
                    <div className="font-mono tabular-nums">
                      <span className="font-sans font-medium text-[#172019]">
                        Trigger:
                      </span>{' '}
                      {alert.triggerMetric}
                    </div>
                    <div>
                      <span className="font-medium text-[#172019]">
                        Crops at risk:
                      </span>{' '}
                      {alert.affectedCrops.join(', ')}
                    </div>
                  </div>

                  <p className="text-sm text-[#3A473E] leading-relaxed">
                    {alert.impactSummary}
                  </p>

                  <div className="pt-3 border-t border-[#EBF0EB]">
                    <div className="text-xs font-semibold text-[#172019] mb-2">
                      Farmer Action Checklist
                    </div>
                    <ul className="space-y-1.5">
                      {alert.actionChecklist.map((step, i) => (
                        <li
                          key={i}
                          className="text-xs sm:text-sm text-[#3A473E] flex items-start gap-2"
                        >
                          <span className="font-mono text-xs text-emerald-800 font-semibold mt-0.5">
                            {i + 1}.
                          </span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="pt-4 border-t border-[#EBF0EB] flex flex-wrap items-center justify-between gap-3">
                  <span className="text-xs text-[#647368]">{alert.issuedLabel}</span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onToggleAcknowledge(alert.id)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap ${
                        isAck
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                          : 'bg-white border-[#DCE3DC] text-[#3A473E] hover:bg-[#F6F8F5]'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>{isAck ? 'Acknowledged' : 'Mark Reviewed'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        onAskAdvisorAboutAlert(
                          `How should I protect my crops from "${alert.title}" (${alert.category}) in ${activeDistrict.name}?`
                        )
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-800 text-white hover:bg-emerald-900 transition-colors whitespace-nowrap"
                    >
                      <BotMessageSquare className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Ask Advisor</span>
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
