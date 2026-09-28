import { Incident, IncidentDetailResponse, DocumentItem } from './types';

export const MOCK_DOCUMENTS: DocumentItem[] = [
  {
    id: 'DOC-101',
    title: 'Redis Connection Pool & Cluster Failover SOP',
    excerpt: 'Emergency triage for client pool starvation, client timeout cascades, and safe connection draining without pod restarts.',
    body: `# Redis Connection Pool & Cluster Failover SOP
Version: 3.2.0 | Updated: 2026-07-15 | Owner: Infrastructure SRE

## Immediate Diagnostics
When redis pool exhaustion occurs, verify active client connections vs maxclients:
\`\`\`bash
redis-cli -h redis-prod-01.internal info clients
redis-cli -h redis-prod-01.internal client list | grep -v 'cmd=ping' | head -n 30
\`\`\`

## Safe Triage Rules
1. NEVER perform a hard pod restart on redis-server under heavy ingress load. When 100+ application replicas attempt to reconnect simultaneously, Redis encounters CPU starvation during auth handshakes.
2. Terminate idle or orphaned connections from the server side:
\`\`\`bash
redis-cli -h redis-prod-01.internal client kill type normal skipme yes
\`\`\`
3. If an application release introduced unclosed connections (leak), initiate an immediate deployment rollback on the calling service before cycling Redis proxies.
4. Verify connection drop via Prometheus metric: \`redis_connected_clients < 250\`.
`,
    used_in_count: 7,
  },
  {
    id: 'DOC-102',
    title: 'PostgreSQL Production Schema Migration & Emergency Indexing',
    excerpt: 'Zero-downtime indexing guidelines, lock queue inspection via pg_stat_activity, and cancelling blocking queries safely.',
    body: `# PostgreSQL Production Schema Migration & Emergency Indexing
Version: 4.1.0 | Updated: 2026-08-02 | Owner: Database Reliability Team

## Emergency Index Creation
- Plain 'CREATE INDEX' acquires an ACCESS EXCLUSIVE lock on the target table, blocking all concurrent SELECT, INSERT, UPDATE, and DELETE operations.
- ALWAYS specify 'CONCURRENTLY' in production:
\`\`\`sql
CREATE INDEX CONCURRENTLY idx_settlement_batches_account_id
ON settlement_batches(account_id);
\`\`\`

## Resolving Lock Starvation
Check blocking queries in pg_stat_activity:
\`\`\`sql
SELECT pid, now() - query_start AS duration, query, state
FROM pg_stat_activity
WHERE state != 'idle' AND query_start < now() - interval '1 minute'
ORDER BY duration DESC;
\`\`\`
`,
    used_in_count: 12,
  },
  {
    id: 'DOC-103',
    title: 'Hardware Security Module (HSM) Tokenization SOP',
    excerpt: 'Card-vault tokenization latency diagnosis, PKCS#11 driver lifecycle, and dual-region quorum validation.',
    body: `# Hardware Security Module (HSM) Tokenization SOP
Version: 1.9.0 | Updated: 2026-08-10 | Owner: Payments Security Team

## PKCS#11 Driver Verification
\`\`\`bash
kubectl exec -it card-vault-8f9d-1 -- systemctl status pkcs11-daemon
vault-cli cluster peers --verify-quorum
\`\`\`
`,
    used_in_count: 5,
  }
];

