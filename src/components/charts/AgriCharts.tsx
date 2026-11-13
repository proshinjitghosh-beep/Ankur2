import React, { useState } from 'react';
import { DailyForecastPoint, RiskDimensionDetail } from '../../types/agri';

interface RainfallTrendChartProps {
  data: DailyForecastPoint[];
  height?: number;
  mode?: 'forecast' | 'historical';
}

export const RainfallTrendChart: React.FC<RainfallTrendChartProps> = ({
  data,
  height = 220,
  mode = 'forecast',
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (data.length === 0) {
    return (
      <div className="h-[180px] flex items-center justify-center text-xs text-[#647368]">
        No rainfall records available for this period.
      </div>
    );
  }

  const maxRain = Math.max(80, ...data.map((d) => d.rainfallMm));
  const width = 640;
  const padLeft = 40;
  const padRight = 16;
  const padTop = 18;
  const padBottom = 34;
  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  const thresholdMm = 45;
  const thresholdY = padTop + chartH - (thresholdMm / maxRain) * chartH;

  const stepW = chartW / data.length;
  const barW = Math.max(6, Math.min(28, stepW * 0.56));

  const activePoint = hoveredIdx !== null ? data[hoveredIdx] : null;
  const tickStep = data.length > 16 ? 4 : data.length > 8 ? 2 : 1;

  return (
    <div className="relative w-full">
      <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-4 mb-3 min-h-[24px]">
        <div className="flex items-center gap-4 text-xs text-[#526056]">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-emerald-700 inline-block" />
            Daily Rainfall (mm)
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-4 border-t border-dashed border-amber-700 inline-block" />
            Heavy Rain Threshold (45 mm)
          </span>
        </div>
        {activePoint ? (
          <div className="text-xs font-mono tabular-nums text-[#172019] bg-[#F1F4EF] px-2.5 py-1 rounded-md border border-[#DCE3DC]">
            {activePoint.dateLabel} ({activePoint.day}): {activePoint.rainfallMm} mm
            {mode === 'forecast' ? ` · ${activePoint.rainProbPct}% chance` : ' observed'}
          </div>
        ) : (
          <div className="text-xs text-[#647368]">Hover bars for daily totals</div>
        )}
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto overflow-visible select-none"
        role="img"
        aria-label="Rainfall bar chart in millimeters"
      >
        {/* Horizontal Gridlines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const val = Math.round(maxRain * ratio);
          const y = padTop + chartH - ratio * chartH;
          return (
            <g key={ratio}>
              <line
                x1={padLeft}
                y1={y}
                x2={width - padRight}
                y2={y}
                stroke="#E6ECE6"
                strokeWidth={1}
              />
              <text
                x={padLeft - 8}
                y={y + 4}
                textAnchor="end"
                className="fill-[#647368] text-[10px] font-mono tabular-nums"
              >
                {val}
              </text>
            </g>
          );
        })}

        {/* Heavy Rain Threshold Line */}
        <line
          x1={padLeft}
          y1={thresholdY}
          x2={width - padRight}
          y2={thresholdY}
          stroke="#B45309"
          strokeWidth={1.25}
          strokeDasharray="4 4"
        />

        {/* Bars */}
        {data.map((point, idx) => {
          const barH = Math.max(2, (point.rainfallMm / maxRain) * chartH);
          const x = padLeft + idx * stepW + (stepW - barW) / 2;
          const y = padTop + chartH - barH;
          const isHeavy = point.rainfallMm >= thresholdMm;
          const isHovered = hoveredIdx === idx;

          return (
            <g
              key={point.isoDate ?? `${point.dateLabel}-${idx}`}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              className="cursor-pointer"
            >
              <rect
                x={padLeft + idx * stepW}
                y={padTop}
                width={stepW}
                height={chartH + 24}
                fill="transparent"
              />
              <rect
                x={x}
                y={point.rainfallMm === 0 ? padTop + chartH - 2 : y}
                width={barW}
                height={point.rainfallMm === 0 ? 2 : barH}
                rx={3}
                fill={
                  point.rainfallMm === 0
                    ? '#D4DDD4'
                    : isHeavy
                    ? isHovered
                      ? '#92400E'
                      : '#B45309'
                    : isHovered
                    ? '#14532D'
                    : '#15803D'
                }
                opacity={hoveredIdx !== null && !isHovered ? 0.65 : 1}
              />
              {(idx % tickStep === 0 || isHovered) && (
                <text
                  x={x + barW / 2}
                  y={padTop + chartH + 16}
                  textAnchor="middle"
                  className={`text-[10px] font-mono tabular-nums ${
                    isHovered ? 'fill-[#172019] font-semibold' : 'fill-[#647368]'
                  }`}
                >
                  {point.dateLabel}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
};

interface TemperatureTrendChartProps {
  data: DailyForecastPoint[];
  tempUnit: 'C' | 'F';
  height?: number;
}

export const TemperatureTrendChart: React.FC<TemperatureTrendChartProps> = ({
  data,
  tempUnit,
  height = 220,
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (data.length === 0) {
    return (
      <div className="h-[180px] flex items-center justify-center text-xs text-[#647368]">
        No temperature records available for this period.
      </div>
    );
  }

  const convert = (c: number) => (tempUnit === 'F' ? Math.round((c * 9) / 5 + 32) : c);

  const rawMinC = Math.min(10, ...data.map((d) => Math.floor(d.tempMinC) - 2));
  const rawMaxC = Math.max(38, ...data.map((d) => Math.ceil(d.tempMaxC) + 2));
  const minVal = convert(rawMinC);
  const maxVal = convert(rawMaxC);
  const span = Math.max(1, maxVal - minVal);

  const width = 640;
  const padLeft = 40;
  const padRight = 18;
  const padTop = 18;
  const padBottom = 34;
  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  const getX = (idx: number) =>
    padLeft + (data.length <= 1 ? chartW / 2 : (idx / (data.length - 1)) * chartW);
  const getY = (val: number) =>
    padTop + chartH - ((val - minVal) / span) * chartH;

  const maxPoints = data.map((d, i) => `${getX(i)},${getY(convert(d.tempMaxC))}`).join(' ');
  const minPoints = data.map((d, i) => `${getX(i)},${getY(convert(d.tempMinC))}`).join(' ');

  const areaPath = [
    `M ${getX(0)} ${getY(convert(data[0].tempMaxC))}`,
    ...data.slice(1).map((d, i) => `L ${getX(i + 1)} ${getY(convert(d.tempMaxC))}`),
    ...[...data]
      .reverse()
      .map((d, i) => `L ${getX(data.length - 1 - i)} ${getY(convert(d.tempMinC))}`),
    'Z',
  ].join(' ');

  const active = hoveredIdx !== null ? data[hoveredIdx] : null;
  const tickStep = data.length > 16 ? 4 : data.length > 8 ? 2 : 1;

  return (
    <div className="relative w-full">
      <div className="flex items-center justify-between gap-4 mb-3 min-h-[24px]">
        <div className="flex items-center gap-4 text-xs text-[#526056]">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-amber-700 inline-block" />
            Daytime High (°{tempUnit})
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-emerald-700 inline-block" />
            Night Low (°{tempUnit})
          </span>
        </div>
        {active ? (
          <div className="text-xs font-mono tabular-nums text-[#172019] bg-[#F1F4EF] px-2.5 py-1 rounded-md border border-[#DCE3DC]">
            {active.dateLabel}: High {convert(active.tempMaxC)}°{tempUnit} / Low{' '}
            {convert(active.tempMinC)}°{tempUnit}
          </div>
        ) : (
          <div className="text-xs text-[#647368]">Hover points for thermal band</div>
        )}
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto overflow-visible select-none"
        role="img"
        aria-label="Temperature high and low trend line chart"
      >
        {[0, 0.33, 0.66, 1].map((ratio) => {
          const val = Math.round(minVal + span * ratio);
          const y = padTop + chartH - ratio * chartH;
          return (
            <g key={ratio}>
              <line
                x1={padLeft}
                y1={y}
                x2={width - padRight}
                y2={y}
                stroke="#E6ECE6"
                strokeWidth={1}
              />
              <text
                x={padLeft - 8}
                y={y + 4}
                textAnchor="end"
                className="fill-[#647368] text-[10px] font-mono tabular-nums"
              >
                {val}°
              </text>
            </g>
          );
        })}

        <path d={areaPath} fill="#15803D" fillOpacity={0.08} />
        <polyline
          fill="none"
          stroke="#B45309"
          strokeWidth={2.25}
          strokeLinejoin="round"
          strokeLinecap="round"
          points={maxPoints}
        />
        <polyline
          fill="none"
          stroke="#15803D"
          strokeWidth={2.25}
          strokeLinejoin="round"
          strokeLinecap="round"
          points={minPoints}
        />

        {data.map((d, idx) => {
          const x = getX(idx);
          const yMax = getY(convert(d.tempMaxC));
          const yMin = getY(convert(d.tempMinC));
          const isHovered = hoveredIdx === idx;
          const colW = chartW / Math.max(1, data.length - 1);

          return (
            <g
              key={d.isoDate ?? `${d.dateLabel}-${idx}`}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              className="cursor-pointer"
            >
              <rect
                x={x - colW / 2}
                y={padTop}
                width={colW}
                height={chartH + 24}
                fill="transparent"
              />
              {isHovered && (
                <line
                  x1={x}
                  y1={padTop}
                  x2={x}
                  y2={padTop + chartH}
                  stroke="#94A396"
                  strokeWidth={1}
                  strokeDasharray="3 3"
                />
              )}
              <circle
                cx={x}
                cy={yMax}
                r={isHovered ? 4.5 : 2.5}
                fill="#B45309"
                stroke="#FFFFFF"
                strokeWidth={1.5}
              />
              <circle
                cx={x}
                cy={yMin}
                r={isHovered ? 4.5 : 2.5}
                fill="#15803D"
                stroke="#FFFFFF"
                strokeWidth={1.5}
              />
              {(idx % tickStep === 0 || isHovered) && (
                <text
                  x={x}
                  y={padTop + chartH + 16}
                  textAnchor="middle"
                  className={`text-[10px] font-mono tabular-nums ${
                    isHovered ? 'fill-[#172019] font-semibold' : 'fill-[#647368]'
                  }`}
                >
                  {d.dateLabel}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
};

interface RiskBreakdownChartProps {
  dimensions: RiskDimensionDetail[];
}

export const RiskBreakdownChart: React.FC<RiskBreakdownChartProps> = ({ dimensions }) => {
  return (
    <div className="space-y-4">
      {dimensions.map((dim) => {
        const barColor =
          dim.severity === 'High'
            ? 'bg-red-600'
            : dim.severity === 'Medium'
            ? 'bg-amber-600'
            : 'bg-emerald-700';

        const textColor =
          dim.severity === 'High'
            ? 'text-red-800'
            : dim.severity === 'Medium'
            ? 'text-amber-800'
            : 'text-emerald-800';

        return (
          <div key={dim.type} className="space-y-1.5">
            <div className="flex items-center justify-between gap-2 text-sm">
              <div className="font-medium text-[#172019]">{dim.type} Risk</div>
              <div className="flex items-center gap-2 font-mono tabular-nums text-xs">
                <span className={`font-semibold ${textColor}`}>{dim.severity}</span>
                <span className="text-[#647368]">·</span>
                <span className="text-[#172019] font-medium">{dim.score}/100</span>
              </div>
            </div>
            <div className="w-full h-2.5 bg-[#EDF1EC] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${barColor}`}
                style={{ width: `${dim.score}%` }}
              />
            </div>
            <p className="text-xs text-[#526056] leading-relaxed">{dim.primaryDriver}</p>
          </div>
        );
      })}
    </div>
  );
};
