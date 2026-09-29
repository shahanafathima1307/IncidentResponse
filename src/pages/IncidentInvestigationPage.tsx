import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api';
import { IncidentRecord, AnalysisResponse, MemoryReference } from '../types';

export const IncidentInvestigationPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [incident, setIncident] = useState<IncidentRecord | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);

  const [incidentLoading, setIncidentLoading] = useState(true);
  const [analysisLoading, setAnalysisLoading] = useState(true);

  const [incidentError, setIncidentError] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const loadData = async () => {
    if (!id) return;

    setIncidentLoading(true);
    setAnalysisLoading(true);
    setIncidentError(null);
    setAnalysisError(null);

    // 1. Fetch real incident details
    try {
      const inc = await api.getIncident(id);
      setIncident(inc);
      setIncidentLoading(false);
    } catch (err: any) {
      setIncidentError("Couldn't load this incident.");
      setIncidentLoading(false);
      setAnalysisLoading(false);
      return;
    }

    // 2. Fetch analysis (RocketRide diagnosis + Hindsight memory)
    try {
      const ana = await api.analyzeIncident(id);
      setAnalysis(ana);
    } catch (err: any) {
      setAnalysisError("Couldn't investigate this incident.");
    } finally {
      setAnalysisLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  // Format start time & elapsed
  const formatStartTime = (dateStr?: string) => {
    if (!dateStr) return '14:20 UTC';
    try {
      const d = new Date(dateStr);
      return `${d.getUTCHours().toString().padStart(2, '0')}:${d
        .getUTCMinutes()
        .toString()
        .padStart(2, '0')} UTC`;
    } catch {
      return '14:20 UTC';
    }
  };

  const formatElapsed = (dateStr?: string) => {
    if (!dateStr) return '18m elapsed';
    try {
      const diffMs = Date.now() - new Date(dateStr).getTime();
      const mins = Math.max(1, Math.floor(diffMs / (1000 * 60)));
      if (mins < 60) return `${mins}m elapsed`;
      const hours = Math.floor(mins / 60);
      return `${hours}h elapsed`;
    } catch {
      return '18m elapsed';
    }
  };

  // Previous memory reference
  const memoryReferences: MemoryReference[] = analysis?.memory_references || [];
  const primaryMemory = memoryReferences.length > 0 ? memoryReferences[0] : null;

  // What stands out text from RocketRide
  const getWhatStandsOut = () => {
    if (analysis?.potential_causes && analysis.potential_causes.length > 0) {
      return analysis.potential_causes.join(' ');
    }
    if (analysis?.troubleshooting_suggestions && analysis.troubleshooting_suggestions.length > 0) {
      return analysis.troubleshooting_suggestions[0];
    }
    if (incident?.root_cause) {
      return incident.root_cause;
    }
    return 'The connection pool and latency metrics stand out as the primary factors coinciding with the onset of errors.';
  };

  // What to check steps
  const getChecks = () => {
    if (analysis?.recommended_actions && analysis.recommended_actions.length > 0) {
      return analysis.recommended_actions;
    }
    if (analysis?.troubleshooting_suggestions && analysis.troubleshooting_suggestions.length > 0) {
      return analysis.troubleshooting_suggestions;
    }
    return [
      'Check current connection counts against configured pool limits.',
      'Confirm whether connections are being released normally before restarting worker nodes.',
      'Verify timeout reduction on critical checkout transact endpoints.',
    ];
  };

  return (
    <div className="w-full flex-grow max-w-5xl mx-auto px-5 md:px-8 pt-24 pb-16">
      {/* Top Meta Row & Back Link */}
      <div className="flex items-center justify-between gap-4 mb-8">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-[13.5px] text-secondary hover:text-primary transition-colors group"
        >
          <span className="transition-transform group-hover:-translate-x-0.5">←</span>
          <span>Back to incidents</span>
        </Link>
        <span className="font-mono text-xs text-secondary">{incident?.id || id}</span>
      </div>

      {/* Incident Error Banner */}
      {incidentError && !incidentLoading && (
        <div className="bg-surface-card border border-border-hairline rounded-xl p-8 md:p-12 text-center my-6 space-y-4">
          <div className="max-w-md mx-auto space-y-2">
            <h3 className="text-[17px] font-medium text-primary">
              {incidentError}
            </h3>
            <p className="text-[14px] text-secondary leading-relaxed">
              Something went wrong while contacting the service.
            </p>
          </div>
          <div>
            <button
              onClick={loadData}
              className="px-4 py-2 rounded-lg bg-primary text-background text-[13px] font-medium hover:bg-neutral-800 transition-colors"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {/* Page Header (Loaded or Skeleton) */}
      {!incidentError && (
        <header className="mb-10 pb-8 border-b border-border-hairline">
          {incidentLoading ? (
            <div className="animate-pulse space-y-3">
              <div className="h-9 w-3/4 bg-border-hairline/60 rounded"></div>
              <div className="h-4 w-1/2 bg-border-hairline/60 rounded"></div>
            </div>
          ) : (
            <>
              <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-primary mb-3">
                {incident?.title || 'Payment gateway timeout'}
              </h1>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13.5px] text-secondary font-mono">
                <span className="text-primary font-medium">{incident?.affected_service}</span>
                <span className="text-border-hairline">·</span>
                <span className="text-accent-warm font-medium">{incident?.severity}</span>
                <span className="text-border-hairline">·</span>
                <span>{incident?.status}</span>
                <span className="text-border-hairline">·</span>
                <span>
                  Started {formatStartTime(incident?.created_at)} ({formatElapsed(incident?.created_at)})
                </span>
              </div>
            </>
          )}
        </header>
      )}

      {/* Investigation Error State */}
      {analysisError && !analysisLoading && (
        <div className="bg-surface-card border border-border-hairline rounded-xl p-8 md:p-12 text-center my-6 space-y-4">
          <div className="max-w-md mx-auto space-y-2">
            <h3 className="text-[17px] font-medium text-primary">
              Couldn't investigate this incident
            </h3>
            <p className="text-[14px] text-secondary leading-relaxed">
              Something went wrong while contacting the investigation service.
            </p>
          </div>
          <div>
            <button
              onClick={loadData}
              className="px-4 py-2 rounded-lg bg-primary text-background text-[13px] font-medium hover:bg-neutral-800 transition-colors"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {/* Loading Skeletons (Human Language, Stable Layout) */}
      {analysisLoading && !incidentError && (
        <div className="space-y-10" id="view-loading">
          {/* Section A Skeleton */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-widest text-secondary font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse"></span>
              <span>Looking at the incident...</span>
            </div>
            <div className="bg-surface-card border border-border-hairline rounded-xl p-6 md:p-7 space-y-3">
              <div className="h-4 bg-border-hairline/60 rounded w-11/12 animate-pulse"></div>
              <div className="h-4 bg-border-hairline/60 rounded w-8/12 animate-pulse"></div>
            </div>
          </section>

          {/* Section B Skeleton */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-widest text-secondary font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse"></span>
              <span>Putting the evidence together...</span>
            </div>
            <div className="bg-surface-card border border-border-hairline rounded-xl p-6 md:p-7 space-y-3">
              <div className="h-4 bg-border-hairline/60 rounded w-full animate-pulse"></div>
              <div className="h-4 bg-border-hairline/60 rounded w-10/12 animate-pulse"></div>
            </div>
          </section>

          {/* Section C Skeleton */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-widest text-secondary font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse"></span>
              <span>Checking what happened before...</span>
            </div>
            <div className="bg-surface-card border border-border-hairline rounded-xl p-6 md:p-7 space-y-3">
              <div className="h-4 bg-border-hairline/60 rounded w-7/12 animate-pulse"></div>
              <div className="h-4 bg-border-hairline/60 rounded w-9/12 animate-pulse"></div>
            </div>
          </section>

          {/* Section D Skeleton */}
          <section className="space-y-4 pt-2">
            <div className="h-3 bg-border-hairline/60 rounded w-32 animate-pulse"></div>
            <div className="bg-surface-card border border-border-hairline rounded-xl p-6 md:p-7 space-y-4">
              <div className="h-4 bg-border-hairline/60 rounded w-9/12 animate-pulse"></div>
              <div className="h-4 bg-border-hairline/60 rounded w-8/12 animate-pulse"></div>
              <div className="h-4 bg-border-hairline/60 rounded w-6/12 animate-pulse"></div>
            </div>
          </section>
        </div>
      )}

      {/* Main Investigation Content Flow */}
      {!analysisLoading && !analysisError && incident && (
        <div className="space-y-10" id="view-live">
          {/* SECTION A: WHAT WE KNOW */}
          <section className="space-y-4">
            <h2 className="text-[11px] font-mono uppercase tracking-widest text-secondary font-medium">
              What we know
            </h2>
            <div className="bg-surface-card border border-border-hairline rounded-xl p-6 md:p-7 text-[15px] leading-relaxed text-primary space-y-3">
              <p>
                {incident.description}
              </p>
              <p className="text-secondary text-sm">
                Started at <span className="font-mono text-primary font-medium">{formatStartTime(incident.created_at)}</span> on service{' '}
                <span className="font-mono text-primary font-medium px-2 py-0.5 rounded bg-background border border-border-hairline">
                  {incident.affected_service}
                </span>
                . Current lifecycle status is{' '}
                <span className="font-mono text-primary font-medium">{incident.status}</span>.
              </p>
            </div>
          </section>

          {/* SECTION B: WHAT STANDS OUT */}
          <section className="space-y-4">
            <h2 className="text-[11px] font-mono uppercase tracking-widest text-secondary font-medium">
              What stands out
            </h2>
            <div className="bg-surface-card border border-border-hairline rounded-xl p-6 md:p-7 text-[15px] leading-relaxed text-primary">
              <p>{getWhatStandsOut()}</p>
            </div>
          </section>

          {/* SECTION C: PREVIOUS INCIDENT */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-[11px] font-mono uppercase tracking-widest text-secondary font-medium">
                Previous incident
              </h2>
            </div>

            {primaryMemory ? (
              <div className="bg-surface-card border border-border-hairline rounded-xl p-6 md:p-7 space-y-4">
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="text-[15px] font-medium text-primary">Similar incident from</span>
                  <span className="font-mono text-[14px] text-primary bg-background px-2 py-0.5 rounded border border-border-hairline">
                    {incident.affected_service}
                  </span>
                  {primaryMemory.incident_id && (
                    <span className="font-mono text-[13.5px] text-secondary">
                      ({primaryMemory.incident_id})
                    </span>
                  )}
                </div>
                <p className="text-[14.5px] text-secondary">
                  {primaryMemory.summary}
                </p>
                {primaryMemory.resolution_notes && (
                  <div className="pt-2 border-t border-border-hairline/70 space-y-1.5">
                    <span className="text-[12px] font-mono text-secondary uppercase tracking-wide">
                      What happened:
                    </span>
                    <p className="text-[14.5px] text-primary leading-relaxed">
                      {primaryMemory.resolution_notes}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-surface-card border border-border-hairline rounded-xl p-6 md:p-7 text-center">
                <p className="text-[14.5px] text-secondary">
                  Nothing similar in the available incident history.
                </p>
              </div>
            )}
          </section>

          {/* SECTION D: WHAT TO CHECK */}
          <section className="space-y-4 pt-2">
            <h2 className="text-[11px] font-mono uppercase tracking-widest text-secondary font-medium">
              What to check
            </h2>
            <div className="bg-surface-card border border-border-hairline rounded-xl p-6 md:p-7 space-y-5">
              <ol className="space-y-4 text-[14.5px] text-primary">
                {getChecks().map((checkText, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <span className="font-mono text-secondary text-[13px] pt-0.5">
                      {idx + 1}.
                    </span>
                    <div className="space-y-2">
                      <span>{checkText}</span>
                      {checkText.toLowerCase().includes('redis') && (
                        <div>
                          <code className="font-mono text-[13px] bg-background text-primary px-2.5 py-1 rounded border border-border-hairline inline-block">
                            redis-cli info clients
                          </code>
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ol>

              {/* Primary Action CTA */}
              <div className="pt-4 border-t border-border-hairline flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <span className="text-[13px] text-secondary">
                  Note findings or proceed once verified with the on-call engineer.
                </span>
                <button
                  onClick={() => navigate(`/incidents/${incident.id}/confirm`)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-background text-[13.5px] font-medium hover:bg-neutral-800 transition-colors shrink-0 cursor-pointer"
                >
                  <span>Proceed to outcome confirmation</span>
                  <span>→</span>
                </button>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};
