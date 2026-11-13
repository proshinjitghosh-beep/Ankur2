import React, { useState } from 'react';
import {
  BellRing,
  BotMessageSquare,
  CloudSunRain,
  LayoutDashboard,
  Settings,
  ShieldAlert,
  Sprout,
  Tractor,
  X,
} from 'lucide-react';
import { DISTRICTS } from '../../data/bangladeshAgriData';
import { NavSection, UserPreferences } from '../../types/agri';

interface SidebarProps {
  activeSection: NavSection;
  onSelectSection: (section: NavSection) => void;
  preferences: UserPreferences;
  activeWarningCount: number;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

const NAV_ITEMS: {
  id: NavSection;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'weather', label: 'Weather Intelligence', icon: CloudSunRain },
  { id: 'crop-risk', label: 'Crop Risk Analysis', icon: ShieldAlert },
  { id: 'warnings', label: 'Early Warning Center', icon: BellRing },
  { id: 'advisor', label: 'AI Crop Advisor', icon: BotMessageSquare },
  { id: 'smart-farming', label: 'Smart Farming', icon: Tractor },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export const Sidebar: React.FC<SidebarProps> = ({
  activeSection,
  onSelectSection,
  preferences,
  activeWarningCount,
  mobileOpen,
  onCloseMobile,
}) => {
  const [avatarError, setAvatarError] = useState(false);
  const district = DISTRICTS.find((d) => d.id === preferences.selectedDistrict) ?? DISTRICTS[0];

  const handleNavClick = (section: NavSection) => {
    onSelectSection(section);
    onCloseMobile();
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white border-r border-[#DCE3DC] w-64 shrink-0">
      {/* Brand Block */}
      <div className="px-5 py-5 border-b border-[#E8EDE8] flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => handleNavClick('overview')}
          className="flex items-center gap-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 rounded-lg"
        >
          <div className="w-9 h-9 rounded-lg bg-emerald-800 text-white flex items-center justify-center shrink-0">
            <Sprout className="w-5 h-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <div className="font-display font-bold text-lg tracking-tight text-[#172019] leading-none">
              ANKUR
            </div>
            <p className="text-[11px] text-[#526056] mt-1 truncate">
              Know the Risk. Protect the Harvest.
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={onCloseMobile}
          className="lg:hidden p-1.5 rounded-lg text-[#526056] hover:bg-[#F1F4EF] hover:text-[#172019]"
          aria-label="Close navigation menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto" aria-label="Primary Navigation">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleNavClick(item.id)}
              className={`w-full flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 ${
                isActive
                  ? 'bg-emerald-800 text-white'
                  : 'text-[#3A473E] hover:bg-[#F1F4EF] hover:text-[#172019]'
              }`}
            >
              <span className="flex items-center gap-2.5 min-w-0">
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive ? 'text-emerald-100' : 'text-[#526056]'
                  }`}
                  aria-hidden="true"
                />
                <span className="truncate">{item.label}</span>
              </span>
              {item.id === 'warnings' && activeWarningCount > 0 && (
                <span
                  className={`font-mono tabular-nums text-xs px-1.5 py-0.5 rounded ${
                    isActive
                      ? 'bg-emerald-700 text-white'
                      : 'bg-amber-100 text-amber-900'
                  }`}
                >
                  {activeWarningCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Live Weather & Model Notice */}
      <div className="px-4 py-3 mx-3 mb-3 rounded-lg bg-[#F5F7F3] border border-[#E1E7E0]">
        <div className="text-xs font-semibold text-[#172019]">Live Weather & Risk Models</div>
        <p className="text-[11px] text-[#526056] mt-0.5 leading-relaxed">
          Current, forecast, and archive weather via Open-Meteo APIs; crop risk & advisory rules in prototype mode.
        </p>
      </div>

      {/* Farmer Profile Footer */}
      <div className="px-4 py-3.5 border-t border-[#E8EDE8] flex items-center gap-3">
        {!avatarError ? (
          <img
            src="/src/assets/images/farmer_profile_avatar_1794556571897.jpg"
            alt={preferences.farmerName}
            referrerPolicy="no-referrer"
            onError={() => setAvatarError(true)}
            className="w-9 h-9 rounded-lg object-cover border border-[#DCE3DC] shrink-0"
          />
        ) : (
          <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-900 font-semibold text-xs flex items-center justify-center shrink-0">
            {preferences.farmerName
              .split(' ')
              .map((n) => n[0])
              .join('')
              .slice(0, 2)}
          </div>
        )}
        <div className="min-w-0">
          <div className="text-sm font-medium text-[#172019] truncate">
            {preferences.farmerName}
          </div>
          <div className="text-xs text-[#526056] truncate">
            {district.name}, {district.division} · {preferences.farmSizeBigha} Bigha
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block h-screen sticky top-0 z-30">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/40"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="relative z-10 h-full">{sidebarContent}</div>
        </div>
      )}
    </>
  );
};
