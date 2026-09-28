import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Check, AlertCircle, Loader2 } from 'lucide-react';
import { OutcomeType, OutcomeSubmission, OutcomeResponse } from '../types';
import { OutcomeBadge } from './Badge';
import { api } from '../api';

interface OutcomeBarProps {
  incidentId: string;
  onOutcomeStored?: (newTotalInMemory: number) => void;
}

export const OutcomeBar: React.FC<OutcomeBarProps> = ({
  incidentId,
  onOutcomeStored,
}) => {
  const [selectedOutcome, setSelectedOutcome] = useState<OutcomeType | null>(null);
  const [notes, setNotes] = useState('');
  const [changesMade, setChangesMade] = useState('');
  const [actualRootCause, setActualRootCause] = useState('');
  const [ttrMinutes, setTtrMinutes] = useState<string>('35');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedResponse, setSubmittedResponse] = useState<OutcomeResponse | null>(null);

  // Check if this incident was previously submitted
  useEffect(() => {
    const existing = api.getExistingSubmission(incidentId);
    if (existing) {
      setSelectedOutcome(existing.submission.outcome);
      setSubmittedResponse(existing.response);
    } else {
      setSelectedOutcome(null);
      setSubmittedResponse(null);
      setError(null);
      setNotes('');
      setChangesMade('');
      setActualRootCause('');
    }
  }, [incidentId]);

  // Keyboard shortcuts 1 / 2 / 3 for outcome selection (when not inside inputs)
  useEffect(() => {
    if (submittedResponse) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement?.tagName || '').toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') {
        return;
      }

      if (e.key === '1') {
        e.preventDefault();
        setSelectedOutcome('worked');
        setError(null);
      } else if (e.key === '2') {
        e.preventDefault();
        setSelectedOutcome('worked_with_changes');
        setError(null);
      } else if (e.key === '3') {
        e.preventDefault();
        setSelectedOutcome('failed');
        setError(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [submittedResponse]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedOutcome || loading) return;

    if (selectedOutcome === 'worked_with_changes' && !changesMade.trim()) {
      setError('Please specify what you changed or did differently.');
      return;
    }
    if (selectedOutcome === 'failed' && !actualRootCause.trim()) {
      setError('Please describe what happened instead or the actual root cause.');
      return;
    }

    setLoading(true);
    setError(null);

    const payload: OutcomeSubmission = {
      outcome: selectedOutcome,
      changes_made: selectedOutcome === 'worked_with_changes' ? changesMade.trim() : null,
      actual_root_cause: selectedOutcome === 'failed' ? actualRootCause.trim() : null,
      notes: notes.trim() || null,
      ttr_minutes: ttrMinutes ? parseInt(ttrMinutes, 10) : null,
    };

    try {
      const res = await api.submitOutcome(incidentId, payload);
      setSubmittedResponse(res);
      if (onOutcomeStored) {
        onOutcomeStored(res.incidents_in_memory);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to save outcome to memory. Please retry.');
    } finally {
      setLoading(false);
    }
  };

  // Locked confirmation panel after submission
  if (submittedResponse && selectedOutcome) {
    return (
      <div className="sticky bottom-0 z-20 w-full border-t border-[var(--border-hairline)] bg-[var(--bg-surface)] py-3 px-6 shadow-sm font-jetbrains text-[13px]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-[4px] bg-[var(--sem-green-bg)] border border-[var(--sem-green-border)] flex items-center justify-center text-[var(--sem-green)] shrink-0">
              <Check size={16} strokeWidth={2.5} />
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="font-bold text-[13px] text-[var(--text-primary)]">
                  Saved to memory
                </span>
                <OutcomeBadge outcome={selectedOutcome} />
                <span className="text-[12px] text-[var(--text-dim)]">
                  (Resolution recorded for {incidentId})
                </span>
              </div>
              <p className="text-[12px] text-[var(--text-muted)]">
                {submittedResponse.memory_summary}
              </p>
            </div>
          </div>

          <Link
            to="/"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] border border-[var(--border-hairline)] bg-[var(--bg-subtle)] hover:bg-[var(--bg-hover)] text-[12px] font-bold text-[var(--text-primary)] transition-colors self-start sm:self-center shrink-0"
          >
            <ArrowLeft size={14} />
            <span>Back to Queue</span>
          </Link>
        </div>
      </div>
    );
  }

  const isExpanded = selectedOutcome === 'worked_with_changes' || selectedOutcome === 'failed';

  return (
    <div className="sticky bottom-0 z-20 w-full border-t border-[var(--border-hairline)] bg-[var(--bg-surface)] shadow-lg font-jetbrains text-[13px]">
      <div className="py-3 px-6 max-w-7xl mx-auto space-y-3">
        {/* Main Bar: Prompt and 3 Equal-Weight Buttons */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[13px]">
            <span className="font-bold text-[var(--text-primary)] text-[14px]">
              How did the recommended fix go?
            </span>
            <span className="text-[12px] text-[var(--text-dim)] hidden sm:inline">
              [1 / 2 / 3]
            </span>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* WORKED */}
            <button
              type="button"
              onClick={() => {
                setSelectedOutcome('worked');
                setError(null);
              }}
              className={`px-3.5 py-1.5 text-[12px] font-bold rounded-[4px] border transition-all flex items-center gap-1.5 ${
                selectedOutcome === 'worked'
                  ? 'border-[var(--sem-green)] bg-[var(--sem-green-bg)] text-[var(--sem-green)] shadow-2xs'
                  : 'border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-[var(--sem-green)]" />
              <span>WORKED</span>
            </button>

            {/* WORKED WITH CHANGES */}
            <button
              type="button"
              onClick={() => {
                setSelectedOutcome('worked_with_changes');
                setError(null);
              }}
              className={`px-3.5 py-1.5 text-[12px] font-bold rounded-[4px] border transition-all flex items-center gap-1.5 ${
                selectedOutcome === 'worked_with_changes'
                  ? 'border-[var(--sem-amber)] bg-[var(--sem-amber-bg)] text-[var(--sem-amber)] shadow-2xs'
                  : 'border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-[var(--sem-amber)]" />
              <span>WORKED WITH CHANGES</span>
            </button>

            {/* FAILED */}
            <button
              type="button"
              onClick={() => {
                setSelectedOutcome('failed');
                setError(null);
              }}
              className={`px-3.5 py-1.5 text-[12px] font-bold rounded-[4px] border transition-all flex items-center gap-1.5 ${
                selectedOutcome === 'failed'
                  ? 'border-[var(--sem-red)] bg-[var(--sem-red-bg)] text-[var(--sem-red)] shadow-2xs'
                  : 'border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-[var(--sem-red)]" />
              <span>FAILED</span>
            </button>

            {/* When 'WORKED' is selected: immediate confirm with optional notes */}
            {selectedOutcome === 'worked' && (
              <div className="flex items-center gap-2 pl-2">
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional resolution notes..."
                  className="w-48 sm:w-64 px-2.5 py-1.5 text-[12px] rounded-[4px] border border-[var(--border-hairline)] bg-[var(--bg-subtle)] text-[var(--text-primary)] placeholder-[var(--text-dim)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] font-jetbrains"
                />
                <button
                  type="button"
                  onClick={() => handleSubmit()}
                  disabled={loading}
                  className="px-3.5 py-1.5 text-[12px] font-bold rounded-[4px] bg-[var(--primary)] text-white hover:bg-[var(--accent-hover)] disabled:opacity-50 flex items-center gap-1.5 transition-colors shrink-0 shadow-2xs"
                >
                  {loading && <Loader2 size={13} className="animate-spin" />}
                  <span>Confirm and save to memory</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Expanded Details when WORKED WITH CHANGES or FAILED is selected */}
        {isExpanded && (
          <form
            onSubmit={handleSubmit}
            className="pt-3 border-t border-[var(--border-hairline)] space-y-3"
          >
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
              {/* Detailed text area */}
              <div className="md:col-span-8 space-y-1">
                <label className="block text-[12px] font-bold text-[var(--text-primary)]">
                  {selectedOutcome === 'worked_with_changes' ? (
                    <span>
                      What did you change or do differently? <span className="text-[var(--sem-red)]">*</span>
                    </span>
                  ) : (
                    <span>
                      What happened instead / actual root cause? <span className="text-[var(--sem-red)]">*</span>
                    </span>
                  )}
                </label>
                <textarea
                  required
                  rows={2}
                  value={selectedOutcome === 'worked_with_changes' ? changesMade : actualRootCause}
                  onChange={(e) =>
                    selectedOutcome === 'worked_with_changes'
                      ? setChangesMade(e.target.value)
                      : setActualRootCause(e.target.value)
                  }
                  placeholder={
                    selectedOutcome === 'worked_with_changes'
                      ? 'e.g., Set worker timeout to 15s instead of 30s; restarted secondary cluster first.'
                      : 'e.g., Restart caused a cascade failure in redis-cache; root cause was missing db migration.'
                  }
                  className="w-full p-2.5 text-[12px] rounded-[4px] border border-[var(--border-hairline)] bg-[var(--bg-subtle)] text-[var(--text-primary)] placeholder-[var(--text-dim)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] leading-relaxed font-jetbrains"
                />
              </div>

              {/* Time to resolve + Save button */}
              <div className="md:col-span-4 space-y-1">
                <label className="block text-[12px] font-bold text-[var(--text-muted)]">
                  Time-to-resolve (minutes) <span className="text-[var(--sem-red)]">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="number"
                      min="1"
                      required
                      value={ttrMinutes}
                      onChange={(e) => setTtrMinutes(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-[12px] rounded-[4px] border border-[var(--border-hairline)] bg-[var(--bg-subtle)] text-[var(--text-primary)] font-jetbrains tabular-nums"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[12px] text-[var(--text-dim)] font-jetbrains">
                      min
                    </span>
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-1.5 text-[12px] font-bold rounded-[4px] bg-[var(--primary)] text-white hover:bg-[var(--accent-hover)] disabled:opacity-50 flex items-center justify-center gap-1.5 shrink-0 transition-colors shadow-2xs"
                  >
                    {loading && <Loader2 size={13} className="animate-spin" />}
                    <span>Confirm and save to memory</span>
                  </button>
                </div>
              </div>
            </div>

            {error && (
              <div className="p-2.5 rounded-[4px] border border-[var(--sem-red-border)] bg-[var(--sem-red-bg)] text-[12px] text-[var(--sem-red)] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{error}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleSubmit()}
                  className="px-2.5 py-0.5 rounded border border-[var(--sem-red)] bg-white text-[11px] font-bold hover:bg-[var(--bg-hover)]"
                >
                  Retry
                </button>
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  );
};
