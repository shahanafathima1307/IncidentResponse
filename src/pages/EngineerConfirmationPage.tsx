import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api';
import { IncidentRecord, OutcomeChoice } from '../types';

export const EngineerConfirmationPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [incident, setIncident] = useState<IncidentRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedOutcome, setSelectedOutcome] = useState<OutcomeChoice>('worked');
  const [notes, setNotes] = useState(
    'Expanded pool ceiling to 2,500 without restarting pods; connection count stabilized within 2 minutes.'
  );

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [resolvedTimestamp, setResolvedTimestamp] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    api
      .getIncident(id)
      .then((inc) => {
        setIncident(inc);
        if (inc.outcome) {
          // If already resolved
          if (inc.outcome === 'worked_with_changes') {
            setSelectedOutcome('worked_with_changes');
          } else if (inc.outcome === 'didnt_work' || inc.outcome === 'failed') {
            setSelectedOutcome('didnt_work');
          } else {
            setSelectedOutcome('worked');
          }
          if (inc.resolution) {
            setNotes(inc.resolution);
          }
          if (inc.resolved_at) {
            setResolvedTimestamp(inc.resolved_at);
            setSaveSuccess(true);
          }
        }
      })
      .catch(() => {
        setError("Couldn't load this incident.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  const handleSaveOutcome = async () => {
    if (!id || !incident) return;
    setIsSaving(true);
    setSaveError(null);

    const outcomeLabels: Record<string, string> = {
      worked: 'Resolved cleanly. Suggested actions stabilized service health.',
      worked_with_changes: 'Resolved with parameter adjustments.',
      didnt_work: 'Did not resolve. Issue persisted under observed traffic.',
    };

    try {
      const res = await api.resolveIncident(id, {
        root_cause:
          incident.root_cause ||
          'Connection pool exhaustion under concurrent traffic surge',
        resolution:
          notes.trim() ||
          'Applied recommended pool expansion and tuned idle client timeout.',
        outcome: selectedOutcome,
      });

      setIncident(res);
      setResolvedTimestamp(res.resolved_at || new Date().toISOString());
      setSaveSuccess(true);
    } catch (err: any) {
      setSaveError("Couldn't save the outcome.");
    } finally {
      setIsSaving(false);
    }
  };

  const formatLogTime = (dateStr?: string | null) => {
    if (!dateStr) return '14:38 UTC';
    try {
      const d = new Date(dateStr);
      return `${d.getUTCHours().toString().padStart(2, '0')}:${d
        .getUTCMinutes()
        .toString()
        .padStart(2, '0')} UTC`;
    } catch {
      return '14:38 UTC';
    }
  };

  return (
    <div className="w-full flex-grow max-w-4xl mx-auto px-6 pt-24 pb-16">
      {/* Calm Process Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-secondary mb-8">
        <Link to="/" className="hover:text-primary transition-colors">
          Incident
        </Link>
        <span className="text-border-hairline">→</span>
        <Link
          to={id ? `/incidents/${id}` : '/'}
          className="hover:text-primary transition-colors"
        >
          Investigation
        </Link>
        <span className="text-border-hairline">→</span>
        <span className="font-medium text-primary">Engineer feedback</span>
        <span className="text-border-hairline">→</span>
        <span className={saveSuccess ? 'font-medium text-primary' : 'text-secondary/70'}>
          Saved to memory
        </span>
      </div>

      {/* Error state */}
      {error && !loading && (
        <div className="bg-surface-card border border-border-hairline rounded-xl p-8 text-center my-6">
          <p className="text-base text-primary mb-3">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 rounded-lg bg-primary text-background text-xs font-medium"
          >
            Back to incidents
          </button>
        </div>
      )}

      {/* Editorial Header Section */}
      {!error && (
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-3">
            <span className="font-mono text-xs text-secondary uppercase tracking-wider">
              {incident?.id || id}
            </span>
            <span className="text-border-hairline">•</span>
            <span className="text-xs text-secondary">Resolution confirmation</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-light tracking-tight text-primary mb-3">
            How did it go?
          </h1>
          <p className="text-base text-secondary max-w-2xl leading-relaxed">
            Confirm whether the suggested action helped resolve the incident so future investigations have the right context.
          </p>

          {/* Incident & Action Context Summary */}
          <div className="mt-8 rounded-xl bg-surface-card border border-border-hairline p-5">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              <div className="md:col-span-4 flex flex-col gap-1.5">
                <span className="text-xs font-medium text-secondary">Incident</span>
                <div className="text-sm font-medium text-primary">
                  {incident?.title || 'Payment gateway timeout'}
                </div>
                <div className="mt-1">
                  <span className="font-mono text-xs bg-background border border-border-hairline px-2 py-0.5 rounded text-secondary">
                    {incident?.affected_service || 'payment-gateway'}
                  </span>
                </div>
              </div>

              <div className="md:col-span-8 flex flex-col gap-1.5 border-t md:border-t-0 md:border-l border-border-hairline pt-4 md:pt-0 md:pl-6">
                <span className="text-xs font-medium text-secondary">
                  Suggested action taken
                </span>
                <p className="text-sm text-secondary leading-relaxed">
                  Increase Redis connection pool ceiling to 2,500 and verify idle thread release before restarting workers.
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Interactive Outcome Section */}
      {!error && (
        <section className="rounded-xl border border-border-hairline bg-surface p-6 sm:p-8 space-y-8">
          <div>
            <label className="block text-sm font-medium text-primary mb-4">
              Did this resolve the incident?
            </label>
            <div
              className="grid grid-cols-1 sm:grid-cols-3 gap-3"
              role="radiogroup"
            >
              {/* Choice: Worked */}
              <button
                type="button"
                role="radio"
                aria-checked={selectedOutcome === 'worked'}
                disabled={isSaving}
                onClick={() => setSelectedOutcome('worked')}
                className={`choice-btn group flex items-center justify-between p-4 rounded-lg border text-left transition-all cursor-pointer ${
                  selectedOutcome === 'worked'
                    ? 'border-primary bg-surface-card shadow-sm'
                    : 'border-border-hairline bg-transparent hover:bg-surface-card'
                }`}
              >
                <div>
                  <div className="text-sm font-medium text-primary">Worked</div>
                  <div className="text-xs text-secondary mt-0.5">Resolved cleanly</div>
                </div>
                <span
                  className={`material-symbols-outlined text-[18px] transition-colors ${
                    selectedOutcome === 'worked' ? 'text-primary' : 'text-transparent'
                  }`}
                >
                  check
                </span>
              </button>

              {/* Choice: Worked with changes */}
              <button
                type="button"
                role="radio"
                aria-checked={selectedOutcome === 'worked_with_changes'}
                disabled={isSaving}
                onClick={() => setSelectedOutcome('worked_with_changes')}
                className={`choice-btn group flex items-center justify-between p-4 rounded-lg border text-left transition-all cursor-pointer ${
                  selectedOutcome === 'worked_with_changes'
                    ? 'border-primary bg-surface-card shadow-sm'
                    : 'border-border-hairline bg-transparent hover:bg-surface-card'
                }`}
              >
                <div>
                  <div className="text-sm font-medium text-primary">Worked with changes</div>
                  <div className="text-xs text-secondary mt-0.5">Parameters adjusted</div>
                </div>
                <span
                  className={`material-symbols-outlined text-[18px] transition-colors ${
                    selectedOutcome === 'worked_with_changes' ? 'text-primary' : 'text-transparent'
                  }`}
                >
                  check
                </span>
              </button>

              {/* Choice: Didn't work */}
              <button
                type="button"
                role="radio"
                aria-checked={selectedOutcome === 'didnt_work'}
                disabled={isSaving}
                onClick={() => setSelectedOutcome('didnt_work')}
                className={`choice-btn group flex items-center justify-between p-4 rounded-lg border text-left transition-all cursor-pointer ${
                  selectedOutcome === 'didnt_work'
                    ? 'border-primary bg-surface-card shadow-sm'
                    : 'border-border-hairline bg-transparent hover:bg-surface-card'
                }`}
              >
                <div>
                  <div className="text-sm font-medium text-primary">Didn't work</div>
                  <div className="text-xs text-secondary mt-0.5">Issue persisted</div>
                </div>
                <span
                  className={`material-symbols-outlined text-[18px] transition-colors ${
                    selectedOutcome === 'didnt_work' ? 'text-primary' : 'text-transparent'
                  }`}
                >
                  check
                </span>
              </button>
            </div>
          </div>

          {/* Notes Input */}
          <div>
            <label
              htmlFor="engineer-notes"
              className="block text-xs font-medium text-secondary mb-2"
            >
              Notes on what was done (optional)
            </label>
            <textarea
              id="engineer-notes"
              rows={3}
              disabled={isSaving}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., Expanded pool ceiling to 2,500 without restarting pods; connection count stabilized."
              className="w-full rounded-lg border border-border-hairline bg-surface-card-subtle px-4 py-3 text-sm text-primary placeholder:text-secondary/60 focus:border-primary focus:bg-background focus:outline-none transition-colors"
            />
          </div>

          {/* Save Error Notice */}
          {saveError && (
            <div className="p-3 rounded-lg bg-surface-card border border-border-hairline flex items-center justify-between text-xs text-primary">
              <span>{saveError}</span>
              <button
                onClick={handleSaveOutcome}
                className="underline font-medium hover:opacity-80"
              >
                Try again
              </button>
            </div>
          )}

          {/* Submit CTA */}
          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-secondary">
              Updates shared team history
            </span>
            <button
              type="button"
              id="btn-save"
              disabled={isSaving}
              onClick={handleSaveOutcome}
              className={`px-6 py-2.5 rounded-full text-sm font-medium transition-colors inline-flex items-center gap-2 cursor-pointer ${
                saveSuccess
                  ? 'bg-status-resolved text-on-primary'
                  : 'bg-primary hover:bg-neutral-800 text-on-primary'
              } ${isSaving ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {isSaving ? (
                <span>Saving outcome...</span>
              ) : saveSuccess ? (
                <>
                  <span>Outcome recorded</span>
                  <span className="material-symbols-outlined text-[16px]">check</span>
                </>
              ) : (
                <span>Save outcome</span>
              )}
            </button>
          </div>
        </section>
      )}

      {/* Confirmation / Memory Feedback Card (Shown ONLY after backend confirms persistence) */}
      {saveSuccess && (
        <div
          id="memory-feedback"
          className="mt-6 rounded-xl border border-border-hairline bg-surface-card p-5 flex items-start gap-4 transition-all"
        >
          <div className="w-8 h-8 rounded-full bg-border-hairline flex items-center justify-center shrink-0 mt-0.5 text-primary">
            <span className="material-symbols-outlined text-[17px]">bookmark</span>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-primary">
              Got it. We'll keep that outcome with the incident.
            </p>
            <p className="text-xs text-secondary leading-relaxed">
              Saved to memory — The result has been added to incident memory and is now available to help when similar incidents occur in{' '}
              <span className="font-mono text-primary font-medium">
                {incident?.affected_service || 'payment-gateway'}
              </span>
              .
            </p>
          </div>
        </div>
      )}

      {/* Navigation Footer */}
      <div className="mt-10 flex items-center justify-between">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs text-secondary hover:text-primary transition-colors py-2"
        >
          <span>←</span>
          <span>Back to incidents</span>
        </Link>
        {resolvedTimestamp && (
          <span className="font-mono text-[11px] text-secondary">
            Resolution logged at {formatLogTime(resolvedTimestamp)}
          </span>
        )}
      </div>
    </div>
  );
};
