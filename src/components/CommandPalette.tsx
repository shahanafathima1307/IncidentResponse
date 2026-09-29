import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, AlertTriangle, BookOpen, Layers, Terminal } from 'lucide-react';
import { MOCK_INCIDENTS, MOCK_DOCUMENTS } from '../mockData';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onToggleMemory?: () => void;
  memoryEnabled?: boolean;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onToggleMemory,
  memoryEnabled,
}) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const filteredIncidents = MOCK_INCIDENTS.filter(
    (i) =>
      i.id.toLowerCase().includes(query.toLowerCase()) ||
      i.service.toLowerCase().includes(query.toLowerCase()) ||
      i.alert.toLowerCase().includes(query.toLowerCase())
  );

  const filteredDocs = MOCK_DOCUMENTS.filter(
    (d) =>
      d.id.toLowerCase().includes(query.toLowerCase()) ||
      d.title.toLowerCase().includes(query.toLowerCase())
  );

  const allActions = React.useMemo(() => {
    const list: Array<{ id: string; action: () => void }> = [
      { id: 'go-stream', action: () => { navigate('/'); onClose(); } },
    ];
    if (onToggleMemory) {
      list.push({ id: 'toggle-mem', action: () => { onToggleMemory(); onClose(); } });
    }
    filteredIncidents.slice(0, 5).forEach((inc) => {
      list.push({ id: inc.id, action: () => { navigate(`/incidents/${inc.id}`); onClose(); } });
    });
    return list;
  }, [filteredIncidents, onToggleMemory, navigate, onClose]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % Math.max(allActions.length, 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + allActions.length) % Math.max(allActions.length, 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (allActions[selectedIndex]) {
          allActions[selectedIndex].action();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, allActions, selectedIndex]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 font-jetbrains">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-[1px]"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Box */}
      <div className="relative w-full max-w-xl bg-[var(--bg-surface)] border border-[var(--text-primary)] rounded-[5px] overflow-hidden z-10 flex flex-col font-jetbrains shadow-lg">
        {/* Search Input Bar */}
        <div className="p-3 border-b border-[var(--border-hairline)] flex items-center gap-2.5">
          <Search size={16} className="text-[var(--text-muted)] shrink-0" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type incident ID, service, runbook or action..."
            className="w-full text-[13px] font-jetbrains bg-transparent text-[var(--text-primary)] placeholder-[var(--text-dim)] focus:outline-none"
          />
          <button
            onClick={onClose}
            className="p-1 rounded-[3px] text-[var(--text-dim)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]"
          >
            <X size={15} />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-3 text-[13px] font-jetbrains">
          {/* Quick Actions */}
          <div className="space-y-1">
            <div className="text-[11px] font-jetbrains text-[var(--text-dim)] uppercase px-2 py-0.5 font-bold">
              SYSTEM ACTIONS
            </div>
            <button
              onClick={() => {
                navigate('/');
                onClose();
              }}
              className={`w-full flex items-center justify-between p-2 rounded-[3px] text-left transition-colors ${
                selectedIndex === 0 ? 'bg-[var(--bg-hover)] ring-1 ring-[var(--accent)]' : 'hover:bg-[var(--bg-subtle)]'
              }`}
            >
              <div className="flex items-center gap-2">
                <Layers size={15} className="text-[var(--accent)]" />
                <span className="font-bold text-[var(--text-primary)]">Go to Incidents Stream</span>
              </div>
              <span className="text-[11px] font-jetbrains text-[var(--text-dim)] bg-[var(--bg-subtle)] px-1.5 py-0.5 rounded border border-[var(--border-hairline)]">
                G + I
              </span>
            </button>

            {onToggleMemory && (
              <button
                onClick={() => {
                  onToggleMemory();
                  onClose();
                }}
                className={`w-full flex items-center justify-between p-2 rounded-[3px] text-left transition-colors ${
                  selectedIndex === 1 ? 'bg-[var(--bg-hover)] ring-1 ring-[var(--accent)]' : 'hover:bg-[var(--bg-subtle)]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Terminal size={15} className="text-[var(--accent)]" />
                  <span className="font-bold text-[var(--text-primary)]">
                    Toggle Memory Engine ({memoryEnabled ? 'Currently ON' : 'Currently OFF'})
                  </span>
                </div>
                <span className="text-[11px] font-jetbrains text-[var(--text-dim)] bg-[var(--bg-subtle)] px-1.5 py-0.5 rounded border border-[var(--border-hairline)]">
                  M
                </span>
              </button>
            )}
          </div>

          {/* Incidents */}
          <div className="space-y-1 border-t border-[var(--border-hairline)] pt-2">
            <div className="text-[11px] font-jetbrains text-[var(--text-dim)] uppercase px-2 py-0.5 font-bold">
              INCIDENTS ({filteredIncidents.length})
            </div>
            {filteredIncidents.slice(0, 5).map((inc, iIdx) => {
              const itemActionIdx = (onToggleMemory ? 2 : 1) + iIdx;
              const isSelected = selectedIndex === itemActionIdx;
              return (
                <button
                  key={inc.id}
                  onClick={() => {
                    navigate(`/incidents/${inc.id}`);
                    onClose();
                  }}
                  className={`w-full flex items-center justify-between p-2 rounded-[3px] text-left transition-colors ${
                    isSelected ? 'bg-[var(--bg-hover)] ring-1 ring-[var(--accent)]' : 'hover:bg-[var(--bg-subtle)]'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="font-jetbrains font-bold text-[var(--accent)] text-[13px]">
                      {inc.id}
                    </span>
                    <span className="text-[var(--text-muted)] font-jetbrains text-[12px]">
                      [{inc.service}]
                    </span>
                    <span className="truncate text-[var(--text-primary)] text-[13px]">
                      {inc.alert}
                    </span>
                  </div>
                  <span className="text-[11px] font-jetbrains text-[var(--text-dim)] shrink-0 ml-2">
                    {inc.severity}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Documentation */}
          {filteredDocs.length > 0 && (
            <div className="space-y-1 border-t border-[var(--border-hairline)] pt-2">
              <div className="text-[11px] font-jetbrains text-[var(--text-dim)] uppercase px-2 py-0.5 font-bold">
                RUNBOOKS & RFCs ({filteredDocs.length})
              </div>
              {filteredDocs.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-2 rounded-[3px] hover:bg-[var(--bg-subtle)] text-left cursor-default"
                >
                  <div className="flex items-center gap-2">
                    <BookOpen size={15} className="text-[var(--text-dim)]" />
                    <span className="font-jetbrains text-[12px] font-bold text-[var(--accent)]">
                      {doc.id}
                    </span>
                    <span className="text-[13px] text-[var(--text-primary)]">{doc.title}</span>
                  </div>
                  <span className="text-[11px] font-jetbrains text-[var(--text-dim)]">
                    {doc.used_in_count} used
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="p-2 border-t border-[var(--border-hairline)] bg-[var(--bg-subtle)] flex items-center justify-between text-[11px] font-jetbrains text-[var(--text-dim)]">
          <span>Navigate with ↑ ↓ · Select with ↵</span>
          <span>ESC to dismiss</span>
        </div>
      </div>
    </div>
  );
};
