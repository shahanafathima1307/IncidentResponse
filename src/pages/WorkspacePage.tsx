import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Copy,
  Check,
  AlertTriangle,
  Play,
  Share2,
  MessageSquare,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Layers,
  Terminal,
  Clock
} from 'lucide-react';
import { IncidentDetailResponse, DocumentItem } from '../types';
import { SeverityBadge, StatusBadge, OutcomeBadge } from '../components/Badge';
import { LogViewer } from '../components/LogViewer';
import { Sparkline } from '../components/Sparkline';
import { OutcomeBar } from '../components/OutcomeBar';
import { DocDrawer } from '../components/DocDrawer';
import { formatRelativeTime } from '../utils/time';
import { api } from '../api';

interface WorkspacePageProps {
  onMemoryUpdate?: (count: number) => void;
}

export const WorkspacePage: React.FC<WorkspacePageProps> = ({ onMemoryUpdate }) => {
  const { id = 'INC-2087' } = useParams<{ id: string }>();
  const [data, setData] = useState<IncidentDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Memory Toggle (on / off)
  const [memoryEnabled, setMemoryEnabled] = useState(true);

  // Right column active tab ('past' | 'docs')
  const [activeTab, setActiveTab] = useState<'past' | 'docs'>('past');

  // Selected doc for drawer
  const [selectedDoc, setSelectedDoc] = useState<DocumentItem | null>(null);

  // Expanded past incident IDs
  const [expandedPastIds, setExpandedPastIds] = useState<Set<string>>(new Set(['INC-2041']));

  // Copy indicators
  const [copiedStepIndex, setCopiedStepIndex] = useState<number | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Highlighted past incident when user clicks a "Based on" reference
  const [highlightedPastId, setHighlightedPastId] = useState<string | null>(null);

  const fetchDetail = async (incidentId: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getIncident(incidentId);
      setData(res);
    } catch (err: any) {
      setError(err?.message || `Unable to load incident ${incidentId}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail(id);
  }, [id]);

  const handleCopyStep = (command: string, index: number) => {
    navigator.clipboard.writeText(command);
    setCopiedStepIndex(index);
    setTimeout(() => setCopiedStepIndex(null), 1800);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 1800);
  };

  const togglePastExpand = (pastId: string) => {
    setExpandedPastIds((prev) => {
      const next = new Set(prev);
      if (next.has(pastId)) {
        next.delete(pastId);
      } else {
        next.add(pastId);
      }
      return next;
    });
  };

  if (loading) {
    return (
      <div className="p-5 lg:p-7 max-w-7xl mx-auto space-y-5 font-jetbrains animate-pulse">
        <div className="h-10 w-96 bg-[var(--bg-hover)] rounded-[4px]" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-4 h-[480px] bg-[var(--bg-hover)] rounded-[5px]" />
          <div className="lg:col-span-5 h-[480px] bg-[var(--bg-hover)] rounded-[5px]" />
          <div className="lg:col-span-3 h-[480px] bg-[var(--bg-hover)] rounded-[5px]" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 max-w-xl mx-auto space-y-4 font-jetbrains">
        <div className="p-6 rounded-[5px] border border-[var(--sem-red-border)] bg-[var(--sem-red-bg)] text-[13px] text-[var(--sem-red)] space-y-3">
          <div className="flex items-center gap-2 font-bold text-[15px]">
            <AlertTriangle size={18} />
            <span>Incident Not Found</span>
          </div>
          <p className="text-[var(--text-primary)]">
            {error || 'Unable to retrieve incident details.'}
          </p>
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={() => fetchDetail(id)}
              className="px-3 py-1.5 rounded-[4px] border border-[var(--sem-red)] bg-white text-[12px] font-bold hover:bg-[var(--bg-hover)] transition-colors"
            >
              Retry
            </button>
            <Link to="/" className="text-[12px] text-[var(--text-muted)] underline hover:text-[var(--text-primary)]">
              Back to queue
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { incident, recommendation, baseline_recommendation, similar_incidents, documents } = data;
  const activeRec = memoryEnabled ? recommendation : baseline_recommendation;

  return (
    <div className="min-h-[calc(100vh-56px)] flex flex-col justify-between font-jetbrains text-[14px]">
      <div className="p-5 lg:p-7 max-w-7xl mx-auto w-full space-y-5 pb-28">
        {/* Authoritative Header Bar */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border-hairline)] rounded-[5px] p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          {/* Left: Breadcrumbs & Incident Metadata */}
          <div className="flex items-center gap-2.5 flex-wrap text-[13px]">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors font-medium"
            >
              <ArrowLeft size={14} />
              <span>Queue</span>
            </Link>
            <span className="text-[var(--border-hover)]">/</span>
            <span className="text-[15px] font-bold text-[var(--text-primary)] tracking-tight">
              {incident.id}
            </span>
            <SeverityBadge severity={incident.severity} />
            <span className="px-2 py-0.5 rounded-[3px] bg-[var(--bg-subtle)] border border-[var(--border-hairline)] text-[12px] font-medium text-[var(--text-primary)]">
              {incident.service}
            </span>
            <StatusBadge status={incident.status} />
            <span className="text-[12px] text-[var(--text-muted)] tabular-nums">
              Opened {formatRelativeTime(incident.date)}
            </span>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 flex-wrap text-[12px]">
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[4px] border border-[var(--border-hairline)] bg-[var(--bg-surface)] hover:bg-[var(--bg-subtle)] text-[12px] font-medium text-[var(--text-primary)] transition-colors shadow-2xs"
            >
              {copiedLink ? <Check size={13} className="text-[var(--sem-green)]" /> : <Share2 size={13} />}
              <span>{copiedLink ? 'Copied' : 'Share'}</span>
            </button>

            {incident.slack_channel && (
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[4px] border border-[var(--border-hairline)] bg-[var(--bg-subtle)] text-[12px] text-[var(--text-muted)]">
                <MessageSquare size={13} />
                <span>{incident.slack_channel}</span>
              </div>
            )}
          </div>
        </div>

        {/* 3-Column Diagnostic Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* ========================================================= */}
          {/* COLUMN 1: INCIDENT SIGNAL (Left 4 cols) */}
          {/* ========================================================= */}
          <section className="lg:col-span-4 space-y-4">
            <div className="rounded-[5px] border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-4 space-y-3.5 shadow-2xs">
              <div className="flex items-center justify-between border-b border-[var(--border-hairline)] pb-2.5">
                <h2 className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-dim)]">
                  Incident Signal
                </h2>
                <span className="text-[12px] text-[var(--text-dim)]">
                  {incident.environment}
                </span>
              </div>

              {/* Alert text callout */}
              <div className="p-3 rounded-[4px] border border-[var(--sem-red-border)] bg-[var(--sem-red-bg)] space-y-1">
                <div className="text-[13px] font-bold text-[var(--sem-red)] leading-snug">
                  {incident.alert}
                </div>
                {incident.customer_impact && (
                  <div className="text-[12px] text-[var(--text-muted)] pt-0.5">
                    Impact: <strong className="text-[var(--text-primary)]">{incident.customer_impact}</strong>
                  </div>
                )}
              </div>

              {/* Sparkline Rate Chart */}
              <Sparkline
                label="5XX RATE (LAST 30M)"
                value={incident.metric_5xx_rate?.max_label || '12.4% max'}
                points={incident.metric_5xx_rate?.points}
                thresholdLabel="SLO 1.0%"
              />

              {/* Monospace Log Excerpt */}
              <div className="space-y-1.5">
                <div className="text-[12px] font-semibold text-[var(--text-muted)]">
                  Log Excerpt
                </div>
                <LogViewer logs={incident.logs} title={`${incident.service} stderr`} />
              </div>

              {/* Metadata Details List */}
              <div className="pt-2 border-t border-[var(--border-hairline)] space-y-2 text-[12px]">
                <div className="flex items-center justify-between">
                  <span className="text-[var(--text-muted)]">Service</span>
                  <span className="font-semibold text-[var(--text-primary)]">{incident.service}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[var(--text-muted)]">Environment</span>
                  <span className="text-[var(--text-primary)]">{incident.environment}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[var(--text-muted)]">Recent deploy</span>
                  <span className="text-[var(--text-primary)] font-medium">
                    {incident.recent_deploy || 'None recorded'}
                  </span>
                </div>

                {incident.commit && (
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--text-muted)]">Commit hash</span>
                    <span className="text-[var(--accent)] font-bold">
                      {incident.commit}
                    </span>
                  </div>
                )}

                {incident.region && (
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--text-muted)]">Region</span>
                    <span className="text-[var(--text-primary)]">
                      {incident.region}
                    </span>
                  </div>
                )}

                {incident.cluster && (
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--text-muted)]">Cluster</span>
                    <span className="text-[var(--text-primary)]">
                      {incident.cluster}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* ========================================================= */}
          {/* COLUMN 2: RECOMMENDED FIX (Center 5 cols) */}
          {/* ========================================================= */}
          <section className="lg:col-span-5 space-y-4">
            <div className="rounded-[5px] border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-4.5 space-y-4.5 shadow-2xs">
              {/* Header with Memory Toggle */}
              <div className="flex items-center justify-between border-b border-[var(--border-hairline)] pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-[var(--primary)]" />
                  <h2 className="text-[15px] font-bold text-[var(--text-primary)]">
                    Recommended Fix
                  </h2>
                </div>

                {/* Memory on / off toggle */}
                <div className="flex items-center gap-2">
                  <span className="text-[12px] text-[var(--text-muted)]">Memory</span>
                  <button
                    type="button"
                    onClick={() => setMemoryEnabled(!memoryEnabled)}
                    className={`px-2.5 py-1 rounded-[3px] border text-[11px] font-medium transition-colors flex items-center gap-1.5 ${
                      memoryEnabled
                        ? 'border-[var(--primary)] bg-[var(--accent-subtle)] text-[var(--primary)] font-bold shadow-2xs'
                        : 'border-[var(--border-hairline)] bg-[var(--bg-subtle)] text-[var(--text-muted)]'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        memoryEnabled ? 'bg-[var(--primary)]' : 'bg-[var(--text-dim)]'
                      }`}
                    />
                    <span>{memoryEnabled ? 'ON' : 'OFF'}</span>
                  </button>
                </div>
              </div>

              {/* Confidence Score Pill */}
              {memoryEnabled && recommendation.confidence_score_label && (
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-[3px] bg-[var(--bg-subtle)] border border-[var(--border-hairline)] text-[12px]">
                  <span className="w-2 h-2 rounded-full bg-[var(--sem-green)]" />
                  <span className="font-semibold text-[var(--text-primary)]">
                    {recommendation.confidence_score_label}
                  </span>
                </div>
              )}

              {/* Probable Root Cause Box */}
              <div className="space-y-2">
                <div className="text-[11px] font-bold text-[var(--text-dim)] uppercase tracking-wider">
                  Probable Root Cause
                </div>
                <p className="text-[14px] font-medium text-[var(--text-primary)] leading-relaxed">
                  {activeRec.root_cause}
                </p>

                {/* "Based on" line linking to past incidents */}
                {memoryEnabled && recommendation.cited_incident_ids.length > 0 ? (
                  <div className="pt-1.5 text-[12px] text-[var(--text-muted)] flex items-center gap-1.5 flex-wrap">
                    <span>Based on:</span>
                    {recommendation.cited_incident_ids.map((cid) => (
                      <button
                        key={cid}
                        onClick={() => {
                          setActiveTab('past');
                          setHighlightedPastId(cid);
                          setExpandedPastIds((prev) => new Set(prev).add(cid));
                        }}
                        className="font-bold text-[var(--accent)] hover:underline inline-flex items-center gap-1"
                      >
                        <span>{cid}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  !memoryEnabled && (
                    <div className="pt-1 text-[12px] text-[var(--text-dim)] italic">
                      Showing generic baseline recommendation without historical memory.
                    </div>
                  )
                )}
              </div>

              {/* Risk warning note */}
              {memoryEnabled && recommendation.risk_note && (
                <div className="p-3 rounded-[4px] border border-[var(--border-hairline)] bg-[var(--bg-subtle)] text-[13px] text-[var(--text-primary)] flex items-start gap-2.5">
                  <AlertTriangle size={16} className="text-[var(--sem-amber)] shrink-0 mt-0.5" />
                  <div className="leading-relaxed">
                    <span className="font-bold">Precautionary constraint: </span>
                    <span>{recommendation.risk_note}</span>
                  </div>
                </div>
              )}

              {/* Numbered Remediation Steps Sequence */}
              <div className="space-y-3 pt-1">
                <div className="text-[11px] font-bold text-[var(--text-dim)] uppercase tracking-wider">
                  Remediation Steps ({activeRec.steps.length})
                </div>

                <div className="space-y-2.5">
                  {activeRec.steps.map((step, idx) => {
                    const isCopied = copiedStepIndex === idx;

                    return (
                      <div
                        key={idx}
                        className="rounded-[4px] border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-3 space-y-2"
                      >
                        <div className="flex items-start gap-2.5">
                          <span className="w-5 h-5 rounded-[3px] bg-[var(--bg-subtle)] border border-[var(--border-hairline)] text-[12px] font-bold text-[var(--text-muted)] flex items-center justify-center shrink-0 select-none">
                            {idx + 1}
                          </span>
                          <span className="text-[13px] font-medium text-[var(--text-primary)] pt-0.5">
                            {step.title}
                          </span>
                        </div>

                        {/* Copyable Command Snippet */}
                        <div className="pl-7">
                          <div className="flex items-center justify-between p-2 rounded-[3px] bg-[var(--bg-subtle)] border border-[var(--border-hairline)] text-[12px] text-[var(--text-primary)] group">
                            <span className="truncate select-text pr-2 leading-relaxed text-[12px]">
                              {step.command}
                            </span>
                            <button
                              onClick={() => handleCopyStep(step.command, idx)}
                              className="p-1 rounded hover:bg-[var(--bg-hover)] text-[var(--text-dim)] group-hover:text-[var(--text-primary)] transition-colors shrink-0"
                              title="Copy command"
                            >
                              {isCopied ? (
                                <Check size={13} className="text-[var(--sem-green)]" />
                              ) : (
                                <Copy size={13} />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Primary Action Button */}
              <div className="pt-2 border-t border-[var(--border-hairline)] flex items-center gap-3">
                {activeRec.steps && activeRec.steps.length > 0 && (
                  <button
                    onClick={() => handleCopyStep(activeRec.steps[0].command, 0)}
                    className="px-4 py-2 rounded-[4px] bg-[var(--primary)] text-white text-[13px] font-bold hover:bg-[var(--accent-hover)] transition-colors flex items-center gap-1.5 shadow-2xs"
                  >
                    <Play size={14} />
                    <span>Execute Step 1</span>
                  </button>
                )}

                {documents.length > 0 && (
                  <button
                    onClick={() => setSelectedDoc(documents[0])}
                    className="px-3.5 py-2 rounded-[4px] border border-[var(--border-hairline)] bg-[var(--bg-surface)] hover:bg-[var(--bg-subtle)] text-[var(--text-primary)] text-[13px] font-medium transition-colors flex items-center gap-1.5"
                  >
                    <BookOpen size={14} />
                    <span>Open Runbook</span>
                  </button>
                )}
              </div>
            </div>
          </section>

          {/* ========================================================= */}
          {/* COLUMN 3: PAST INCIDENTS & DOCUMENTATION (Right 3 cols) */}
          {/* ========================================================= */}
          <section className="lg:col-span-3 space-y-4">
            <div className="rounded-[5px] border border-[var(--border-hairline)] bg-[var(--bg-surface)] overflow-hidden shadow-2xs">
              {/* Tabs */}
              <div className="flex border-b border-[var(--border-hairline)] bg-[var(--bg-subtle)] text-[13px] font-medium">
                <button
                  onClick={() => setActiveTab('past')}
                  className={`flex-1 py-2.5 px-3 text-center transition-colors flex items-center justify-center gap-1.5 ${
                    activeTab === 'past'
                      ? 'bg-[var(--bg-surface)] border-b-2 border-[var(--primary)] text-[var(--primary)] font-bold'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <span>Past incidents</span>
                  <span className="text-[11px] px-1.5 py-0.2 rounded bg-[var(--bg-subtle)] border border-[var(--border-hairline)] text-[var(--text-muted)] font-bold">
                    {similar_incidents.length}
                  </span>
                </button>

                <button
                  onClick={() => setActiveTab('docs')}
                  className={`flex-1 py-2.5 px-3 text-center transition-colors flex items-center justify-center gap-1.5 ${
                    activeTab === 'docs'
                      ? 'bg-[var(--bg-surface)] border-b-2 border-[var(--primary)] text-[var(--primary)] font-bold'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <span>Runbooks</span>
                  <span className="text-[11px] px-1.5 py-0.2 rounded bg-[var(--bg-subtle)] border border-[var(--border-hairline)] text-[var(--text-muted)] font-bold">
                    {documents.length}
                  </span>
                </button>
              </div>

              {/* Tab Content */}
              <div className="p-3.5 space-y-3 max-h-[640px] overflow-y-auto text-[13px]">
                {/* Past Incidents Tab */}
                {activeTab === 'past' && (
                  <div className="space-y-3">
                    {similar_incidents.length === 0 ? (
                      <div className="py-8 text-center text-[var(--text-muted)] space-y-1">
                        <p className="text-[13px] font-bold text-[var(--text-primary)]">
                          No similar incidents found
                        </p>
                        <p className="text-[12px] text-[var(--text-dim)]">
                          This will be indexed as the first precedent in memory.
                        </p>
                      </div>
                    ) : (
                      similar_incidents.map((past) => {
                        const isExpanded = expandedPastIds.has(past.id);
                        const isHighlighted = highlightedPastId === past.id;
                        const isFailed = past.outcome === 'failed';
                        const similarityPct = Math.round(past.similarity * 100);

                        return (
                          <div
                            key={past.id}
                            className={`rounded-[4px] border transition-all ${
                              isHighlighted
                                ? 'border-[var(--primary)] ring-1 ring-[var(--primary)] bg-[var(--accent-subtle)]/30'
                                : isFailed
                                ? 'border-[var(--sem-red-border)] bg-[var(--sem-red-bg)]/30'
                                : 'border-[var(--border-hairline)] bg-[var(--bg-surface)]'
                            } p-3 space-y-2`}
                          >
                            {/* Card Header */}
                            <div className="flex items-center justify-between gap-1 flex-wrap">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-[var(--text-primary)] text-[13px]">
                                  {past.id}
                                </span>
                                <span className="text-[var(--text-dim)] text-[12px]">·</span>
                                <span className="text-[12px] text-[var(--text-dim)]">{past.date}</span>
                              </div>

                              <div className="flex items-center gap-1.5">
                                <span className="text-[12px] text-[var(--text-dim)] tabular-nums font-semibold">
                                  {similarityPct}% match
                                </span>
                                <OutcomeBadge outcome={past.outcome} />
                              </div>
                            </div>

                            {/* Service & TTR */}
                            <div className="text-[12px] text-[var(--text-muted)] flex items-center justify-between">
                              <span>Service: <strong className="text-[var(--text-primary)]">{past.service}</strong></span>
                              <span className="text-[var(--text-dim)] font-medium">
                                TTR: {past.ttr_minutes}m
                              </span>
                            </div>

                            {/* Root Cause */}
                            <div className="pt-0.5">
                              <span className="text-[11px] uppercase font-bold text-[var(--text-dim)] tracking-wider block">
                                Root Cause
                              </span>
                              <p className="text-[13px] text-[var(--text-primary)] leading-snug">
                                {past.root_cause}
                              </p>
                            </div>

                            {/* Resolution Summary */}
                            <div>
                              <span className="text-[11px] uppercase font-bold text-[var(--text-dim)] tracking-wider block">
                                Resolution
                              </span>
                              <p className="text-[13px] text-[var(--text-muted)] leading-snug">
                                {past.resolution_summary}
                              </p>
                            </div>

                            {/* Failed fix warning callout */}
                            {past.failure_note && (
                              <div className="p-2.5 rounded-[3px] border border-[var(--sem-red-border)] bg-[var(--sem-red-bg)] text-[12px] text-[var(--sem-red)] space-y-1">
                                <div className="font-bold flex items-center gap-1">
                                  <AlertTriangle size={14} />
                                  <span>What did NOT work:</span>
                                </div>
                                <p className="leading-relaxed">{past.failure_note}</p>
                              </div>
                            )}

                            {/* Expandable toggle */}
                            <div className="pt-1 border-t border-[var(--border-hairline)] flex justify-end">
                              <button
                                onClick={() => togglePastExpand(past.id)}
                                className="inline-flex items-center gap-1 text-[12px] font-medium text-[var(--accent)] hover:underline"
                              >
                                <span>{isExpanded ? 'Hide details' : 'View full details'}</span>
                                {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                              </button>
                            </div>

                            {/* Expanded Section */}
                            {isExpanded && (
                              <div className="pt-2 border-t border-[var(--border-hairline)] space-y-2 text-[12px]">
                                <div>
                                  <span className="text-[11px] text-[var(--text-dim)] uppercase font-bold">
                                    Remediation applied:
                                  </span>
                                  <p className="text-[12px] text-[var(--text-primary)] leading-relaxed pt-0.5">
                                    {past.resolution_summary}
                                  </p>
                                </div>
                                <div className="p-2 rounded bg-[var(--bg-subtle)] text-[12px] text-[var(--text-muted)]">
                                  Similarity vector: 0.{similarityPct} (semantic cluster)
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}

                {/* Documentation Tab */}
                {activeTab === 'docs' && (
                  <div className="space-y-3">
                    {documents.map((doc) => (
                      <div
                        key={doc.id}
                        onClick={() => setSelectedDoc(doc)}
                        className="p-3 rounded-[4px] border border-[var(--border-hairline)] bg-[var(--bg-surface)] hover:bg-[var(--bg-subtle)] cursor-pointer transition-colors space-y-1.5 shadow-2xs"
                      >
                        <div className="flex items-center justify-between text-[12px]">
                          <span className="font-bold text-[var(--accent)]">
                            {doc.id}
                          </span>
                          <span className="text-[11px] text-[var(--text-dim)]">
                            Used in {doc.used_in_count} incidents
                          </span>
                        </div>
                        <h4 className="text-[13px] font-bold text-[var(--text-primary)]">
                          {doc.title}
                        </h4>
                        <p className="text-[12px] text-[var(--text-muted)] line-clamp-2 leading-relaxed">
                          {doc.excerpt}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Sticky Bottom Outcome Bar */}
      <OutcomeBar
        incidentId={incident.id}
        onOutcomeStored={(newTotal) => {
          if (onMemoryUpdate) onMemoryUpdate(newTotal);
        }}
      />

      {/* Slide-out Runbook Documentation Drawer */}
      <DocDrawer document={selectedDoc} onClose={() => setSelectedDoc(null)} />
    </div>
  );
};
