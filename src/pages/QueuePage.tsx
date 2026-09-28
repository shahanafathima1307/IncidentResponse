import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronDown,
  Download,
  Search,
  RotateCw,
  AlertTriangle,
  Inbox,
  Activity,
  Layers,
  Sparkles
} from 'lucide-react';
import { Incident } from '../types';
import { SeverityBadge, StatusBadge, MemoryMatchTag } from '../components/Badge';
import { formatRelativeTime } from '../utils/time';
import { api } from '../api';

export const QueuePage: React.FC = () => {
  const navigate = useNavigate();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'resolved'>('all');
  const [serviceFilter, setServiceFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchIncidents = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getIncidents();
      setIncidents(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load incident queue.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, []);

  const availableServices = useMemo(() => {
    const set = new Set<string>();
    incidents.forEach((i) => set.add(i.service));
    return Array.from(set).sort();
  }, [incidents]);

  const openCount = useMemo(() => incidents.filter((i) => i.status === 'open').length, [incidents]);
  const resolvedCount = useMemo(() => incidents.filter((i) => i.status === 'resolved').length, [incidents]);

  const filteredIncidents = useMemo(() => {
    return incidents.filter((item) => {
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;
      if (serviceFilter !== 'all' && item.service !== serviceFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesId = item.id.toLowerCase().includes(q);
        const matchesAlert = item.alert.toLowerCase().includes(q);
        const matchesService = item.service.toLowerCase().includes(q);
        if (!matchesId && !matchesAlert && !matchesService) return false;
      }
      return true;
    });
  }, [incidents, statusFilter, serviceFilter, searchQuery]);

  const handleExportCSV = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      ['id,severity,service,alert,opened,status,memory_match']
        .concat(
          filteredIncidents.map(
            (i) =>
              `${i.id},${i.severity},${i.service},"${i.alert.replace(/"/g, '""')}",${i.date},${i.status},${i.top_memory_match || 'No history'}`
          )
        )
        .join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `oncall_incidents_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-5 lg:p-7 max-w-7xl mx-auto space-y-5 font-jetbrains text-[14px]">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[19px] font-bold tracking-tight text-[var(--text-primary)]">
            Incident Queue
          </h1>
          <p className="text-[12px] text-[var(--text-muted)] mt-0.5">
            Active and historical alerts correlated against institutional remediation memory
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchIncidents}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium rounded-[4px] border border-[var(--border-hairline)] bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] transition-colors shadow-2xs"
            title="Refresh incidents"
          >
            <RotateCw size={13} className={loading ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium rounded-[4px] border border-[var(--border-hairline)] bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] transition-colors shadow-2xs"
          >
            <Download size={13} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-dim)] pointer-events-none"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter by ID, alert, or service..."
            className="w-full pl-9 pr-3 py-1.5 text-[13px] rounded-[4px] border border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[var(--text-primary)] placeholder-[var(--text-dim)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] font-jetbrains"
          />
        </div>

        {/* Filters Group */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Status Segmented Tabs */}
          <div className="inline-flex rounded-[4px] border border-[var(--border-hairline)] bg-[var(--bg-subtle)] p-0.5 text-[12px]">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 rounded-[3px] font-medium transition-colors ${
                statusFilter === 'all'
                  ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-2xs font-bold'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              All ({incidents.length})
            </button>
            <button
              onClick={() => setStatusFilter('open')}
              className={`px-3 py-1 rounded-[3px] font-medium transition-colors flex items-center gap-1.5 ${
                statusFilter === 'open'
                  ? 'bg-[var(--bg-surface)] text-[var(--sem-red)] shadow-2xs font-bold'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-[var(--sem-red)]" />
              <span>Open ({openCount})</span>
            </button>
            <button
              onClick={() => setStatusFilter('resolved')}
              className={`px-3 py-1 rounded-[3px] font-medium transition-colors ${
                statusFilter === 'resolved'
                  ? 'bg-[var(--bg-surface)] text-[var(--sem-green)] shadow-2xs font-bold'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              Resolved ({resolvedCount})
            </button>
          </div>

          {/* Service Dropdown */}
          <div className="relative">
            <select
              value={serviceFilter}
              onChange={(e) => setServiceFilter(e.target.value)}
              className="appearance-none pl-3 pr-7 py-1.5 text-[12px] rounded-[4px] border border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer focus:outline-none focus:ring-1 focus:ring-[var(--primary)] font-jetbrains"
            >
              <option value="all">All Services ({availableServices.length})</option>
              {availableServices.map((svc) => (
                <option key={svc} value={svc}>
                  {svc}
                </option>
              ))}
            </select>
            <ChevronDown
              size={13}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-dim)] pointer-events-none"
            />
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-3.5 rounded-[4px] border border-[var(--sem-red-border)] bg-[var(--sem-red-bg)] text-[13px] text-[var(--sem-red)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} />
            <span>{error}</span>
          </div>
          <button
            onClick={fetchIncidents}
            className="px-3 py-1 rounded-[3px] border border-[var(--sem-red)] bg-white text-[12px] font-bold hover:bg-[var(--bg-hover)] transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Dense, High-Density Data Table */}
      <div className="border border-[var(--border-hairline)] rounded-[5px] bg-[var(--bg-surface)] overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[13px] font-jetbrains">
            <thead>
              <tr className="border-b border-[var(--border-hairline)] bg-[var(--bg-subtle)] text-[var(--text-muted)] text-[11px] font-bold uppercase tracking-wider">
                <th className="py-2.5 px-3.5 w-20">Severity</th>
                <th className="py-2.5 px-3.5 w-44">Service</th>
                <th className="py-2.5 px-3.5">Alert Summary</th>
                <th className="py-2.5 px-3.5 w-36">Opened</th>
                <th className="py-2.5 px-3.5 w-28">Status</th>
                <th className="py-2.5 px-3.5 w-52">Memory Match</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-hairline)]">
              {loading ? (
                Array.from({ length: 7 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse h-11">
                    <td className="py-2.5 px-3.5">
                      <div className="h-4 w-12 bg-[var(--bg-hover)] rounded-[2px]" />
                    </td>
                    <td className="py-2.5 px-3.5">
                      <div className="h-4 w-28 bg-[var(--bg-hover)] rounded-[2px]" />
                    </td>
                    <td className="py-2.5 px-3.5">
                      <div className="h-4 w-3/4 bg-[var(--bg-hover)] rounded-[2px]" />
                    </td>
                    <td className="py-2.5 px-3.5">
                      <div className="h-4 w-16 bg-[var(--bg-hover)] rounded-[2px]" />
                    </td>
                    <td className="py-2.5 px-3.5">
                      <div className="h-4 w-16 bg-[var(--bg-hover)] rounded-[2px]" />
                    </td>
                    <td className="py-2.5 px-3.5">
                      <div className="h-4 w-24 bg-[var(--bg-hover)] rounded-[2px]" />
                    </td>
                  </tr>
                ))
              ) : filteredIncidents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-14 text-center text-[var(--text-muted)]">
                    <div className="max-w-sm mx-auto space-y-2">
                      <div className="w-9 h-9 mx-auto rounded-full bg-[var(--bg-subtle)] border border-[var(--border-hairline)] flex items-center justify-center text-[var(--text-dim)]">
                        <Inbox size={18} />
                      </div>
                      <p className="text-[14px] font-bold text-[var(--text-primary)]">
                        No incidents match your filters
                      </p>
                      <p className="text-[12px] text-[var(--text-dim)]">
                        Try resetting your search query or switching to All status.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredIncidents.map((incident) => (
                  <tr
                    key={incident.id}
                    onClick={() => navigate(`/incidents/${incident.id}`)}
                    className="group cursor-pointer hover:bg-[var(--bg-subtle)] transition-colors h-11"
                  >
                    {/* Severity */}
                    <td className="py-2.5 px-3.5 whitespace-nowrap">
                      <SeverityBadge severity={incident.severity} />
                    </td>

                    {/* Service */}
                    <td className="py-2.5 px-3.5 whitespace-nowrap font-medium text-[var(--text-primary)]">
                      {incident.service}
                    </td>

                    {/* Alert Summary */}
                    <td className="py-2.5 px-3.5 max-w-md lg:max-w-xl truncate text-[var(--text-primary)]">
                      <div className="flex items-center gap-2 truncate">
                        <span className="font-medium text-[13px] truncate" title={incident.alert}>
                          {incident.alert}
                        </span>
                        {incident.customer_impact && (
                          <span className="hidden lg:inline text-[11px] text-[var(--text-dim)] shrink-0">
                            [{incident.customer_impact}]
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Opened */}
                    <td className="py-2.5 px-3.5 whitespace-nowrap text-[var(--text-muted)] text-[12px] tabular-nums">
                      {formatRelativeTime(incident.date)}
                    </td>

                    {/* Status */}
                    <td className="py-2.5 px-3.5 whitespace-nowrap">
                      <StatusBadge status={incident.status} />
                    </td>

                    {/* Memory Match */}
                    <td className="py-2.5 px-3.5 whitespace-nowrap">
                      <MemoryMatchTag
                        matchId={incident.top_memory_match || null}
                        matchPct={incident.match_percentage}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Dense Footer Bar with Telemetry */}
        <div className="py-2.5 px-3.5 bg-[var(--bg-subtle)] border-t border-[var(--border-hairline)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[12px] text-[var(--text-muted)]">
          <div className="flex items-center gap-3">
            <span>
              Showing <strong className="text-[var(--text-primary)]">{filteredIncidents.length}</strong> of{' '}
              <strong className="text-[var(--text-primary)]">{incidents.length}</strong> alerts
            </span>
            <span className="text-[var(--border-hover)]">|</span>
            <span className="text-[11px] text-[var(--text-dim)] flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--sem-green)]" />
              Memory Engine Online (threshold: &gt;75%)
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[var(--text-dim)] text-[11px]">1 of 1 pages</span>
            <div className="flex items-center gap-1">
              <button
                disabled
                className="px-2 py-0.5 rounded-[3px] border border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[11px] opacity-40 cursor-not-allowed"
              >
                Previous
              </button>
              <button
                disabled
                className="px-2 py-0.5 rounded-[3px] border border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[11px] opacity-40 cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
