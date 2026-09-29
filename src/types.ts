export type Severity = 'SEV1' | 'SEV2' | 'SEV3' | 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type IncidentStatus = 'open' | 'resolved' | 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'CLOSED';
export type OutcomeChoice = 'worked' | 'worked_with_changes' | 'didnt_work' | 'failed';
export type OutcomeType = OutcomeChoice;

export interface RemediationStep {
  title: string;
  command: string;
  type?: 'diagnostic' | 'mitigation' | 'check' | 'test' | 'verified';
}

export interface IncidentRecord {
  id: string;
  title: string;
  description: string;
  affected_service: string;
  severity: Severity;
  status: IncidentStatus;
  created_at: string;
  updated_at: string;
  root_cause?: string | null;
  resolution?: string | null;
  outcome?: string | null;
  resolved_at?: string | null;
}

export interface Incident {
  id: string;
  title?: string;
  description?: string;
  affected_service?: string;
  created_at?: string;
  updated_at?: string;
  root_cause?: string | null;
  resolution?: string | null;
  outcome?: string | null;
  resolved_at?: string | null;
  date: string;
  service: string;
  severity: Severity;
  alert: string;
  rule?: string;
  logs: string;
  environment?: string;
  recent_deploy?: string | null;
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

export interface IncidentListResponse {
  total: number;
  items: IncidentRecord[];
}

export interface MemoryReference {
  reference_id: string;
  incident_id?: string | null;
  summary: string;
  similarity_score?: number | null;
  resolution_notes?: string | null;
}

export interface AnalysisResponse {
  incident_id: string;
  troubleshooting_suggestions: string[];
  potential_causes: string[];
  recommended_actions: string[];
  memory_references: MemoryReference[];
  knowledge_references: any[];
  confidence_score?: number | null;
  analyzed_at: string;
}

export interface ResolutionPayload {
  root_cause: string;
  resolution: string;
  outcome: string;
}

export interface MemoryStatsResponse {
  incidents_in_memory: number;
}
export type MemoryStats = MemoryStatsResponse;

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
