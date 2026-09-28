import {
  Incident,
  IncidentDetailResponse,
  OutcomeSubmission,
  OutcomeResponse,
  MemoryStats,
} from './types';
import { MOCK_INCIDENTS, MOCK_INCIDENT_DETAILS, MOCK_DOCUMENTS } from './mockData';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const USE_MOCKS = import.meta.env.VITE_USE_MOCKS !== 'false';

const STORAGE_KEY_OUTCOMES = 'oncall_memory_outcomes_v2';
const STORAGE_KEY_STATS = 'oncall_memory_stats_v2';

function getStoredOutcomes(): Record<string, { submission: OutcomeSubmission; response: OutcomeResponse }> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_OUTCOMES);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveStoredOutcome(id: string, submission: OutcomeSubmission, response: OutcomeResponse) {
  try {
    const data = getStoredOutcomes();
    data[id] = { submission, response };
    localStorage.setItem(STORAGE_KEY_OUTCOMES, JSON.stringify(data));
  } catch (err) {
    console.error('Failed to save to localStorage:', err);
  }
}

function getStoredStatsCount(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_STATS);
    if (raw) return parseInt(raw, 10);
  } catch {}
  return 38; // Default matching exact screenshot state
}

function incrementStoredStatsCount(): number {
  const next = getStoredStatsCount() + 1;
  try {
    localStorage.setItem(STORAGE_KEY_STATS, next.toString());
  } catch {}
  return next;
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const api = {
  isMockMode(): boolean {
    return USE_MOCKS;
  },

  async getIncidents(): Promise<Incident[]> {
    if (USE_MOCKS) {
      await delay(120);
      return [...MOCK_INCIDENTS];
    }

    const res = await fetch(`${API_BASE_URL}/api/incidents`);
    if (!res.ok) {
      throw new Error(`Failed to fetch incidents: ${res.status} ${res.statusText}`);
    }
    return res.json();
  },

  async getIncident(id: string): Promise<IncidentDetailResponse> {
    if (USE_MOCKS) {
      await delay(150);
      if (MOCK_INCIDENT_DETAILS[id]) {
        return JSON.parse(JSON.stringify(MOCK_INCIDENT_DETAILS[id]));
      }

      // Fallback for other items in queue
      const inc = MOCK_INCIDENTS.find((i) => i.id === id) || MOCK_INCIDENTS[0];
      return {
        incident: inc,
        recommendation: {
          root_cause: `Heuristic resolution synthesized for ${inc.service} based on alert telemetry.`,
          confidence: 'medium',
          confidence_score_label: 'Confidence: Medium (78% match)',
          has_history: Boolean(inc.top_memory_match),
          cited_incident_ids: inc.top_memory_match ? [inc.top_memory_match] : [],
          risk_note: 'Ensure client traffic is redirected before executing restarts.',
          steps: [
            {
              title: `Inspect ${inc.service} health status:`,
              command: `kubectl describe deployment/${inc.service} -n prod`,
              type: 'diagnostic'
            },
            {
              title: 'Validate telemetry thresholds against baseline:',
              command: `curl -s http://monitoring.internal/metrics?service=${inc.service}`,
              type: 'check'
            },
            {
              title: 'Perform rolling restart of affected service pod group:',
              command: `kubectl rollout restart deployment/${inc.service} --max-unavailable=1`,
              type: 'mitigation'
            }
          ]
        },
        baseline_recommendation: {
          root_cause: `Standard failure mode detected on ${inc.service}.`,
          steps: [
            {
              title: 'Check container logs:',
              command: `kubectl logs -l app=${inc.service} --tail=100`
            }
          ]
        },
        similar_incidents: inc.top_memory_match
          ? [
              {
                id: inc.top_memory_match,
                date: '3 weeks ago',
                service: inc.service,
                root_cause: 'Resource saturation following peak load burst.',
                resolution_summary: 'Scaled replica count and flushed buffer queue.',
                outcome: 'worked',
                changes_made: null,
                ttr_minutes: 22,
                similarity: (inc.match_percentage || 80) / 100
              }
            ]
          : [],
        documents: [MOCK_DOCUMENTS[0]]
      };
    }

    const res = await fetch(`${API_BASE_URL}/api/incidents/${id}`);
    if (!res.ok) {
      throw new Error(`Failed to fetch incident ${id}: ${res.status} ${res.statusText}`);
    }
    return res.json();
  },

  async submitOutcome(id: string, payload: OutcomeSubmission): Promise<OutcomeResponse> {
    if (USE_MOCKS) {
      await delay(250);
      const newTotal = incrementStoredStatsCount();
      let memorySummary = '';

      if (payload.outcome === 'worked') {
        const notesSnippet = payload.notes ? ` Notes: "${payload.notes}"` : '';
        memorySummary = `Fix verified successful for ${id}.${notesSnippet} Stored under institutional remediation index.`;
      } else if (payload.outcome === 'worked_with_changes') {
        memorySummary = `Fix succeeded with modifications for ${id} (TTR: ${payload.ttr_minutes || 0}m). Engineer note: "${payload.changes_made}". Updated runbook priority.`;
      } else {
        memorySummary = `Fix failed for ${id} (TTR: ${payload.ttr_minutes || 0}m). Reported root cause: "${payload.actual_root_cause}". Negative outcome logged to prevent recurrence.`;
      }

      const response: OutcomeResponse = {
        stored: true,
        memory_summary: memorySummary,
        incidents_in_memory: newTotal,
      };

      saveStoredOutcome(id, payload, response);
      return response;
    }

    const res = await fetch(`${API_BASE_URL}/api/incidents/${id}/outcome`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error(`Failed to submit outcome: ${res.status} ${res.statusText}`);
    }

    return res.json();
  },

  async getMemoryStats(): Promise<MemoryStats> {
    if (USE_MOCKS) {
      await delay(80);
      return { incidents_in_memory: getStoredStatsCount() };
    }

    const res = await fetch(`${API_BASE_URL}/api/memory/stats`);
    if (!res.ok) {
      throw new Error(`Failed to fetch memory stats: ${res.status} ${res.statusText}`);
    }
    return res.json();
  },

  getExistingSubmission(id: string) {
    const stored = getStoredOutcomes();
    return stored[id] || null;
  }
};
