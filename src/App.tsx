import React, { useEffect, useMemo, useState } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { TopBar } from './components/layout/TopBar';
import {
  AiCropAdvisorView,
  generateSimulatedAdvisorResponse,
} from './components/views/AiCropAdvisorView';
import { CropRiskAnalysisView } from './components/views/CropRiskAnalysisView';
import { EarlyWarningCenterView } from './components/views/EarlyWarningCenterView';
import { OverviewView } from './components/views/OverviewView';
import { SettingsView } from './components/views/SettingsView';
import { SmartFarmingView } from './components/views/SmartFarmingView';
import { WeatherIntelligenceView } from './components/views/WeatherIntelligenceView';
import {
  DISTRICTS,
  EARLY_WARNINGS,
  INITIAL_FARMING_ACTIVITIES,
  INITIAL_TRACKED_PLOTS,
  mergeLiveWeatherIntoDistrict,
} from './data/bangladeshAgriData';
import { fetchForecastByCoordinates } from './services/weatherApi';
import {
  AdvisorMessage,
  CropId,
  DistrictId,
  DistrictProfile,
  FarmingActivityItem,
  LiveWeatherForecastPayload,
  NavSection,
  TrackedCropPlot,
  UserPreferences,
} from './types/agri';

const DEFAULT_PREFERENCES: UserPreferences = {
  farmerName: 'Tariqul Islam',
  farmName: 'Karatoya Krishi Khamar',
  farmSizeBigha: 5,
  selectedDistrict: 'bogura',
  primaryCrop: 'aman-rice',
  secondaryCrop: 'potato',
  tempUnit: 'C',
  smsAlertsEnabled: true,
  voiceAlertsEnabled: false,
  floodSensitivity: 'Medium',
  showBengaliTerms: true,
};

const INITIAL_ADVISOR_MESSAGES: AdvisorMessage[] = [
  {
    id: 'msg-welcome',
    role: 'assistant',
    content:
      'Welcome to the ANKUR AI Crop Advisor. Ask about flood drainage, Alternate Wetting & Drying (AWD) irrigation, disease scouting, or fertilizer timing for your district.',
    recommendations: [
      'Select your Bangladesh district and crop at the top right for localized guidance.',
      'Tap any quick question above or type your own field question below.',
    ],
    timingNote: 'Prototype Advisory · Uses live Open-Meteo weather context when available',
    timestampLabel: 'Ready',
  },
];

