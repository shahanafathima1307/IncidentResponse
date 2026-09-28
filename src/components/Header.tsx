import React from 'react';
import { Search } from 'lucide-react';

interface HeaderProps {
  incidentsInMemory?: number;
  onOpenCommandPalette: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  incidentsInMemory = 38,
  onOpenCommandPalette,
}) => {
  return (
    <header className="sticky top-0 z-30 h-14 bg-[var(--bg-surface)] border-b border-[var(--border-hairline)] px-5 sm:px-8 flex items-center justify-between font-jetbrains">
      {/* Search Input Bar (triggers Command Palette) */}
      <div className="flex-1 max-w-lg">
        <button
          type="button"
          onClick={onOpenCommandPalette}
          className="w-full h-9 px-3 rounded-[4px] border border-[var(--border-hairline)] bg-[var(--bg-subtle)] hover:bg-[var(--bg-hover)] text-left flex items-center justify-between text-[13px] text-[var(--text-muted)] transition-colors group"
        >
          <div className="flex items-center gap-2.5 truncate">
            <Search size={15} className="text-[var(--text-dim)] group-hover:text-[var(--text-muted)] shrink-0" />
            <span className="truncate font-jetbrains text-[13px] text-[var(--text-muted)]">
              Search incidents, runbooks, or past fixes...
            </span>
          </div>
          <kbd className="hidden sm:inline-block text-[11px] font-jetbrains text-[var(--text-dim)] bg-[var(--bg-surface)] px-1.5 py-0.5 rounded border border-[var(--border-hairline)] shrink-0 shadow-2xs">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Right Navigation & Status */}
      <div className="flex items-center gap-4 text-[13px]">
        {/* Incidents in memory status */}
        <div className="flex items-center gap-2 text-[13px] text-[var(--text-muted)]">
          <span className="w-2 h-2 rounded-full bg-[var(--accent)]" />
          <span className="tabular-nums font-bold text-[var(--text-primary)]">
            {incidentsInMemory}
          </span>
          <span className="hidden sm:inline text-[var(--text-muted)]">incidents in memory</span>
        </div>

        <div className="h-4 w-px bg-[var(--border-hairline)] hidden sm:block" />

        {/* User Identity Avatar */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-[var(--primary-container)] text-white font-jetbrains text-[12px] font-bold flex items-center justify-center tracking-tight shadow-2xs">
            AV
          </div>
          <span className="hidden md:inline text-[13px] font-medium text-[var(--text-primary)]">
            Alex Vance
          </span>
        </div>
      </div>
    </header>
  );
};
