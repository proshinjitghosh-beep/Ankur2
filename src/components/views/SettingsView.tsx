import React, { useState } from 'react';
import { CheckCircle2, RotateCcw } from 'lucide-react';
import { CROPS } from '../../data/bangladeshAgriData';
import {
  CropId,
  RiskSeverity,
  UserPreferences,
} from '../../types/agri';
import { LocationSelector } from '../common/LocationSelector';

interface SettingsViewProps {
  preferences: UserPreferences;
  onUpdatePreferences: (next: UserPreferences) => void;
  onResetDefaults: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  preferences,
  onUpdatePreferences,
  onResetDefaults,
}) => {
  const [savedNotice, setSavedNotice] = useState(false);

  const updateField = <K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K]
  ) => {
    onUpdatePreferences({
      ...preferences,
      [key]: value,
    });
    setSavedNotice(true);
    window.setTimeout(() => setSavedNotice(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="font-display text-xl sm:text-2xl font-bold text-[#172019]">
            Farm & Platform Settings
          </h2>
          <p className="text-sm text-[#526056] mt-0.5">
            Configure your Bangladesh farm profile, alert thresholds, and unit preferences. Changes apply immediately across all dashboards.
          </p>
        </div>

        {savedNotice && (
          <div className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-md px-3 py-1.5 self-start sm:self-auto">
            <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Preferences updated</span>
          </div>
        )}
      </div>

      {/* Farm & Location Profile */}
      <section className="bg-white border border-[#DCE3DC] rounded-xl p-6 space-y-5">
        <div className="pb-3 border-b border-[#EBF0EB]">
          <h3 className="font-display text-base font-semibold text-[#172019]">
            Farm & Location Profile
          </h3>
          <p className="text-xs text-[#526056] mt-0.5">
            Used to tailor weather telemetry, crop risk scores, and AI Crop Advisor recommendations
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="block">
            <span className="block text-xs font-medium text-[#526056] mb-1">
              Farmer / Manager Name
            </span>
            <input
              type="text"
              value={preferences.farmerName}
              onChange={(e) => updateField('farmerName', e.target.value)}
              className="w-full bg-[#F6F8F5] border border-[#DCE3DC] rounded-lg px-3 py-2 text-sm text-[#172019] focus:outline-none focus:ring-2 focus:ring-emerald-700"
            />
          </label>

          <label className="block">
            <span className="block text-xs font-medium text-[#526056] mb-1">
              Farm / Co-op Name
            </span>
            <input
              type="text"
              value={preferences.farmName}
              onChange={(e) => updateField('farmName', e.target.value)}
              className="w-full bg-[#F6F8F5] border border-[#DCE3DC] rounded-lg px-3 py-2 text-sm text-[#172019] focus:outline-none focus:ring-2 focus:ring-emerald-700"
            />
          </label>

          <div className="sm:col-span-2">
            <LocationSelector
              selectedDistrict={preferences.selectedDistrict}
              onChangeDistrict={(nextId) => updateField('selectedDistrict', nextId)}
              variant="panel"
              divisionLabel="Primary Division"
              districtLabel="Primary District"
            />
          </div>

          <label className="block">
            <span className="block text-xs font-medium text-[#526056] mb-1">
              Cultivated Area (Bigha)
            </span>
            <input
              type="number"
              min={0.5}
              max={100}
              step={0.5}
              value={preferences.farmSizeBigha}
              onChange={(e) =>
                updateField(
                  'farmSizeBigha',
                  Math.max(0.5, Number(e.target.value) || 1)
                )
              }
              className="w-full bg-[#F6F8F5] border border-[#DCE3DC] rounded-lg px-3 py-2 text-sm font-mono tabular-nums text-[#172019] focus:outline-none focus:ring-2 focus:ring-emerald-700"
            />
          </label>

          <label className="block">
            <span className="block text-xs font-medium text-[#526056] mb-1">
              Primary Monitored Crop
            </span>
            <select
              value={preferences.primaryCrop}
              onChange={(e) => updateField('primaryCrop', e.target.value as CropId)}
              className="w-full bg-[#F6F8F5] border border-[#DCE3DC] rounded-lg px-3 py-2 text-sm text-[#172019] focus:outline-none focus:ring-2 focus:ring-emerald-700"
            >
              {CROPS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.season})
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="block text-xs font-medium text-[#526056] mb-1">
              Secondary Crop
            </span>
            <select
              value={preferences.secondaryCrop}
              onChange={(e) =>
                updateField('secondaryCrop', e.target.value as CropId)
              }
              className="w-full bg-[#F6F8F5] border border-[#DCE3DC] rounded-lg px-3 py-2 text-sm text-[#172019] focus:outline-none focus:ring-2 focus:ring-emerald-700"
            >
              {CROPS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {/* Alert & Display Preferences */}
      <section className="bg-white border border-[#DCE3DC] rounded-xl p-6 space-y-5">
        <div className="pb-3 border-b border-[#EBF0EB]">
          <h3 className="font-display text-base font-semibold text-[#172019]">
            Alerts & Display Preferences
          </h3>
          <p className="text-xs text-[#526056] mt-0.5">
            Simulated farmer notification channels and display formatting
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-medium text-[#172019]">
                Temperature Unit
              </div>
              <div className="text-xs text-[#526056]">
                Choose Celsius (°C, standard in Bangladesh) or Fahrenheit (°F)
              </div>
            </div>
            <div className="inline-flex items-center p-1 bg-[#F1F4EF] rounded-lg">
              {(['C', 'F'] as const).map((unit) => (
                <button
                  key={unit}
                  type="button"
                  onClick={() => updateField('tempUnit', unit)}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                    preferences.tempUnit === unit
                      ? 'bg-white text-[#172019] shadow-xs'
                      : 'text-[#526056] hover:text-[#172019]'
                  }`}
                >
                  °{unit}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 pt-3 border-t border-[#EBF0EB]">
            <div>
              <div className="text-sm font-medium text-[#172019]">
                SMS Early Warning Dispatch (Simulated)
              </div>
              <div className="text-xs text-[#526056]">
                Receive concise Bangla/English alerts 48 hours before heavy rain or flood peaks
              </div>
            </div>
            <input
              type="checkbox"
              checked={preferences.smsAlertsEnabled}
              onChange={(e) => updateField('smsAlertsEnabled', e.target.checked)}
              className="w-4 h-4 rounded border-[#94A396] text-emerald-800 focus:ring-emerald-700"
            />
          </div>

          <div className="flex items-center justify-between gap-4 pt-3 border-t border-[#EBF0EB]">
            <div>
              <div className="text-sm font-medium text-[#172019]">
                Voice Advisory Calls (Simulated)
              </div>
              <div className="text-xs text-[#526056]">
                Automated regional dialect audio summary for High severity alerts
              </div>
            </div>
            <input
              type="checkbox"
              checked={preferences.voiceAlertsEnabled}
              onChange={(e) => updateField('voiceAlertsEnabled', e.target.checked)}
              className="w-4 h-4 rounded border-[#94A396] text-emerald-800 focus:ring-emerald-700"
            />
          </div>

          <div className="flex items-center justify-between gap-4 pt-3 border-t border-[#EBF0EB]">
            <div>
              <div className="text-sm font-medium text-[#172019]">
                Show Bengali Crop Names & Local Varieties
              </div>
              <div className="text-xs text-[#526056]">
                Display Bangla crop titles alongside BRRI/BARI variety codes
              </div>
            </div>
            <input
              type="checkbox"
              checked={preferences.showBengaliTerms}
              onChange={(e) => updateField('showBengaliTerms', e.target.checked)}
              className="w-4 h-4 rounded border-[#94A396] text-emerald-800 focus:ring-emerald-700"
            />
          </div>

          <div className="flex items-center justify-between gap-4 pt-3 border-t border-[#EBF0EB]">
            <div>
              <div className="text-sm font-medium text-[#172019]">
                Alert Sensitivity Threshold
              </div>
              <div className="text-xs text-[#526056]">
                Minimum severity level to highlight in field task reminders
              </div>
            </div>
            <select
              value={preferences.floodSensitivity}
              onChange={(e) =>
                updateField('floodSensitivity', e.target.value as RiskSeverity)
              }
              className="bg-[#F6F8F5] border border-[#DCE3DC] rounded-lg px-3 py-1.5 text-xs font-medium text-[#172019] focus:outline-none focus:ring-2 focus:ring-emerald-700"
            >
              <option value="Low">Low & Above</option>
              <option value="Medium">Medium & Above</option>
              <option value="High">High Only</option>
            </select>
          </div>
        </div>
      </section>

      {/* Simulated Data Transparency & Reset */}
      <section className="bg-[#F1F4EF] border border-[#DCE3DC] rounded-xl p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1 max-w-xl">
          <h3 className="font-display text-sm font-semibold text-[#172019]">
            Simulated Prototype Transparency
          </h3>
          <p className="text-xs text-[#526056] leading-relaxed">
            This frontend prototype operates completely offline with realistic agro-climatic mock datasets calibrated for Bangladesh districts and crops. No external paid APIs or API keys are used.
          </p>
        </div>

        <button
          type="button"
          onClick={onResetDefaults}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white border border-[#DCE3DC] text-xs font-semibold text-[#172019] hover:bg-[#FAFBF9] transition-colors whitespace-nowrap shrink-0"
        >
          <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Reset Demo Data</span>
        </button>
      </section>
    </div>
  );
};
