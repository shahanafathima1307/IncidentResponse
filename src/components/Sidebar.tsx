import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Inbox,
  BookOpen,
  BrainCircuit,
  Shield,
  Activity,
  Cpu
} from 'lucide-react';

interface SidebarProps {
  incidentsCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ incidentsCount = 38 }) => {
  const location = useLocation();
  const isQueue = location.pathname === '/' || !location.pathname.startsWith('/incidents');

  return (
    <aside className="w-64 shrink-0 border-r border-[var(--border-hairline)] bg-[var(--bg-surface)] flex flex-col justify-between select-none min-h-screen font-jetbrains">
      {/* Brand & Workspace Name */}
      <div>
        <div className="h-14 px-5 border-b border-[var(--border-hairline)] flex items-center justify-between">
          <Link
            to="/"
            className="flex items-center gap-2.5 font-jetbrains font-bold text-[14px] text-[var(--text-primary)] hover:opacity-90 transition-opacity"
          >
            <div className="w-5 h-5 rounded-[3px] bg-[var(--primary)] flex items-center justify-center text-white">
              <Shield size={13} strokeWidth={2.5} />
            </div>
            <span className="tracking-tight text-[14px] font-bold">OnCall Memory</span>
          </Link>
          <span className="px-1.5 py-0.5 rounded-[3px] bg-[var(--bg-subtle)] border border-[var(--border-hairline)] text-[11px] text-[var(--text-muted)] font-jetbrains">
            v2.4
          </span>
        </div>

        {/* Navigation Links */}
        <div className="p-3 space-y-1 text-[13px]">
          <div className="px-3 pt-2 pb-1 text-[11px] font-semibold text-[var(--text-dim)] uppercase tracking-wider">
            Workspace
          </div>

          <Link
            to="/"
            className={`w-full flex items-center justify-between px-3 py-2 rounded-[4px] transition-colors ${
              isQueue
                ? 'bg-[var(--bg-subtle)] text-[var(--text-primary)] font-bold border border-[var(--border-hairline)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Inbox size={16} className={isQueue ? 'text-[var(--accent)]' : 'text-[var(--text-dim)]'} />
              <span>Incident Queue</span>
            </div>
            <span className="text-[12px] tabular-nums text-[var(--text-muted)] px-1.5 py-0.5 rounded bg-[var(--bg-surface)] border border-[var(--border-hairline)] font-medium">
              {incidentsCount}
            </span>
          </Link>

          <Link
            to="/"
            className="w-full flex items-center justify-between px-3 py-2 rounded-[4px] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <BookOpen size={16} className="text-[var(--text-dim)]" />
              <span>Runbooks & SOPs</span>
            </div>
            <span className="text-[12px] tabular-nums text-[var(--text-dim)]">
              14
            </span>
          </Link>

          <div className="pt-4 px-3 pb-1 text-[11px] font-semibold text-[var(--text-dim)] uppercase tracking-wider">
            Intelligence
          </div>

          <div className="w-full flex items-center justify-between px-3 py-2 rounded-[4px] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] cursor-pointer transition-colors">
            <div className="flex items-center gap-2.5">
              <BrainCircuit size={16} className="text-[var(--text-dim)]" />
              <span>Memory Engine</span>
            </div>
            <span className="w-2 h-2 rounded-full bg-[var(--sem-green)]" title="Active & learning" />
          </div>

          <div className="w-full flex items-center justify-between px-3 py-2 rounded-[4px] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] cursor-pointer transition-colors">
            <div className="flex items-center gap-2.5">
              <Activity size={16} className="text-[var(--text-dim)]" />
              <span>Live Telemetry</span>
            </div>
            <span className="text-[11px] text-[var(--sem-green)] font-medium">94.2%</span>
          </div>
        </div>

        {/* System telemetry box */}
        <div className="mx-3 mt-3 p-2.5 rounded-[4px] border border-[var(--border-hairline)] bg-[var(--bg-subtle)] text-[11px] text-[var(--text-muted)] space-y-1.5">
          <div className="flex items-center justify-between text-[var(--text-dim)]">
            <span className="uppercase font-semibold text-[10px]">CLUSTER NODE</span>
            <span className="text-[var(--text-primary)] font-medium">us-east-prod</span>
          </div>
          <div className="flex items-center justify-between text-[var(--text-dim)]">
            <span className="uppercase font-semibold text-[10px]">INDEX ACCURACY</span>
            <span className="text-[var(--sem-green)] font-medium">94.2% vector</span>
          </div>
          <div className="flex items-center justify-between text-[var(--text-dim)]">
            <span className="uppercase font-semibold text-[10px]">INGEST LATENCY</span>
            <span className="text-[var(--text-primary)] font-medium">12ms</span>
          </div>
        </div>
      </div>

      {/* On-call context footer */}
      <div className="p-3.5 border-t border-[var(--border-hairline)] bg-[var(--bg-subtle)] text-[12px] space-y-2">
        <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)]">
          <span className="text-[var(--text-dim)] font-semibold uppercase">On-call Primary</span>
          <span className="inline-flex items-center gap-1.5 text-[var(--text-primary)] font-medium">
            <span className="w-2 h-2 rounded-full bg-[var(--sem-green)]" />
            Active
          </span>
        </div>
        <div className="text-[13px] font-bold text-[var(--text-primary)] flex items-center justify-between">
          <span>Alex Vance</span>
          <span className="text-[11px] text-[var(--text-dim)]">SRE Team</span>
        </div>
        <div className="text-[11px] text-[var(--text-dim)] flex items-center justify-between pt-1 border-t border-[var(--border-hairline)]">
          <span>Shift ends</span>
          <span className="font-semibold text-[var(--text-primary)]">in 4h 15m</span>
        </div>
      </div>
    </aside>
  );
};