export default function App() {
  const [activeSection, setActiveSection] = useState<NavSection>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [plots, setPlots] = useState<TrackedCropPlot[]>(INITIAL_TRACKED_PLOTS);
  const [activities, setActivities] = useState<FarmingActivityItem[]>(
    INITIAL_FARMING_ACTIVITIES
  );
  const [acknowledgedIds, setAcknowledgedIds] = useState<string[]>([]);
  const [advisorMessages, setAdvisorMessages] = useState<AdvisorMessage[]>(
    INITIAL_ADVISOR_MESSAGES
  );
  const [isAdvisorGenerating, setIsAdvisorGenerating] = useState(false);

  // Live Open-Meteo forecast cache keyed by district ID
  const [liveWeatherByDistrict, setLiveWeatherByDistrict] = useState<
    Partial<Record<DistrictId, LiveWeatherForecastPayload>>
  >({});
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const [weatherRefreshNonce, setWeatherRefreshNonce] = useState(0);

  const baseActiveDistrict = useMemo(
    () =>
      DISTRICTS.find((d) => d.id === preferences.selectedDistrict) ?? DISTRICTS[0],
    [preferences.selectedDistrict]
  );

  // Fetch real Open-Meteo weather whenever selected district changes or refresh requested
  useEffect(() => {
    const controller = new AbortController();
    const targetDistrict = baseActiveDistrict;

    setWeatherLoading(true);
    setWeatherError(null);

    fetchForecastByCoordinates({
      latitude: targetDistrict.latitude,
      longitude: targetDistrict.longitude,
      days: 14,
      signal: controller.signal,
    })
      .then((payload) => {
        setLiveWeatherByDistrict((prev) => ({
          ...prev,
          [targetDistrict.id]: payload,
        }));
        setWeatherLoading(false);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setWeatherError(
          err instanceof Error ? err.message : 'Unable to load live Open-Meteo weather'
        );
        setWeatherLoading(false);
      });

    return () => controller.abort();
  }, [baseActiveDistrict, weatherRefreshNonce]);

  const activeDistrictProfile: DistrictProfile = useMemo(() => {
    const live = liveWeatherByDistrict[baseActiveDistrict.id];
    return live ? mergeLiveWeatherIntoDistrict(baseActiveDistrict, live) : baseActiveDistrict;
  }, [baseActiveDistrict, liveWeatherByDistrict]);

  const activeDistrictWarningsCount = EARLY_WARNINGS.filter(
    (w) =>
      w.districtIds.includes(preferences.selectedDistrict) &&
      !acknowledgedIds.includes(w.id)
  ).length;

  const handleDistrictChange = (districtId: DistrictId) => {
    setPreferences((prev) => ({ ...prev, selectedDistrict: districtId }));
  };

  const handleToggleAcknowledge = (id: string) => {
    setAcknowledgedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSendAdvisorMessage = async (
    query: string,
    districtId: DistrictId,
    cropId: CropId
  ) => {
    const nowLabel = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    const userMsg: AdvisorMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: query,
      timestampLabel: nowLabel,
    };

    setAdvisorMessages((prev) => [...prev, userMsg]);
    setIsAdvisorGenerating(true);

    const baseTarget = DISTRICTS.find((d) => d.id === districtId) ?? DISTRICTS[0];
    let liveForTarget = liveWeatherByDistrict[districtId];

    if (!liveForTarget) {
      try {
        liveForTarget = await fetchForecastByCoordinates({
          latitude: baseTarget.latitude,
          longitude: baseTarget.longitude,
          days: 14,
        });
        setLiveWeatherByDistrict((prev) => ({
          ...prev,
          [districtId]: liveForTarget,
        }));
      } catch {
        // Fallback cleanly to baseTarget if offline
      }
    }

    const resolvedDistrict = liveForTarget
      ? mergeLiveWeatherIntoDistrict(baseTarget, liveForTarget)
      : baseTarget;

    const reply = generateSimulatedAdvisorResponse(
      query,
      districtId,
      cropId,
      resolvedDistrict
    );
    const assistantMsg: AdvisorMessage = {
      id: `ai-${Date.now()}`,
      role: 'assistant',
      content: reply.content,
      recommendations: reply.recommendations,
      timingNote: reply.timingNote,
      timestampLabel: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };
    setAdvisorMessages((prev) => [...prev, assistantMsg]);
    setIsAdvisorGenerating(false);
  };

  const handleAskAdvisorAboutAlert = (prompt: string) => {
    setActiveSection('advisor');
    handleSendAdvisorMessage(
      prompt,
      preferences.selectedDistrict,
      preferences.primaryCrop
    );
  };

  const handleToggleActivity = (id: string) => {
    setActivities((prev) =>
      prev.map((a) => (a.id === id ? { ...a, completed: !a.completed } : a))
    );
  };

  const handleAddActivity = (
    item: Omit<FarmingActivityItem, 'id' | 'completed'>
  ) => {
    setActivities((prev) => [
      {
        ...item,
        id: `act-${Date.now()}`,
        completed: false,
      },
      ...prev,
    ]);
  };

  const handleAdjustPlotMoisture = (plotId: string, delta: number) => {
    setPlots((prev) =>
      prev.map((p) => {
        if (p.id !== plotId) return p;
        const nextMoisture = Math.max(15, Math.min(98, p.soilMoisturePct + delta));
        let nextAction = p.irrigationAction;
        if (nextMoisture < 45) {
          nextAction = 'Apply light supplemental irrigation (20–25 mm)';
        } else if (nextMoisture > 80) {
          nextAction = 'Excess moisture — open drainage outlet & hold irrigation';
        } else {
          nextAction = 'Moisture in healthy range — monitor forecast before pumping';
        }
        return {
          ...p,
          soilMoisturePct: nextMoisture,
          irrigationAction: nextAction,
        };
      })
    );
  };

  const handleResetDefaults = () => {
    setPreferences(DEFAULT_PREFERENCES);
    setPlots(INITIAL_TRACKED_PLOTS);
    setActivities(INITIAL_FARMING_ACTIVITIES);
    setAcknowledgedIds([]);
    setAdvisorMessages(INITIAL_ADVISOR_MESSAGES);
  };

  return (
    <div className="min-h-screen flex bg-[#F6F8F5] text-[#172019]">
      <Sidebar
        activeSection={activeSection}
        onSelectSection={setActiveSection}
        preferences={preferences}
        activeWarningCount={activeDistrictWarningsCount}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <TopBar
          activeSection={activeSection}
          selectedDistrict={preferences.selectedDistrict}
          onChangeDistrict={handleDistrictChange}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          onNavigate={setActiveSection}
        />

        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 max-w-[1360px] w-full mx-auto">
          {activeSection === 'overview' && (
            <OverviewView
              preferences={preferences}
              plots={plots}
              liveDistrict={activeDistrictProfile}
              weatherLoading={weatherLoading}
              weatherError={weatherError}
              onNavigate={setActiveSection}
            />
          )}

          {activeSection === 'weather' && (
            <WeatherIntelligenceView
              preferences={preferences}
              liveDistrict={activeDistrictProfile}
              weatherLoading={weatherLoading}
              weatherError={weatherError}
              onRefreshWeather={() => setWeatherRefreshNonce((n) => n + 1)}
            />
          )}

          {activeSection === 'crop-risk' && (
            <CropRiskAnalysisView
              preferences={preferences}
              liveDistrict={activeDistrictProfile}
              onChangeDistrict={handleDistrictChange}
            />
          )}

          {activeSection === 'warnings' && (
            <EarlyWarningCenterView
              preferences={preferences}
              acknowledgedIds={acknowledgedIds}
              onToggleAcknowledge={handleToggleAcknowledge}
              onAskAdvisorAboutAlert={handleAskAdvisorAboutAlert}
            />
          )}

          {activeSection === 'advisor' && (
            <AiCropAdvisorView
              preferences={preferences}
              messages={advisorMessages}
              onSendMessage={handleSendAdvisorMessage}
              onClearChat={() => setAdvisorMessages(INITIAL_ADVISOR_MESSAGES)}
              isGenerating={isAdvisorGenerating}
            />
          )}

          {activeSection === 'smart-farming' && (
            <SmartFarmingView
              preferences={preferences}
              plots={plots}
              activities={activities}
              onToggleActivity={handleToggleActivity}
              onAddActivity={handleAddActivity}
              onAdjustPlotMoisture={handleAdjustPlotMoisture}
            />
          )}

          {activeSection === 'settings' && (
            <SettingsView
              preferences={preferences}
              onUpdatePreferences={setPreferences}
              onResetDefaults={handleResetDefaults}
            />
          )}
        </main>

        <footer className="border-t border-[#E2E8E1] px-4 sm:px-6 lg:px-8 py-4 text-xs text-[#647368] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 max-w-[1360px] w-full mx-auto">
          <div>
            ANKUR · Know the Risk. Protect the Harvest. · Built for Smallholder Farmers in Bangladesh
          </div>
          <div>
            Live meteorological data via Open-Meteo Forecast & Archive APIs · Crop advisories in prototype mode
          </div>
        </footer>
      </div>
    </div>
  );
}
