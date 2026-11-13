import React from 'react';
import { BotMessageSquare, Menu } from 'lucide-react';
import { DistrictId, NavSection } from '../../types/agri';
import { LocationSelector } from '../common/LocationSelector';

interface TopBarProps {
  activeSection: NavSection;
  selectedDistrict: DistrictId;
  onChangeDistrict: (districtId: DistrictId) => void;
  onOpenMobileMenu: () => void;
  onNavigate: (section: NavSection) => void;
}

const SECTION_TITLES: Record<NavSection, string> = {
  overview: 'Overview',
  weather: 'Weather Intelligence',
  'crop-risk': 'Crop Risk Analysis',
  warnings: 'Early Warning Center',
  advisor: 'AI Crop Advisor',
  'smart-farming': 'Smart Farming',
  settings: 'Settings',
};

export const TopBar: React.FC<TopBarProps> = ({
  activeSection,
  selectedDistrict,
  onChangeDistrict,
  onOpenMobileMenu,
  onNavigate,
}) => {
  return (
    <header className="sticky top-0 z-20 h-16 bg-white/95 backdrop-blur-sm border-b border-[#DCE3DC] px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
      {/* Left: Mobile Trigger & Breadcrumb */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 -ml-2 rounded-lg text-[#3A473E] hover:bg-[#F1F4EF] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 text-sm min-w-0">
          <span className="font-display font-semibold text-[#526056] hidden sm:inline whitespace-nowrap">
            ANKUR
          </span>
          <span className="text-[#94A396] hidden sm:inline" aria-hidden="true">
            /
          </span>
          <h1 className="font-display font-semibold text-[#172019] truncate">
            {SECTION_TITLES[activeSection]}
          </h1>
        </div>
      </div>

      {/* Right: Division + Searchable District Selector & 1 Primary Action */}
      <div className="flex items-center gap-3 shrink-0">
        <LocationSelector
          selectedDistrict={selectedDistrict}
          onChangeDistrict={onChangeDistrict}
          variant="topbar"
        />

        {activeSection !== 'advisor' && (
          <button
            type="button"
            onClick={() => onNavigate('advisor')}
            className="hidden sm:inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-emerald-800 text-white text-xs sm:text-sm font-medium hover:bg-emerald-900 transition-colors whitespace-nowrap shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
          >
            <BotMessageSquare className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>Ask AI Advisor</span>
          </button>
        )}
      </div>
    </header>
  );
};
