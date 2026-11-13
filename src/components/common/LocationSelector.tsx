import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, MapPin, Search, X } from 'lucide-react';
import {
  BANGLADESH_DISTRICTS,
  BANGLADESH_DIVISIONS,
} from '../../data/bangladeshLocations';
import { DistrictId, DivisionName } from '../../types/agri';

interface LocationSelectorProps {
  selectedDistrict: DistrictId;
  onChangeDistrict: (districtId: DistrictId) => void;
  variant?: 'topbar' | 'panel' | 'inline';
  divisionLabel?: string;
  districtLabel?: string;
}

export const LocationSelector: React.FC<LocationSelectorProps> = ({
  selectedDistrict,
  onChangeDistrict,
  variant = 'panel',
  divisionLabel = 'Division',
  districtLabel = 'District',
}) => {
  const activeDistrictMeta = useMemo(
    () =>
      BANGLADESH_DISTRICTS.find((d) => d.id === selectedDistrict) ??
      BANGLADESH_DISTRICTS[0],
    [selectedDistrict]
  );

  const [selectedDivision, setSelectedDivision] = useState<'All' | DivisionName>(
    activeDistrictMeta.division
  );
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const containerRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Sync division dropdown when district is changed externally (e.g. from TopBar or Settings)
  useEffect(() => {
    setSelectedDivision((prev) =>
      prev === 'All' ? 'All' : activeDistrictMeta.division
    );
  }, [activeDistrictMeta.division]);

  // Close searchable dropdown on outside click or Escape
  useEffect(() => {
    if (!dropdownOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [dropdownOpen]);

  useEffect(() => {
    if (dropdownOpen) {
      window.setTimeout(() => {
        searchInputRef.current?.focus();
      }, 10);
    } else {
      setSearchQuery('');
    }
  }, [dropdownOpen]);

  const divisionDistricts = useMemo(() => {
    const base =
      selectedDivision === 'All'
        ? BANGLADESH_DISTRICTS
        : BANGLADESH_DISTRICTS.filter((d) => d.division === selectedDivision);
    return [...base].sort((a, b) => a.name.localeCompare(b.name));
  }, [selectedDivision]);

  const filteredDistricts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return divisionDistricts;
    return divisionDistricts.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.division.toLowerCase().includes(q)
    );
  }, [divisionDistricts, searchQuery]);

  const handleDivisionChange = (nextDivision: 'All' | DivisionName) => {
    setSelectedDivision(nextDivision);
    setSearchQuery('');
    if (nextDivision !== 'All') {
      const stillInDivision =
        activeDistrictMeta.division === nextDivision;
      if (!stillInDivision) {
        const divMeta = BANGLADESH_DIVISIONS.find(
          (div) => div.name === nextDivision
        );
        if (divMeta) {
          onChangeDistrict(divMeta.headquartersId);
        }
      }
    }
  };

  const handleSelectDistrict = (districtId: DistrictId) => {
    const chosen = BANGLADESH_DISTRICTS.find((d) => d.id === districtId);
    if (chosen && selectedDivision !== 'All') {
      setSelectedDivision(chosen.division);
    }
    onChangeDistrict(districtId);
    setDropdownOpen(false);
    setSearchQuery('');
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && filteredDistricts.length > 0) {
      e.preventDefault();
      handleSelectDistrict(filteredDistricts[0].id);
    }
  };

  const isTopbar = variant === 'topbar';
  const isInline = variant === 'inline';

  const selectControlClass = isTopbar
    ? 'bg-[#F6F8F5] border border-[#DCE3DC] rounded-lg px-2.5 py-1.5 text-xs sm:text-sm font-medium text-[#172019] focus:outline-none focus:ring-2 focus:ring-emerald-700 cursor-pointer'
    : isInline
    ? 'bg-[#F6F8F5] border border-[#DCE3DC] rounded-lg px-2.5 py-1.5 text-xs font-medium text-[#172019] focus:outline-none focus:ring-2 focus:ring-emerald-700 cursor-pointer'
    : 'w-full bg-[#F6F8F5] border border-[#DCE3DC] rounded-lg px-3 py-2 text-sm font-medium text-[#172019] focus:outline-none focus:ring-2 focus:ring-emerald-700 cursor-pointer';

  const triggerButtonClass = isTopbar
    ? 'inline-flex items-center justify-between gap-2 bg-[#F6F8F5] border border-[#DCE3DC] rounded-lg px-2.5 py-1.5 text-xs sm:text-sm font-medium text-[#172019] hover:border-emerald-700/50 focus:outline-none focus:ring-2 focus:ring-emerald-700 transition-colors min-w-[148px] sm:min-w-[175px]'
    : isInline
    ? 'inline-flex items-center justify-between gap-2 bg-[#F6F8F5] border border-[#DCE3DC] rounded-lg px-3 py-1.5 text-xs font-medium text-[#172019] hover:border-emerald-700/50 focus:outline-none focus:ring-2 focus:ring-emerald-700 transition-colors min-w-[160px]'
    : 'w-full inline-flex items-center justify-between gap-2 bg-[#F6F8F5] border border-[#DCE3DC] rounded-lg px-3 py-2 text-sm font-medium text-[#172019] hover:border-emerald-700/50 focus:outline-none focus:ring-2 focus:ring-emerald-700 transition-colors';

  return (
    <div
      ref={containerRef}
      className={
        isTopbar || isInline
          ? 'flex items-center gap-2 relative'
          : 'grid grid-cols-1 sm:grid-cols-2 gap-3 relative'
      }
    >
      {/* Division Dropdown */}
      {isTopbar ? (
        <label className="hidden md:flex items-center gap-1.5 shrink-0">
          <span className="sr-only">{divisionLabel}</span>
          <select
            value={selectedDivision}
            onChange={(e) =>
              handleDivisionChange(e.target.value as 'All' | DivisionName)
            }
            aria-label="Select Bangladesh Division"
            className={selectControlClass}
          >
            <option value="All">All Divisions (64)</option>
            {BANGLADESH_DIVISIONS.map((div) => (
              <option key={div.name} value={div.name}>
                {div.name} ({div.districtCount})
              </option>
            ))}
          </select>
        </label>
      ) : isInline ? (
        <select
          value={selectedDivision}
          onChange={(e) =>
            handleDivisionChange(e.target.value as 'All' | DivisionName)
          }
          aria-label="Select Bangladesh Division"
          className={selectControlClass}
        >
          <option value="All">All Divisions (64)</option>
          {BANGLADESH_DIVISIONS.map((div) => (
            <option key={div.name} value={div.name}>
              {div.name} ({div.districtCount})
            </option>
          ))}
        </select>
      ) : (
        <label className="block">
          <span className="block text-xs font-medium text-[#526056] mb-1">
            {divisionLabel}
          </span>
          <select
            value={selectedDivision}
            onChange={(e) =>
              handleDivisionChange(e.target.value as 'All' | DivisionName)
            }
            aria-label="Select Bangladesh Division"
            className={selectControlClass}
          >
            <option value="All">All Divisions (64 districts)</option>
            {BANGLADESH_DIVISIONS.map((div) => (
              <option key={div.name} value={div.name}>
                {div.name} ({div.districtCount} districts)
              </option>
            ))}
          </select>
        </label>
      )}

      {/* Searchable District Combobox */}
      <div className={variant === 'panel' ? 'relative' : 'relative shrink-0'}>
        {variant === 'panel' && (
          <span className="block text-xs font-medium text-[#526056] mb-1">
            {districtLabel}
          </span>
        )}

        <button
          type="button"
          onClick={() => setDropdownOpen((prev) => !prev)}
          aria-haspopup="listbox"
          aria-expanded={dropdownOpen}
          aria-label={`Select district, current is ${activeDistrictMeta.name}`}
          className={triggerButtonClass}
        >
          <span className="flex items-center gap-1.5 min-w-0">
            <MapPin
              className="w-3.5 h-3.5 text-emerald-800 shrink-0"
              aria-hidden="true"
            />
            <span className="truncate">{activeDistrictMeta.name}</span>
          </span>
          <ChevronDown
            className={`w-4 h-4 text-[#526056] shrink-0 transition-transform ${
              dropdownOpen ? 'rotate-180' : ''
            }`}
            aria-hidden="true"
          />
        </button>

        {dropdownOpen && (
          <div
            className={`absolute z-50 mt-1.5 w-72 sm:w-80 bg-white border border-[#DCE3DC] rounded-xl shadow-lg overflow-hidden ${
              isTopbar || isInline ? 'right-0' : 'left-0 sm:right-0 sm:left-auto'
            }`}
          >
            {/* Mobile / Narrow Division Filter inside Popover for TopBar */}
            {isTopbar && (
              <div className="md:hidden px-3 pt-3 pb-2 border-b border-[#EBF0EB]">
                <label className="block text-[11px] font-medium text-[#526056] mb-1">
                  Filter by Division
                </label>
                <select
                  value={selectedDivision}
                  onChange={(e) =>
                    handleDivisionChange(e.target.value as 'All' | DivisionName)
                  }
                  className="w-full bg-[#F6F8F5] border border-[#DCE3DC] rounded-lg px-2.5 py-1.5 text-xs font-medium text-[#172019] focus:outline-none focus:ring-2 focus:ring-emerald-700"
                >
                  <option value="All">All Divisions (64)</option>
                  {BANGLADESH_DIVISIONS.map((div) => (
                    <option key={div.name} value={div.name}>
                      {div.name} ({div.districtCount})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Search Input */}
            <div className="p-2.5 border-b border-[#EBF0EB] bg-[#FAFBF9]">
              <div className="relative flex items-center">
                <Search
                  className="w-3.5 h-3.5 text-[#647368] absolute left-2.5 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  placeholder={
                    selectedDivision === 'All'
                      ? 'Search any of 64 districts...'
                      : `Search in ${selectedDivision} (${divisionDistricts.length})...`
                  }
                  className="w-full pl-8 pr-7 py-1.5 text-xs sm:text-sm bg-white border border-[#DCE3DC] rounded-lg text-[#172019] placeholder-[#647368] focus:outline-none focus:ring-2 focus:ring-emerald-700"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 text-[#647368] hover:text-[#172019]"
                    aria-label="Clear district search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <div className="mt-1.5 flex items-center justify-between text-[11px] text-[#526056] px-0.5">
                <span>
                  {selectedDivision === 'All'
                    ? 'All 8 Divisions'
                    : `${selectedDivision} Division`}
                </span>
                <span className="font-mono tabular-nums">
                  {filteredDistricts.length} of {divisionDistricts.length} shown
                </span>
              </div>
            </div>

            {/* District Options List */}
            <ul
              role="listbox"
              aria-label="Bangladesh Districts"
              className="max-h-64 overflow-y-auto py-1 divide-y divide-[#F3F6F3]"
            >
              {filteredDistricts.length === 0 ? (
                <li className="px-4 py-6 text-center text-xs text-[#526056]">
                  No district matching &ldquo;{searchQuery}&rdquo;.
                </li>
              ) : (
                filteredDistricts.map((district) => {
                  const isSelected = district.id === selectedDistrict;
                  return (
                    <li key={district.id}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        onClick={() => handleSelectDistrict(district.id)}
                        className={`w-full px-3.5 py-2 text-left flex items-center justify-between gap-2 text-xs sm:text-sm transition-colors ${
                          isSelected
                            ? 'bg-emerald-50 text-emerald-950 font-semibold'
                            : 'text-[#172019] hover:bg-[#F6F8F5]'
                        }`}
                      >
                        <span className="min-w-0">
                          <span className="block truncate">{district.name}</span>
                          {selectedDivision === 'All' && (
                            <span className="block text-[11px] font-normal text-[#526056]">
                              {district.division} Division
                            </span>
                          )}
                        </span>
                        {isSelected && (
                          <Check
                            className="w-4 h-4 text-emerald-800 shrink-0"
                            aria-hidden="true"
                          />
                        )}
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};