export const MOCK_INCIDENTS: Incident[] = [
  {
    id: 'INC-2087',
    date: '2026-09-28T08:49:12Z',
    service: 'payments-api',
    severity: 'SEV2',
    alert: 'ERR_P99_LATENCY  p99 latency > 4s, 5xx rate 12% on endpoint /v1/charges',
    rule: 'p99_breach_v2',
    environment: 'production',
    recent_deploy: 'v2.31.4 (38m ago)',
    commit: 'b74e90a',
    region: 'ap-south-1',
    cluster: 'k8s-mumbai-prod-02',
    customer_impact: '~410 checkout stalls',
    status: 'open',
    top_memory_match: 'INC-1892',
    match_percentage: 94,
    commander: '@jchen',
    slack_channel: '#inc-2087-payments',
    metric_5xx_rate: {
      max_label: '12.4% max',
      points: [1.2, 1.3, 1.4, 1.5, 1.9, 2.8, 4.5, 7.8, 11.2, 12.4]
    },
    logs: `1 14:31:02.104Z [worker-4] INFO Initializing payment session payload
2 14:31:18.441Z [worker-12] WARN redis.client: latency exceeded 200ms
3 14:31:22.890Z [worker-9] ERROR redis.pool: acquire timeout after 3000ms
4 14:31:22.892Z [worker-9] ERROR TransactionFailedException on charge_token
5 14:31:23.012Z [worker-14] ERROR redis.pool: connection pool max limit 50 reached
6 14:31:24.502Z [worker-3] ERROR HTTP 504 Gateway Timeout returned to client
7 14:31:25.110Z [worker-7] ERROR redis.pool: thread blocked waiting for socket
8 14:31:26.402Z [worker-11] WARN health_check: readiness probe failed (timeout)`
  },
  {
    id: 'INC-2094',
    date: '2026-09-28T08:55:12Z',
    service: 'card-vault',
    severity: 'SEV1',
    alert: 'HSM token decryption failure rate > 8% on card-vault',
    rule: 'hsm_decrypt_fail_v1',
    environment: 'production',
    recent_deploy: 'v1.88.2 (14m ago)',
    commit: 'c4f2a1b',
    region: 'us-east-1a, 1b',
    cluster: 'k8s-us-east-prod-01',
    customer_impact: '~1,240 timeouts',
    status: 'open',
    top_memory_match: null,
    match_percentage: null,
    commander: '@jchen',
    slack_channel: '#inc-2094-vault',
    metric_5xx_rate: {
      max_label: '8.42% (baseline 0.01%)',
      points: [0.01, 0.01, 0.02, 0.05, 0.8, 3.2, 6.4, 7.9, 8.42]
    },
    logs: `1 14:32:01Z [worker-3] INFO Initializing PKCS#11 engine session
2 14:32:11Z [worker-8] WARN PKCS11 session slot 0 descriptor queue full
3 14:32:18Z [worker-2] ERROR C_OpenSession returned CKR_CRYPTOKI_NOT_INITIALIZED
4 14:32:19Z [worker-2] ERROR Decrypt failure on payload cipher_blob_42
5 14:32:20Z [worker-5] ERROR C_EncryptInit failed: CKR_DEVICE_ERROR
6 14:32:22Z [worker-1] ERROR Health check failed: HSM blade rack-East-B4 unreachable
7 14:32:24Z [worker-7] ERROR Token exchange dropped with HTTP 500`
  },
  {
    id: 'INC-1744',
    date: '2026-09-28T08:15:00Z',
    service: 'checkout-web',
    severity: 'SEV2',
    alert: 'OOM_KILL_SIG137  OOMKilled: worker pod restarts x6 in namespace prod-frontend',
    rule: 'cgroup_oom_v1',
    environment: 'production',
    recent_deploy: 'v4.12.0 (deployed 45m ago)',
    commit: '9f8a1e2',
    region: 'us-east-1',
    cluster: 'k8s-us-east-prod-01',
    customer_impact: '~180 frontend timeouts',
    status: 'open',
    top_memory_match: 'INC-1744',
    match_percentage: 88,
    commander: '@kpatel',
    slack_channel: '#inc-1744-checkout',
    logs: `2026-09-28T08:14:02Z [WARN] cgroup: memory usage 1998MB / limit 2048MB
2026-09-28T08:14:58Z [ERROR] invoice.generator: uncompressed PDF raster in memory
2026-09-28T08:15:00Z [FATAL] Memory cgroup out of memory: Killed process 840 (checkout-worker)`
  },
  {
    id: 'INC-1980',
    date: '2026-09-28T07:30:00Z',
    service: 'ingress',
    severity: 'SEV1',
    alert: 'TLS_HANDSHAKE_FAIL  TLS handshake failure on ingress edge routers, cert chain mismatch',
    rule: 'tls_handshake_v2',
    environment: 'production-edge',
    recent_deploy: null,
    commit: 'a1b2c3d',
    region: 'global-edge',
    cluster: 'edge-gateway-01',
    customer_impact: '~850 drops',
    status: 'open',
    top_memory_match: 'INC-1980',
    match_percentage: 91,
    commander: '@mreyes',
    slack_channel: '#inc-1980-ingress',
    logs: `2026-09-28T07:29:45Z [WARN] cert-manager: Certificate is expiring in 0 hours
2026-09-28T07:30:01Z [ERROR] envoy.ssl: SSL_do_handshake() failed: certificate expired`
  },
  {
    id: 'INC-1620',
    date: '2026-09-28T04:30:00Z',
    service: 'postgres-primary',
    severity: 'SEV2',
    alert: 'WAL_SYNC_DELAY  Replication lag > 450s on replica-03 (WAL catchup stalled on sync)',
    rule: 'pg_replication_lag',
    environment: 'production',
    recent_deploy: 'v1.18.0',
    commit: '882a9f1',
    region: 'us-east-1',
    cluster: 'db-cluster-prod',
    customer_impact: 'Read replica stale queries',
    status: 'resolved',
    top_memory_match: 'INC-1620',
    match_percentage: 78,
    commander: '@db-oncall',
    slack_channel: '#inc-1620-postgres',
    logs: `2026-09-28T04:28:01Z [WARN] pg_stat_replication: replica-03 streaming standby lag 450s
2026-09-28T04:30:02Z [ERROR] postgres.lock: process waiting for AccessShareLock`
  },
  {
    id: 'INC-4092',
    date: '2026-09-27T23:30:00Z',
    service: 'redis-cache',
    severity: 'SEV3',
    alert: 'MAXMEMORY_EXCEEDED  Memory eviction rate spike in zone-b cluster nodes',
    rule: 'redis_eviction_rate',
    environment: 'production',
    recent_deploy: null,
    commit: '772b109',
    region: 'us-east-1b',
    cluster: 'redis-cache-cluster',
    customer_impact: 'Cache hit ratio dropped 4%',
    status: 'resolved',
    top_memory_match: null,
    match_percentage: null,
    commander: '@oncall-sre',
    slack_channel: '#inc-4092-redis',
    logs: `2026-09-27T23:28:10Z [WARN] redis: eviction policy volatile-lru evicted 4,500 keys/sec`
  },
  {
    id: 'INC-1411',
    date: '2026-09-27T08:30:00Z',
    service: 'card-vault',
    severity: 'SEV2',
    alert: 'DEADLINE_EXCEEDED  Tokenization RPC deadline exceeded (downstream HSM latency spike >800ms)',
    rule: 'hsm_rpc_deadline',
    environment: 'production',
    recent_deploy: 'v1.88.0',
    commit: '6f5e4d3',
    region: 'us-east-1',
    cluster: 'k8s-us-east-prod-01',
    customer_impact: 'Payment checkout delay',
    status: 'resolved',
    top_memory_match: 'INC-1411',
    match_percentage: 85,
    commander: '@sec-oncall',
    slack_channel: '#inc-1411-vault',
    logs: `2026-09-27T08:29:12Z [ERROR] tokenization.rpc: deadline exceeded (820ms)`
  },
  {
    id: 'INC-1599',
    date: '2026-09-26T08:30:00Z',
    service: 'webhook-dispatcher',
    severity: 'SEV3',
    alert: 'QUEUE_BACKLOG  Dead letter queue threshold exceeded (>5,000 msgs in DLQ-stripe-events)',
    rule: 'kafka_dlq_backlog',
    environment: 'production',
    recent_deploy: null,
    commit: '5a4b3c2',
    region: 'us-east-1',
    cluster: 'kafka-prod-01',
    customer_impact: 'Merchant webhook notifications delayed',
    status: 'resolved',
    top_memory_match: 'INC-1599',
    match_percentage: 92,
    commander: '@data-oncall',
    slack_channel: '#inc-1599-webhooks',
    logs: `2026-09-26T08:28:00Z [WARN] kafka.consumer: dlq count exceeded 5000`
  },
  {
    id: 'INC-2032',
    date: '2026-09-24T08:30:00Z',
    service: 'fraud-detection',
    severity: 'SEV2',
    alert: 'FEAT_STORE_TIMEOUT  Feature store latency elevation affecting online risk evaluation scores',
    rule: 'feast_p99_latency',
    environment: 'production',
    recent_deploy: 'v3.1.0',
    commit: '4e3d2c1',
    region: 'us-east-1',
    cluster: 'ml-inference-01',
    customer_impact: 'Risk evaluation fallback engaged',
    status: 'resolved',
    top_memory_match: null,
    match_percentage: null,
    commander: '@risk-oncall',
    slack_channel: '#inc-2032-fraud',
    logs: `2026-09-24T08:28:11Z [ERROR] feature_store: Feast query timeout > 400ms`
  },
  {
    id: 'INC-1102',
    date: '2026-09-22T08:30:00Z',
    service: 'settlement-batch',
    severity: 'SEV3',
    alert: 'JOB_FAIL_MAX_RETRY  Daily reconciliation job timed out after 3 retries (offset parity check)',
    rule: 'batch_timeout_v2',
    environment: 'production',
    recent_deploy: null,
    commit: '3d2c1b0',
    region: 'us-east-1',
    cluster: 'batch-cron-01',
    customer_impact: 'Daily merchant payout batch delayed 1h',
    status: 'resolved',
    top_memory_match: 'INC-1102',
    match_percentage: 67,
    commander: '@batch-oncall',
    slack_channel: '#inc-1102-settlement',
    logs: `2026-09-22T08:27:00Z [ERROR] reconciliation: job failed on offset 891901 after 3 retries`
  }
];

