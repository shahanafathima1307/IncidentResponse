import React from 'react';
import { Severity, OutcomeType, IncidentStatus } from '../types';

interface SeverityBadgeProps {
  severity: Severity;
  className?: string;
}

export const SeverityBadge: React.FC<SeverityBadgeProps> = ({ severity, className = '' }) => {
  let colorStyle = 'text-[var(--text-muted)] border-[var(--border-hairline)] bg-[var(--bg-subtle)]';

  if (severity === 'SEV1') {
    colorStyle = 'text-[var(--sem-red)] border-[var(--sem-red-border)] bg-[var(--sem-red-bg)] font-bold';
  } else if (severity === 'SEV2') {
    colorStyle = 'text-[var(--sem-amber)] border-[var(--sem-amber-border)] bg-[var(--sem-amber-bg)] font-bold';
  } else if (severity === 'SEV3') {
    colorStyle = 'text-[var(--sem-stale)] border-[var(--sem-stale-border)] bg-[var(--sem-stale-bg)] font-medium';
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-[11px] font-jetbrains rounded-[3px] border tracking-wide uppercase select-none ${colorStyle} ${className}`}
    >
      {severity}
    </span>
  );
};

interface OutcomeBadgeProps {
  outcome: OutcomeType;
  className?: string;
}

export const OutcomeBadge: React.FC<OutcomeBadgeProps> = ({ outcome, className = '' }) => {
  if (outcome === 'worked') {
    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 text-[11px] font-jetbrains font-bold rounded-[3px] border border-[var(--sem-green-border)] bg-[var(--sem-green-bg)] text-[var(--sem-green)] ${className}`}
      >
        WORKED
      </span>
    );
  }

  if (outcome === 'worked_with_changes') {
    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 text-[11px] font-jetbrains font-bold rounded-[3px] border border-[var(--sem-amber-border)] bg-[var(--sem-amber-bg)] text-[var(--sem-amber)] ${className}`}
      >
        WORKED W/ CHANGES
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 text-[11px] font-jetbrains font-bold rounded-[3px] border border-[var(--sem-red-border)] bg-[var(--sem-red-bg)] text-[var(--sem-red)] ${className}`}
    >
      FAILED
    </span>
  );
};

interface StatusBadgeProps {
  status: IncidentStatus;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  const isOpen = status === 'open';
  if (isOpen) {
    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 text-[12px] font-jetbrains font-medium rounded-[3px] border border-[var(--sem-red-border)] bg-[var(--sem-red-bg)] text-[var(--sem-red)] ${className}`}
      >
        <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-[var(--sem-red)]" />
        Open
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-[12px] font-jetbrains font-medium rounded-[3px] border border-[var(--sem-green-border)] bg-[var(--sem-green-bg)] text-[var(--sem-green)] ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-[var(--sem-green)]" />
      Resolved
    </span>
  );
};

interface MemoryMatchTagProps {
  matchId: string | null;
  matchPct?: number | null;
}

export const MemoryMatchTag: React.FC<MemoryMatchTagProps> = ({ matchId, matchPct }) => {
  if (!matchId) {
    return <span className="text-[13px] font-jetbrains text-[var(--text-dim)]">No history</span>;
  }

  return (
    <div className="inline-flex items-center gap-2 font-jetbrains text-[13px]">
      <span className="text-[var(--accent)] font-semibold hover:underline cursor-pointer">
        {matchId}
      </span>
      {matchPct !== undefined && matchPct !== null && (
        <span className="px-1.5 py-0.5 rounded-[2px] bg-[var(--bg-subtle)] border border-[var(--border-hairline)] text-[11px] text-[var(--text-muted)] font-normal">
          {matchPct}% match
        </span>
      )}
    </div>
  );
};
