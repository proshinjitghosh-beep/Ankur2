import React, { useState } from 'react';
import {
  CheckSquare,
  Droplets,
  Plus,
  Sprout,
  Square,
} from 'lucide-react';
import { CROPS, DISTRICTS } from '../../data/bangladeshAgriData';
import {
  FarmingActivityItem,
  RiskSeverity,
  TrackedCropPlot,
  UserPreferences,
} from '../../types/agri';
import { SeverityIndicator } from '../common/SeverityIndicator';

interface SmartFarmingViewProps {
  preferences: UserPreferences;
  plots: TrackedCropPlot[];
  activities: FarmingActivityItem[];
  onToggleActivity: (id: string) => void;
  onAddActivity: (item: Omit<FarmingActivityItem, 'id' | 'completed'>) => void;
  onAdjustPlotMoisture: (plotId: string, delta: number) => void;
}

export const SmartFarmingView: React.FC<SmartFarmingViewProps> = ({
  preferences,
  plots,
  activities,
  onToggleActivity,
  onAddActivity,
  onAdjustPlotMoisture,
}) => {
  const [activityFilter, setActivityFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newPlot, setNewPlot] = useState(plots[0]?.plotName ?? 'North Canal Plot (Plot A)');
  const [newCategory, setNewCategory] =
    useState<FarmingActivityItem['category']>('Irrigation');
  const [newPriority, setNewPriority] = useState<RiskSeverity>('Medium');
  const [newDue, setNewDue] = useState('Tomorrow · 07:30');
  const [newNotes, setNewNotes] = useState('');

  const district =
    DISTRICTS.find((d) => d.id === preferences.selectedDistrict) ?? DISTRICTS[0];

  const filteredActivities = activities.filter((a) => {
    if (activityFilter === 'pending') return !a.completed;
    if (activityFilter === 'completed') return a.completed;
    return true;
  });

  const handleCreateActivity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    onAddActivity({
      title: newTitle.trim(),
      plotName: newPlot,
      category: newCategory,
      dueDateLabel: newDue.trim() || 'Scheduled',
      priority: newPriority,
      notes: newNotes.trim() || 'Added manually from Smart Farming planner.',
    });
    setNewTitle('');
    setNewNotes('');
    setShowAddForm(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-display text-xl sm:text-2xl font-bold text-[#172019]">
            Smart Farming & Field Operations
          </h2>
          <p className="text-sm text-[#526056] mt-0.5">
            Track crop growth stages, AWD irrigation guidance, and daily field tasks for {preferences.farmName} in {district.name}.
          </p>
        </div>
        <div className="text-xs text-[#526056] font-mono tabular-nums">
          {plots.length} Active Plots · {activities.filter((a) => !a.completed).length} Pending Tasks
        </div>
      </div>

      {/* Crop Growth Tracking & Irrigation Recommendations */}
      <section aria-label="Crop Growth Tracking and Irrigation" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {plots.map((plot) => {
          const crop = CROPS.find((c) => c.id === plot.cropId);
          const progressPct = Math.min(
            100,
            Math.round((plot.daysAfterPlanting / plot.totalCycleDays) * 100)
          );

          return (
            <article
              key={plot.id}
              className="bg-white border border-[#DCE3DC] rounded-xl p-6 flex flex-col justify-between gap-5"
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-xs text-[#526056]">
                      {crop?.name} ({plot.variety}) · {plot.areaBigha} Bigha
                    </div>
                    <h3 className="font-display text-base font-semibold text-[#172019] mt-0.5 flex items-center gap-1.5">
                      <Sprout className="w-4 h-4 text-emerald-700 shrink-0" aria-hidden="true" />
                      <span>{plot.plotName}</span>
                    </h3>
                  </div>
                  <SeverityIndicator severity={plot.healthStatus} compact />
                </div>

                {/* Growth Stage Progress */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-[#172019]">{plot.currentStage}</span>
                    <span className="font-mono tabular-nums text-[#526056]">
                      {progressPct}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-[#E8EDE8] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-700 rounded-full transition-all"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs text-[#526056]">
                    <span className="font-mono tabular-nums">
                      Day {plot.daysAfterPlanting} of {plot.totalCycleDays}
                    </span>
                    <span>
                      Next: {plot.nextStage} ({plot.daysToNextStage}d)
                    </span>
                  </div>
                </div>

                {/* Irrigation Guidance */}
                <div className="pt-4 border-t border-[#EBF0EB] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#172019]">
                      <Droplets className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" />
                      Irrigation Recommendation
                    </span>
                    <span className="text-xs font-mono tabular-nums text-[#526056]">
                      Soil {plot.soilMoisturePct}% (Target {plot.targetMoistureRange})
                    </span>
                  </div>

                  <p className="text-sm font-medium text-emerald-900">
                    {plot.irrigationAction}
                  </p>
                  <p className="text-xs text-[#526056] leading-relaxed">
                    {plot.awdNote}
                  </p>
                </div>
              </div>

              {/* Interactive Moisture Log Control */}
              <div className="pt-4 border-t border-[#EBF0EB] flex items-center justify-between gap-2">
                <span className="text-xs text-[#526056]">
                  {plot.nextIrrigationWindow}
                </span>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => onAdjustPlotMoisture(plot.id, -5)}
                    className="px-2 py-1 rounded border border-[#DCE3DC] text-xs font-mono text-[#3A473E] hover:bg-[#F6F8F5]"
                    title="Simulate moisture drop (-5%)"
                  >
                    -5%
                  </button>
                  <button
                    type="button"
                    onClick={() => onAdjustPlotMoisture(plot.id, 5)}
                    className="px-2 py-1 rounded border border-[#DCE3DC] text-xs font-mono text-[#3A473E] hover:bg-[#F6F8F5]"
                    title="Log light irrigation / rain (+5%)"
                  >
                    +5%
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </section>

      {/* Farming Activity Overview */}
      <section className="bg-white border border-[#DCE3DC] rounded-xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#EBF0EB]">
          <div>
            <h3 className="font-display text-base font-semibold text-[#172019]">
              Farming Activity Overview
            </h3>
            <p className="text-xs text-[#526056] mt-0.5">
              Track field preparation, drainage, fertilization, and scouting tasks
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center p-1 bg-[#F1F4EF] rounded-lg">
              {(['all', 'pending', 'completed'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActivityFilter(tab)}
                  className={`px-3 py-1 rounded-md text-xs font-medium capitalize transition-colors ${
                    activityFilter === tab
                      ? 'bg-white text-[#172019] shadow-xs font-semibold'
                      : 'text-[#526056] hover:text-[#172019]'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setShowAddForm((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-800 text-white text-xs font-medium hover:bg-emerald-900 transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{showAddForm ? 'Cancel' : 'Add Activity'}</span>
            </button>
          </div>
        </div>

        {/* Add New Activity Form */}
        {showAddForm && (
          <form
            onSubmit={handleCreateActivity}
            className="bg-[#F6F8F5] border border-[#DCE3DC] rounded-xl p-4 grid grid-cols-1 md:grid-cols-4 gap-3"
          >
            <input
              type="text"
              required
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Task description (e.g., Check bunds after rain)"
              className="md:col-span-2 bg-white border border-[#DCE3DC] rounded-lg px-3 py-2 text-sm text-[#172019] focus:outline-none focus:ring-2 focus:ring-emerald-700"
            />
            <select
              value={newPlot}
              onChange={(e) => setNewPlot(e.target.value)}
              className="bg-white border border-[#DCE3DC] rounded-lg px-3 py-2 text-sm text-[#172019] focus:outline-none focus:ring-2 focus:ring-emerald-700"
            >
              {plots.map((p) => (
                <option key={p.id} value={p.plotName}>
                  {p.plotName}
                </option>
              ))}
            </select>
            <select
              value={newCategory}
              onChange={(e) =>
                setNewCategory(e.target.value as FarmingActivityItem['category'])
              }
              className="bg-white border border-[#DCE3DC] rounded-lg px-3 py-2 text-sm text-[#172019] focus:outline-none focus:ring-2 focus:ring-emerald-700"
            >
              <option value="Irrigation">Irrigation</option>
              <option value="Drainage & Bunds">Drainage & Bunds</option>
              <option value="Fertilization">Fertilization</option>
              <option value="Pest & Disease">Pest & Disease</option>
              <option value="Harvest Prep">Harvest Prep</option>
            </select>
            <input
              type="text"
              value={newDue}
              onChange={(e) => setNewDue(e.target.value)}
              placeholder="Schedule (e.g., Tomorrow · 07:30)"
              className="bg-white border border-[#DCE3DC] rounded-lg px-3 py-2 text-sm text-[#172019] focus:outline-none focus:ring-2 focus:ring-emerald-700"
            />
            <select
              value={newPriority}
              onChange={(e) => setNewPriority(e.target.value as RiskSeverity)}
              className="bg-white border border-[#DCE3DC] rounded-lg px-3 py-2 text-sm text-[#172019] focus:outline-none focus:ring-2 focus:ring-emerald-700"
            >
              <option value="High">High Priority</option>
              <option value="Medium">Medium Priority</option>
              <option value="Low">Low Priority</option>
            </select>
            <input
              type="text"
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              placeholder="Field notes (optional)"
              className="bg-white border border-[#DCE3DC] rounded-lg px-3 py-2 text-sm text-[#172019] focus:outline-none focus:ring-2 focus:ring-emerald-700"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-emerald-800 text-white text-sm font-medium hover:bg-emerald-900 transition-colors"
            >
              Save Task
            </button>
          </form>
        )}

        {/* Activity List */}
        <div className="divide-y divide-[#EBF0EB]">
          {filteredActivities.length === 0 ? (
            <div className="py-8 text-center text-sm text-[#526056]">
              No farming activities in this view.
            </div>
          ) : (
            filteredActivities.map((act) => (
              <div
                key={act.id}
                className="py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <button
                    type="button"
                    onClick={() => onToggleActivity(act.id)}
                    className="mt-0.5 text-emerald-800 hover:text-emerald-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 rounded"
                    aria-label={
                      act.completed ? 'Mark task pending' : 'Mark task completed'
                    }
                  >
                    {act.completed ? (
                      <CheckSquare className="w-5 h-5" />
                    ) : (
                      <Square className="w-5 h-5 text-[#647368]" />
                    )}
                  </button>
                  <div className="min-w-0">
                    <div
                      className={`text-sm font-medium ${
                        act.completed
                          ? 'line-through text-[#647368]'
                          : 'text-[#172019]'
                      }`}
                    >
                      {act.title}
                    </div>
                    <div className="text-xs text-[#526056] mt-0.5">
                      {act.plotName} · {act.category} · {act.dueDateLabel}
                    </div>
                    <p className="text-xs text-[#647368] mt-1">{act.notes}</p>
                  </div>
                </div>

                <div className="pl-8 sm:pl-0 shrink-0">
                  <SeverityIndicator severity={act.priority} compact />
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
};
