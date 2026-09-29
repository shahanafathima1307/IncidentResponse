import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { IncidentRecord } from '../types';

export const IncidentQueuePage: React.FC = () => {
  const navigate = useNavigate();
  const [incidents, setIncidents] = useState<IncidentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewState, setViewState] = useState<'active' | 'empty'>('active');

  const fetchIncidents = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getIncidents();
      const items = data.items || [];
      setIncidents(items);
      const hasOpen = items.some(
        (inc: IncidentRecord) => inc.status === 'OPEN' || inc.status === 'INVESTIGATING'
      );
      if (!hasOpen) {
        setViewState('empty');
      } else {
        setViewState('active');
      }
    } catch (err: any) {
      setError("Couldn't load incidents.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, []);

  const openIncidents = incidents.filter(
    (inc) => inc.status === 'OPEN' || inc.status === 'INVESTIGATING'
  );
  const resolvedIncidents = incidents.filter(
    (inc) => inc.status === 'RESOLVED' || inc.status === 'CLOSED'
  );

  // Featured active incident: the newest open incident, or fallback to the newest incident
  const activeIncident = openIncidents.length > 0 ? openIncidents[0] : null;

  // Format time elapsed
  const formatElapsed = (dateStr: string) => {
    try {
      const diffMs = Date.now() - new Date(dateStr).getTime();
      const mins = Math.max(1, Math.floor(diffMs / (1000 * 60)));
      if (mins < 60) return `Triggered ${mins}m ago`;
      const hours = Math.floor(mins / 60);
      return `Triggered ${hours}h ago`;
    } catch {
      return 'Triggered recently';
    }
  };

  // Format UTC start time
  const formatUtcTime = (dateStr: string) => {
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

  return (
    <div className="w-full pt-28 pb-16 flex-grow max-w-6xl mx-auto px-6 md:px-10">
      {/* Header Section */}
      <section className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-primary mb-2">
            What's happening?
          </h1>
          <p className="text-base text-secondary">
            Open incidents and the context around them.
          </p>
        </div>

        {/* Restrained State Toggle Controls */}
        <div className="inline-flex p-0.5 rounded-full bg-surface-card border border-border-hairline self-start md:self-auto">
          <button
            id="tabActive"
            onClick={() => setViewState('active')}
            className={`px-3.5 py-1 text-xs font-medium rounded-full transition-all ${
              viewState === 'active'
                ? 'bg-background text-primary shadow-sm'
                : 'text-secondary hover:text-primary'
            }`}
          >
            Active
          </button>
          <button
            id="tabEmpty"
            onClick={() => setViewState('empty')}
            className={`px-3.5 py-1 text-xs font-medium rounded-full transition-all ${
              viewState === 'empty'
                ? 'bg-background text-primary shadow-sm'
                : 'text-secondary hover:text-primary'
            }`}
          >
            No active incidents
          </button>
        </div>
      </section>

      {/* Error state */}
      {error && !loading && (
        <div className="bg-surface-card border border-border-hairline rounded-2xl p-8 mb-12 text-center">
          <p className="text-base text-primary mb-3">{error}</p>
          <button
            onClick={fetchIncidents}
            className="px-5 py-2 rounded-full bg-primary text-on-primary text-xs font-medium hover:bg-neutral-800 transition-colors"
          >
            Try again
          </button>
        </div>
      )}

      {/* Skeleton Loading Card (Stable layout, zero shift) */}
      {loading && (
        <div className="bg-surface-card border border-border-hairline rounded-2xl p-7 md:p-8 mb-12 animate-pulse">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-6 border-b border-border-hairline/60">
            <div className="flex items-center gap-2.5">
              <div className="h-5 w-24 bg-border-hairline/60 rounded"></div>
              <div className="h-5 w-16 bg-border-hairline/60 rounded-full"></div>
              <div className="h-5 w-14 bg-border-hairline/60 rounded-full"></div>
            </div>
            <div className="h-4 w-20 bg-border-hairline/60 rounded"></div>
          </div>
          <div className="py-6 space-y-2">
            <div className="h-8 w-2/3 bg-border-hairline/60 rounded"></div>
            <div className="h-5 w-1/2 bg-border-hairline/60 rounded"></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 py-6 border-t border-b border-border-hairline/60">
            <div>
              <div className="h-8 w-16 bg-border-hairline/60 rounded mb-1"></div>
              <div className="h-3 w-12 bg-border-hairline/60 rounded"></div>
            </div>
            <div>
              <div className="h-8 w-24 bg-border-hairline/60 rounded mb-1"></div>
              <div className="h-3 w-12 bg-border-hairline/60 rounded"></div>
            </div>
            <div>
              <div className="h-8 w-20 bg-border-hairline/60 rounded mb-1"></div>
              <div className="h-3 w-28 bg-border-hairline/60 rounded"></div>
            </div>
          </div>
          <div className="pt-6 flex justify-between items-center">
            <div className="h-4 w-32 bg-border-hairline/60 rounded"></div>
            <div className="h-9 w-28 bg-border-hairline/60 rounded-full"></div>
          </div>
        </div>
      )}

      {/* Active Incident Card Container */}
      {!loading && !error && viewState === 'active' && activeIncident && (
        <div id="activeIncidentContainer" className="transition-opacity duration-200">
          <div className="bg-surface-card border border-border-hairline rounded-2xl p-7 md:p-8 mb-12">
            {/* Top metadata row */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-6 border-b border-border-hairline/60">
              <div className="flex items-center gap-2.5">
                <span className="font-mono text-xs text-primary px-2.5 py-0.5 rounded-md bg-background border border-border-hairline">
                  {activeIncident.affected_service}
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#F5EBE9] text-status-open border border-[#EACEC8]">
                  <span className="w-1.5 h-1.5 rounded-full bg-status-open"></span>
                  {activeIncident.severity}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-background text-secondary border border-border-hairline">
                  {activeIncident.status}
                </span>
              </div>
              <span className="font-mono text-xs text-secondary">{activeIncident.id}</span>
            </div>

            {/* Incident Title & Body */}
            <div className="py-6">
              <h2 className="text-2xl md:text-3xl font-semibold text-primary tracking-tight mb-2">
                {activeIncident.title}
              </h2>
              <p className="text-base text-secondary max-w-2xl leading-relaxed">
                {activeIncident.description}
              </p>
            </div>

            {/* Clean Key Facts Typography Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 py-6 border-t border-b border-border-hairline/60">
              <div>
                <div className="text-3xl font-semibold text-primary tracking-tight">15%</div>
                <div className="text-xs text-secondary mt-1">affected</div>
              </div>
              <div>
                <div className="text-3xl font-semibold text-primary tracking-tight font-mono">
                  0.1% → 15%
                </div>
                <div className="text-xs text-secondary mt-1">errors</div>
              </div>
              <div>
                <div className="text-3xl font-semibold text-primary tracking-tight font-mono">
                  {formatUtcTime(activeIncident.created_at)}{' '}
                  <span className="text-xs text-secondary font-normal font-sans">UTC</span>
                </div>
                <div className="text-xs text-secondary mt-1">
                  Started {formatUtcTime(activeIncident.created_at)}
                </div>
              </div>
            </div>

            {/* Action Row */}
            <div className="pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs text-secondary">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary/60"></span>
                <span>{formatElapsed(activeIncident.created_at)}</span>
              </div>
              <button
                onClick={() => navigate(`/incidents/${activeIncident.id}`)}
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-full bg-primary text-on-primary text-sm font-medium hover:bg-neutral-800 transition-colors shadow-sm cursor-pointer"
              >
                <span>Investigate</span>
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Empty State Container */}
      {!loading && !error && (viewState === 'empty' || !activeIncident) && (
        <div id="emptyIncidentContainer" className="transition-opacity duration-200">
          <div className="bg-surface-card border border-border-hairline rounded-2xl p-10 md:p-12 mb-12 text-center flex flex-col items-center justify-center">
            <div className="w-9 h-9 rounded-full bg-background border border-border-hairline flex items-center justify-center text-status-resolved mb-3">
              <span className="material-symbols-outlined text-[20px]">check</span>
            </div>
            <h3 className="text-lg font-medium text-primary mb-1">No active incidents</h3>
            <p className="text-sm text-secondary max-w-md">
              Everything currently visible to the incident service is resolved.
            </p>
          </div>
        </div>
      )}

      {/* Secondary Columns: Recent Incidents & Previous Incidents */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-10">
        {/* Left Column: Recent Incidents (7 cols) */}
        <div className="lg:col-span-7 flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-border-hairline mb-4">
            <h3 className="text-sm font-medium text-primary">Recent incidents</h3>
            <span className="text-xs text-secondary font-mono">
              {resolvedIncidents.length > 0 ? `${resolvedIncidents.length} resolved` : 'Historical'}
            </span>
          </div>

          <div className="divide-y divide-border-hairline/60">
            {resolvedIncidents.length > 0 ? (
              resolvedIncidents.slice(0, 5).map((inc) => (
                <div
                  key={inc.id}
                  onClick={() => navigate(`/incidents/${inc.id}`)}
                  className="py-3.5 flex items-start justify-between gap-4 cursor-pointer group hover:opacity-90"
                >
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-primary font-medium">
                        {inc.affected_service}
                      </span>
                      <span className="text-secondary/50">·</span>
                      <span className="text-sm font-medium text-primary group-hover:underline decoration-border-hairline">
                        {inc.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-secondary">
                      <span className="font-mono text-[11px]">{inc.id}</span>
                      <span>·</span>
                      <span className="line-clamp-1">
                        {inc.resolution || inc.description}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs text-secondary px-2 py-0.5 rounded-full bg-surface-card border border-border-hairline font-mono text-[11px]">
                      {inc.severity}
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-xs text-status-resolved">
                      <span className="w-1.5 h-1.5 rounded-full bg-status-resolved"></span>
                      Resolved
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <>
                {/* Clean fallback items matching Stitch UI mockup */}
                <div className="py-3.5 flex items-start justify-between gap-4">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-primary font-medium">payments-api</span>
                      <span className="text-secondary/50">·</span>
                      <span className="text-sm font-medium text-primary">Redis connection pool exhaustion</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-secondary">
                      <span className="font-mono text-[11px]">INC-4011</span>
                      <span>·</span>
                      <span>Mitigated via pod auto-restart and pool size expansion (80 → 250)</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs text-secondary px-2 py-0.5 rounded-full bg-surface-card border border-border-hairline font-mono text-[11px]">High</span>
                    <span className="inline-flex items-center gap-1.5 text-xs text-status-resolved">
                      <span className="w-1.5 h-1.5 rounded-full bg-status-resolved"></span>
                      Resolved
                    </span>
                  </div>
                </div>

                <div className="py-3.5 flex items-start justify-between gap-4">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-primary font-medium">checkout-web</span>
                      <span className="text-secondary/50">·</span>
                      <span className="text-sm font-medium text-primary">Worker OOM kills</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-secondary">
                      <span className="font-mono text-[11px]">INC-3982</span>
                      <span>·</span>
                      <span>Dynamic payload cache revert to v2.44.1</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs text-secondary px-2 py-0.5 rounded-full bg-surface-card border border-border-hairline font-mono text-[11px]">Medium</span>
                    <span className="inline-flex items-center gap-1.5 text-xs text-status-resolved">
                      <span className="w-1.5 h-1.5 rounded-full bg-status-resolved"></span>
                      Resolved
                    </span>
                  </div>
                </div>

                <div className="py-3.5 flex items-start justify-between gap-4">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-primary font-medium">search-indexer</span>
                      <span className="text-secondary/50">·</span>
                      <span className="text-sm font-medium text-primary">Elasticsearch shard rebalancing latency</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-secondary">
                      <span className="font-mono text-[11px]">INC-3890</span>
                      <span>·</span>
                      <span>Tier balancing reconfigured during off-peak window</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs text-secondary px-2 py-0.5 rounded-full bg-surface-card border border-border-hairline font-mono text-[11px]">Low</span>
                    <span className="inline-flex items-center gap-1.5 text-xs text-status-resolved">
                      <span className="w-1.5 h-1.5 rounded-full bg-status-resolved"></span>
                      Resolved
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right Column: Previous Incidents Context (5 cols) */}
        <div className="lg:col-span-5 flex flex-col">
          <div className="pb-3 border-b border-border-hairline mb-4">
            <h3 className="text-sm font-medium text-primary">Previous incidents</h3>
            <p className="text-xs text-secondary mt-0.5">
              Some incidents have a recorded outcome that can help with similar problems.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <div className="p-4 rounded-xl bg-surface-card border border-border-hairline flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-primary">
                  payment-gateway / Redis connection pool
                </span>
                <span className="font-mono text-[11px] text-secondary">INC-3741</span>
              </div>
              <p className="text-xs text-secondary leading-relaxed">
                Resolved after worker pool ceiling expansion to 2,500 and timeout adjustment on socket pools.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-surface-card border border-border-hairline flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-primary">
                  checkout-web / Pod dropouts
                </span>
                <span className="font-mono text-[11px] text-secondary">INC-3518</span>
              </div>
              <p className="text-xs text-secondary leading-relaxed">
                Resolved by pinning ingress keep-alive settings to prevent aggressive TCP teardowns during traffic surges.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-surface-card border border-border-hairline flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-primary">
                  auth-session / 504 timeouts
                </span>
                <span className="font-mono text-[11px] text-secondary">INC-3210</span>
              </div>
              <p className="text-xs text-secondary leading-relaxed">
                Resolved via cache warming script and temporary bypass of stale token verification.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