export const MOCK_INCIDENT_DETAILS: Record<string, IncidentDetailResponse> = {
  'INC-2087': {
    incident: MOCK_INCIDENTS[0],
    recommendation: {
      root_cause: 'Redis connection pool exhausted after the v2.31.4 deploy doubled the worker count per container.',
      confidence: 'high',
      confidence_score_label: 'Confidence: High (94% vector match)',
      has_history: true,
      cited_incident_ids: ['INC-2041', 'INC-1987', 'INC-1764'],
      risk_note: 'Precautionary constraint: Do not restart all worker pods simultaneously. This caused a catastrophic thundering herd in INC-1987.',
      steps: [
        {
          title: 'Raise socket ceiling from 50 to 200 in Redis configuration:',
          command: 'helm upgrade --set redis.max_connections=200',
          type: 'mitigation'
        },
        {
          title: 'Apply rolling restart with safe maxUnavailable clamp to prevent reconnection burst:',
          command: 'kubectl rollout restart deployment/payments-api --max-unavailable=1',
          type: 'mitigation'
        },
        {
          title: 'Verify Redis client pool health to confirm connected clients stabilize:',
          command: 'redis-cli info clients | grep connected_clients',
          type: 'check'
        },
        {
          title: 'Monitor p99 latency on /v1/charges gateway for 3 minutes before incident signoff.',
          command: 'curl -s http://localhost:9090/api/v1/query?query=http_req_duration_p99',
          type: 'verified'
        }
      ]
    },
    baseline_recommendation: {
      root_cause: 'Possible causes: high traffic surge or resource exhaustion. Check logs and consider restarting the service.',
      unverified_note: 'Unverified by historical memory',
      steps: [
        {
          title: 'Check container resource utilization and CPU / socket allocations:',
          command: 'kubectl top pods -l app=payments-api'
        },
        {
          title: 'Trigger a blind rollout restart of the payments-api deployment:',
          command: 'kubectl rollout restart deployment/payments-api'
        },
        {
          title: 'Inspect generic application error log streams:',
          command: 'kubectl logs -l app=payments-api --tail=100'
        }
      ]
    },
    similar_incidents: [
      {
        id: 'INC-1987',
        date: 'Oct 14, 2024 (28d ago)',
        service: 'payments-api',
        root_cause: 'Sudden worker scale-up exhausted redis socket limit; manual pod hard restart triggered cascading reconnect spike.',
        resolution_summary: 'Hard restart caused thundering herd on redis master, crashing redis-0. Recovered by rolling 10% batch restarts.',
        failure_note: 'Never perform kubectl rollout restart without maxUnavailable clamp.',
        outcome: 'failed',
        changes_made: null,
        ttr_minutes: 54,
        similarity: 0.94
      },
      {
        id: 'INC-2041',
        date: 'Nov 02, 2024 (9d ago)',
        service: 'payments-api',
        headline: 'Starvation surge',
        root_cause: 'Starvation surge: Increased pool size to 250 via helm values; latency normalized in 3m.',
        resolution_summary: 'Scaled redis pool configuration from 50 to 250 and throttled batch callers.',
        outcome: 'worked',
        changes_made: null,
        ttr_minutes: 14,
        similarity: 0.91
      },
      {
        id: 'INC-1764',
        date: 'Sep 19, 2024 (58d ago)',
        service: 'checkout-web',
        headline: 'Idle connection leak',
        root_cause: 'Idle connection leak: Patched client keep-alive timeout to 60s and bumped socket pool.',
        resolution_summary: 'Patched client keep-alive timeout to 60s and bumped socket pool.',
        outcome: 'worked_with_changes',
        changes_made: 'Lowered timeout to 30s instead of runbook recommendation of 60s to flush zombie sockets faster.',
        ttr_minutes: 29,
        similarity: 0.86
      },
      {
        id: 'INC-1620',
        date: 'Aug 11, 2024',
        service: 'payments-api',
        headline: 'Redis maxclient ceiling',
        root_cause: 'Redis maxclient ceiling: Reconfigured maxclients=10000 on node configuration directly.',
        resolution_summary: 'Updated maxclients config parameter and ran CONFIG REWRITE.',
        outcome: 'worked',
        changes_made: null,
        ttr_minutes: 19,
        similarity: 0.78
      }
    ],
    documents: [MOCK_DOCUMENTS[0]]
  },
  'INC-2094': {
    incident: MOCK_INCIDENTS[1],
    recommendation: {
      root_cause: 'This alert signature has not been observed in the 38 indexed post-mortems or runbooks. Autonomous heuristic remediation is unavailable. Follow the first-principles incident triage checklist below to isolate the hardware security module bottleneck.',
      confidence: 'low',
      confidence_score_label: 'Vector Score: 0 / No Match',
      has_history: false,
      triage_mode: 'first_principles',
      cited_incident_ids: [],
      risk_note: null,
      steps: [
        {
          title: 'Verify upstream HSM cluster health & active session count',
          command: 'curl -s -k https://hsm-internal.us-east-1.internal:8443/status | jq .',
          type: 'diagnostic'
        },
        {
          title: 'Inspect PKCS#11 driver daemon status on worker nodes',
          command: 'kubectl exec -it card-vault-8f9d-1 -- systemctl status pkcs11-daemon',
          type: 'check'
        },
        {
          title: 'Validate failover gateway routing to secondary partition in us-east-2',
          command: 'vault-cli cluster peers --verify-quorum',
          type: 'test'
        },
        {
          title: 'Remediation action: Graceful rollout restart of card-vault deployment',
          command: 'kubectl rollout restart deployment/card-vault -n payments-secure',
          type: 'mitigation'
        }
      ]
    },
    baseline_recommendation: {
      root_cause: 'Hardware Security Module latency timeout.',
      steps: [
        {
          title: 'Check HSM logs and container status',
          command: 'kubectl logs -l app=card-vault --tail=50'
        }
      ]
    },
    similar_incidents: [],
    documents: [MOCK_DOCUMENTS[2]]
  }
};
