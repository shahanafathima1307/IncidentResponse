export type Severity = 'SEV1' | 'SEV2' | 'SEV3';
export type IncidentStatus = 'open' | 'resolved';
export type OutcomeType = 'worked' | 'failed' | 'worked_with_changes';

export interface RemediationStep {
  title: string;
  command: string;
  type?: 'diagnostic' | 'mitigation' | 'check' | 'test' | 'verified';
}

export interface Incident {
  id: string;
  date: string;
  service: string;
  severity: Severity;
  alert: string;
  rule?: string;
  logs: string;
  environment: string;
  recent_deploy: string | null;
  commit?: string;
  region?: string;
  cluster?: string;
  customer_impact?: string;
  status: IncidentStatus;
  top_memory_match?: string | null;
  match_percentage?: number | null;
  commander?: string;
  slack_channel?: string;
  metric_5xx_rate?: {
    max_label: string;
    points: number[];
  };
}

export interface Recommendation {
  root_cause: string;
  steps: RemediationStep[];
  cited_incident_ids: string[];
  risk_note: string | null;
  confidence: 'high' | 'medium' | 'low';
  confidence_score_label: string;
  has_history: boolean;
  triage_mode?: 'memory' | 'first_principles';
}

export interface BaselineRecommendation {
  root_cause: string;
  steps: RemediationStep[];
  unverified_note?: string;
}

export interface SimilarIncident {
  id: string;
  date: string;
  service: string;
  root_cause: string;
  resolution_summary: string;
  outcome: OutcomeType;
  changes_made: string | null;
  failure_note?: string | null;
  ttr_minutes: number;
  similarity: number;
  headline?: string;
}

export interface DocumentItem {
  id: string;
  title: string;
  excerpt: string;
  body: string;
  used_in_count: number;
}

export interface IncidentDetailResponse {
  incident: Incident;
  recommendation: Recommendation;
  baseline_recommendation: BaselineRecommendation;
  similar_incidents: SimilarIncident[];
  documents: DocumentItem[];
}

export interface OutcomeSubmission {
  outcome: OutcomeType;
  changes_made: string | null;
  actual_root_cause: string | null;
  notes: string | null;
  ttr_minutes: number | null;
}

export interface OutcomeResponse {
  stored: boolean;
  memory_summary: string;
  incidents_in_memory: number;
}

export interface MemoryStats {
  incidents_in_memory: number;
}
