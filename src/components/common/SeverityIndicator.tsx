import React from 'react';
import { AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';
import { RiskSeverity } from '../../types/agri';

interface SeverityIndicatorProps {
  severity: RiskSeverity;
  score?: number;
  compact?: boolean;
}

export const SeverityIndicator: React.FC<SeverityIndicatorProps> = ({
  severity,
  score,
  compact = false,
}) => {
  const config = {
    Low: {
      icon: CheckCircle2,
      textClass: 'text-emerald-800',
      bgClass: 'bg-emerald-50 border-emerald-200',
      label: 'Low Risk',
    },
    Medium: {
      icon: AlertTriangle,
      textClass: 'text-amber-800',
      bgClass: 'bg-amber-50 border-amber-200',
      label: 'Medium Risk',
    },
    High: {
      icon: ShieldAlert,
      textClass: 'text-red-800',
      bgClass: 'bg-red-50 border-red-200',
      label: 'High Risk',
    },
  }[severity];

  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border font-medium whitespace-nowrap shrink-0 ${
        config.bgClass
      } ${config.textClass} ${compact ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs'}`}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      <span>{compact ? severity : config.label}</span>
      {typeof score === 'number' && (
        <span className="font-mono tabular-nums opacity-80">· {score}/100</span>
      )}
    </span>
  );
};

export function formatTemp(tempC: number, unit: 'C' | 'F'): string {
  if (unit === 'F') {
    return `${Math.round((tempC * 9) / 5 + 32)}°F`;
  }
  return `${Math.round(tempC)}°C`;
}
