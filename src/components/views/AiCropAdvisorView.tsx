import React, { useEffect, useRef, useState } from 'react';
import { BotMessageSquare, RotateCcw, Send, Sprout, User } from 'lucide-react';
import {
  CROPS,
  DISTRICTS,
  generateSimulatedAdvisorResponse,
} from '../../data/bangladeshAgriData';
import { AdvisorMessage, CropId, DistrictId, UserPreferences } from '../../types/agri';
import { LocationSelector } from '../common/LocationSelector';

interface AiCropAdvisorViewProps {
  preferences: UserPreferences;
  messages: AdvisorMessage[];
  onSendMessage: (query: string, districtId: DistrictId, cropId: CropId) => void;
  onClearChat: () => void;
  isGenerating: boolean;
}

const STARTER_PROMPTS = [
  'How do I protect Aman rice from heavy rain and flash flooding?',
  'What should I check for Potato late blight in humid weather?',
  'When should I irrigate using Alternate Wetting and Drying (AWD)?',
  'How can I reduce crop heat stress during warm afternoon spikes?',
];

export const AiCropAdvisorView: React.FC<AiCropAdvisorViewProps> = ({
  preferences,
  messages,
  onSendMessage,
  onClearChat,
  isGenerating,
}) => {
  const [input, setInput] = useState('');
  const [contextCrop, setContextCrop] = useState<CropId>(preferences.primaryCrop);
  const [contextDistrict, setContextDistrict] = useState<DistrictId>(
    preferences.selectedDistrict
  );
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setContextDistrict(preferences.selectedDistrict);
  }, [preferences.selectedDistrict]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isGenerating]);

  const district = DISTRICTS.find((d) => d.id === contextDistrict) ?? DISTRICTS[0];
  const crop = CROPS.find((c) => c.id === contextCrop) ?? CROPS[0];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isGenerating) return;
    setInput('');
    onSendMessage(trimmed, contextDistrict, contextCrop);
  };

  return (
    <div className="space-y-4">
      {/* Context & Simulation Notice Bar */}
      <section className="bg-white border border-[#DCE3DC] rounded-xl p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-display text-xl font-bold text-[#172019]">
              AI Crop Advisor
            </h2>
            <span className="text-xs font-medium text-[#526056]">
              · Simulated Agronomy Engine (Offline Prototype)
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#526056] mt-1">
            Ask practical farming questions. Responses combine simulated weather, soil, and crop risk data for Bangladesh without external paid APIs.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <LocationSelector
            selectedDistrict={contextDistrict}
            onChangeDistrict={setContextDistrict}
            variant="inline"
          />

          <select
            value={contextCrop}
            onChange={(e) => setContextCrop(e.target.value as CropId)}
            aria-label="Advisor Crop Context"
            className="bg-[#F6F8F5] border border-[#DCE3DC] rounded-lg px-3 py-1.5 text-xs font-medium text-[#172019] focus:outline-none focus:ring-2 focus:ring-emerald-700"
          >
            {CROPS.map((c) => (
              <option key={c.id} value={c.id}>
                Crop: {c.name}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={onClearChat}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#DCE3DC] text-xs font-medium text-[#3A473E] hover:bg-[#F6F8F5] transition-colors whitespace-nowrap"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>New Chat</span>
          </button>
        </div>
      </section>

      {/* Main Chat Container */}
      <section className="bg-white border border-[#DCE3DC] rounded-xl flex flex-col h-[calc(100vh-18rem)] min-h-[480px]">
        {/* Quick Prompt Bar */}
        <div className="px-5 py-3 border-b border-[#EBF0EB] bg-[#FAFBF9] rounded-t-xl flex items-center gap-2 overflow-x-auto">
          <span className="text-xs font-medium text-[#526056] whitespace-nowrap shrink-0">
            Quick questions:
          </span>
          {STARTER_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              disabled={isGenerating}
              onClick={() => onSendMessage(prompt, contextDistrict, contextCrop)}
              className="px-3 py-1.5 rounded-lg bg-white border border-[#DCE3DC] text-xs font-medium text-[#172019] hover:border-emerald-700 hover:text-emerald-900 transition-colors whitespace-nowrap shrink-0 disabled:opacity-50"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Message Thread */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {messages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={msg.id}
                className={`flex items-start gap-3 ${
                  isUser ? 'justify-end' : 'justify-start'
                }`}
              >
                {!isUser && (
                  <div className="w-8 h-8 rounded-lg bg-emerald-800 text-white flex items-center justify-center shrink-0 mt-0.5">
                    <Sprout className="w-4 h-4" aria-hidden="true" />
                  </div>
                )}

                <div
                  className={`max-w-2xl rounded-xl p-4 space-y-3 ${
                    isUser
                      ? 'bg-emerald-800 text-white'
                      : 'bg-[#F6F8F5] border border-[#E2E8E1] text-[#172019]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-4 text-[11px] opacity-75">
                    <span className="font-semibold">
                      {isUser ? preferences.farmerName : 'ANKUR Agronomy Advisor'}
                    </span>
                    <span className="font-mono tabular-nums">{msg.timestampLabel}</span>
                  </div>

                  <p className="text-sm leading-relaxed">{msg.content}</p>

                  {msg.recommendations && msg.recommendations.length > 0 && (
                    <div className="pt-3 border-t border-[#DCE3DC] space-y-2">
                      <div className="text-xs font-semibold text-emerald-900">
                        Actionable Farming Recommendations
                      </div>
                      <ul className="space-y-1.5">
                        {msg.recommendations.map((rec, idx) => (
                          <li
                            key={idx}
                            className="text-xs sm:text-sm text-[#2A352D] flex items-start gap-2 leading-relaxed"
                          >
                            <span className="font-mono text-xs font-semibold text-emerald-800 mt-0.5">
                              {idx + 1}.
                            </span>
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {msg.timingNote && (
                    <div className="text-xs text-[#526056] pt-1 font-medium">
                      {msg.timingNote}
                    </div>
                  )}
                </div>

                {isUser && (
                  <div className="w-8 h-8 rounded-lg bg-[#E6ECE6] text-[#172019] flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-4 h-4" aria-hidden="true" />
                  </div>
                )}
              </div>
            );
          })}

          {isGenerating && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-800 text-white flex items-center justify-center shrink-0">
                <BotMessageSquare className="w-4 h-4" aria-hidden="true" />
              </div>
              <div className="bg-[#F6F8F5] border border-[#E2E8E1] rounded-xl px-4 py-3 text-sm text-[#526056]">
                Analyzing {crop.name} risk and {district.name} weather conditions...
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input Form */}
        <form
          onSubmit={handleSubmit}
          className="p-4 border-t border-[#EBF0EB] flex items-center gap-3"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Ask about ${crop.name} irrigation, flood drainage, or disease in ${district.name}...`}
            className="flex-1 bg-[#F6F8F5] border border-[#DCE3DC] rounded-lg px-4 py-2.5 text-sm text-[#172019] placeholder-[#647368] focus:outline-none focus:ring-2 focus:ring-emerald-700"
          />
          <button
            type="submit"
            disabled={!input.trim() || isGenerating}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-800 text-white text-sm font-medium hover:bg-emerald-900 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0"
          >
            <span>Send</span>
            <Send className="w-4 h-4" aria-hidden="true" />
          </button>
        </form>
      </section>
    </div>
  );
};

export { generateSimulatedAdvisorResponse };
