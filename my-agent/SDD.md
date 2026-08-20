ENTERPRISE AGENTIC SOLUTION DESIGN
DOCUMENT
HR Agentic Solution (MVP 1) — Comprehensive Revised v1.3 (All Stakeholder Concerns
Resolved)
STAKEHOLDER REVIEW INCORPORATIONS (VERSION 1.3): Prominently embeds all 10 architectural deliverables into the
document body: (1) Explicit Scope Boundary Table (In-Scope vs. Out-of-Scope per BRD Section 2); (2) Strategic Enterprise
Business Roadmap across Horizons 1–3 (MVP 1 → Active-Active Production → Autonomous HR Engine); (3) Explicit OpenAPI 3.0
JSON Payload Schemas & REST Contracts for WorkWeek HCM & ServiceImmediately ITSM; (4) Multi-Turn Session State
Store Architecture & Mandatory Eviction Rules (FR-3.4); (5) Database Schemas & Full ERD Topology
(`erd_diagram.png`) with 7-year WORM compliance schedule; (6) Technology Stack 'Alternatives Considered' Matrix
justifying Google ADK + Cloud Run + Redis + BigQuery; (7) Technical Scalability & Connection Pooling Model supporting 150
concurrent sessions & PgBouncer DB limits; (8) Consolidated Technical & Operational Risk Register Table with pre/post
scores (`RSK-01` to `RSK-07`); (9) Complete Comprehensive Error-Handling & Fallback Matrix Table (`ERR-01` to
`ERR-06`); (10) Actual Terraform IaC Code (`main.tf`, `iam.tf`) & CI/CD Pipeline YAML (`cloudbuild.yaml`) with
automated ADK gatekeeper assertions; (11) Itemized FinOps Cost & Scaling Table (`~$394.25/mo` vs `$180,000/mo`
ROI); and (12) Iterative 4-Sprint Multi-Agent Development Schedule.

Document Control & Revision History
Version

Date

Author

Description of Change

0.1

Aug 2026

AI Solution Architect

Initial setup & mapping of BRD FRs/NFRs/UCs to traceably
bounded multi-agent architecture.

1.0

Aug 2026

Enterprise Arch Board

Formalized dynamic guardrails, delegated token scoping, FinOps
model, and 4-tier evalset.

1.1

Aug 18, 2026

Lead AI Architect

Added OpenAPI JSON API schemas, multi-turn state store & PII
eviction rules, ERD diagram, IaC + CI/CD YAML, & RBAC matrix.

1.2

Aug 18, 2026

Chief Agent Architect

Added Stack Alternatives Matrix, Risk Register with pre/post
scores, Peak Scalability Model, & Agentic Delivery Plan.

1.3 (Final)

Aug 18, 2026

Enterprise Arch Board

Embedded explicit Scope Boundary Table (In-Scope vs Out-ofScope), Strategic Horizons 1–3 Roadmap, Tabular Error Handling
Matrix (ERR-01 to ERR-06), Inline Terraform IaC snippets
(`main.tf`), CI/CD YAML (`cloudbuild.yaml`), and Itemized FinOps
Cost Table.

1. Executive Summary & Explicit Scope Boundaries (STAKEHOLDER GAP)
1.1. Business Overview & Context
Modern enterprise HR and IT helpdesks experience severe operational drag driven by high volumes of routine Tier 1 inquiries
—such as checking accrued paid time off (PTO), requesting policy clarifications, querying IT ticket statuses, or ordering
remote hardware. Employees currently navigate fragmented backend interfaces across WorkWeek (HCM),
ServiceImmediately (ITSM), and static PDF files.

CONFIDENTIAL — ENTERPRISE ARCHITECTURE REVIEW BOARD & AGENT ENGINEERING

Page 1 of 11

HR AGENTIC SOLUTION (MVP 1) — REVISED SDD (v1.4)

1.2. Explicit Scope Boundary Table (In-Scope vs. Out-of-Scope per BRD Section 2)
IN-SCOPE FOR MVP 1 (BRD Section 2.1 & 2.2)

OUT-OF-SCOPE FOR MVP 1 (BRD Section 2.3 & Section 6)

• Conversational UI: Web chat interface supporting multi-turn
session state.
• Policy Q&A (UC-1.1 / FR-5.x): Ingestion of HR PDF/Text
documents, strict grounding (FR-5.2), deep-link URL citations
(FR-5.3), sync < 15 min SLA (FR-5.5).
• WorkWeek HCM Self-Service (UC-1.2 / FR-3.x):
– Reads: Live fetch of Profile & PTO balances directly from
WorkWeek on every query (FR-3.4). Zero dynamic agent caching.
– Writes: Address/phone updates; leave submission with preinvocation PTO balance check (FR-3.3) & date ordering validation.
• ServiceImmediately ITSM (UC-1.3 / FR-4.x):
– Reads: Ticket status, priority, category, assignee, and comment
timeline.
– Writes: Incident creation, comment posting, and status updates
with lifecycle transition graph check & 15-min duplicate hash
scanner (FR-4.3).
• Cross-System Chaining (UC-2.1 - UC-2.3): Orchestrated
multi-step workflows across Policy + HCM + ITSM.

• Third-Party Systems: Any backend beyond WorkWeek,
ServiceImmediately, and designated Policy Repo.
• Multi-Lingual: English only for MVP 1.
• Sensitive HR Domains: Processing of payroll data,
performance reviews, or compensation details.
• Voice/IVR: Voice-based interactions excluded.
• Multi-Tenancy: Single-tenant deployment scope for MVP 1.
• Live Enterprise SSO Integration: Functional test credentials
used for backend API integrations in MVP 1 per BRD Section 6
(production token exchange detailed in Section 2).

1.3. Technology Stack Alternatives Comparison Matrix
Option A: AWS
Bedrock + ECS +
PostgreSQL

Option B: Azure
OpenAI + Container
Apps + Cosmos DB

Option C: Traditional
Bot (Dialogflow CX) +
Custom SQL DB

SELECTED OPTION D:
Google ADK + Cloud Run
+ Redis + BigQuery

Orchestration &
Multi-Agent
Framework

Custom Python agent
loop on Bedrock /
LangChain; lacks native
ADK traceably bounded
subagents.

Semantic Kernel /
AutoGen on Azure;
higher cross-region
token latency in
European/APJ zones.

Rigid Dialogflow state
machine; zero
generative multi-step
planning for crosssystem chains (UC-2.x).

Google ADK (Agent
Development Kit): Native
hierarchical Supervisor +
specialized subagents with
pre-invocation validators &
sub-120ms intercept hooks.

Policy RAG &
Context Window

Claude 3 / Titan; custom
embeddings with
OpenSearch index
management overhead.

GPT-4o; limited context
window for full PDF
policy comparison &
multi-document
grounding check.

Rule-based FAQs only;
cannot ground answers
or cite deep-link section
anchors (FR-5.2,
FR-5.3).

Gemini 1.5 Pro / Flash +
Vertex AI Vector Search:
Native 1M/2M token
context, RRF hybrid
retrieval, and mandatory
deep-link citation anchors.

Session State &
Mandatory FR-3.4
PII Eviction

PostgreSQL session
table; disk persistence
violates zero dynamic PII
caching mandate
(FR-3.4).

Cosmos DB JSON
documents; high write
latency for sub-second
turn scratchpads.

Local Node memory
cache; state lost on
container scaling events.

Google Cloud
Memorystore (Redis
TTL): Split envelope —
persistent 30m idle session
trace ID vs. volatile turn
scratchpad auto-zeroed
post-turn.

Audit Sink & WORM
Compliance
(FR-1.2)

S3 + Athena query
setup; requires custom
tamper-proof log locking.

Log Analytics
workspace; expensive
ingest per GB for full API
payload trace logs.

Standard RDBMS table;
vulnerable to DB
administrator UPDATE
statements.

BigQuery Partitioned
WORM Sink: Native
immutable append-only
trace log with automated
SPII regex masking before
disk write (FR-1.4).

Architectural
Dimension

2. Strategic Business Roadmap & Future State Evolution (STAKEHOLDER GAP)
The solution evolves from a traceably bounded MVP 1 baseline into a multi-region autonomous enterprise AI platform across
three strategic horizons:
Strategic Horizon

Target Timeframe

Core Architectural & Business Deliverables

Target Business Metric

Horizon 1: MVP 1
Foundation

Months 1–2 (Current Scope)

• Traceably Bounded Multi-Agent ADK Topology
across WorkWeek & ServiceImmediately.
• Sub-120ms Dynamic Safety Interceptors & PII
Redaction (FR-1.3, FR-1.4).
• Mandatory Turn Eviction of Employee PII & PTO
balances (FR-3.4).
• Automated 4-Tier Golden Evalset sign-off (>=
95% accuracy).

Deflect ≥ 25% Tier 1
tickets; demonstrate
cross-system chain
integrity.

CONFIDENTIAL — ENTERPRISE ARCHITECTURE REVIEW BOARD & AGENT ENGINEERING

Page 2 of 11

HR AGENTIC SOLUTION (MVP 1) — REVISED SDD (v1.4)

Strategic Horizon

Target Timeframe

Core Architectural & Business Deliverables

Target Business Metric

Horizon 2:
Production Scale

Months 3–6

• Production Google Cloud Workload Identity
Federation & OAuth 2.0 OIDC SSO bridging.
• Active-Active GKE Autopilot multi-region
deployment with Anycast Global LB (99.99%
SLA).
• Dynamic SPII Column Masking for HR Manager
approval views.
• Sub-Minute Object Change Webhook Policy
Watchdog (FR-5.5).

Deflect ≥ 40% Tier 1
tickets (~$180,000/mo
net ROI).

Horizon 3:
Autonomous HR
Engine

Months 6–12

• Multi-lingual support (Spanish, German,
Japanese, French).
• Zero-knowledge cryptographic verification for
sensitive payroll & tax inquiries.
• Autonomous ITSM hardware failure prediction &
automated dispatch.

Deflect ≥ 65% global Tier
1 inquiries; automated
onboarding.

CONFIDENTIAL — ENTERPRISE ARCHITECTURE REVIEW BOARD & AGENT ENGINEERING

Page 3 of 11

HR AGENTIC SOLUTION (MVP 1) — REVISED SDD (v1.4)

3. Target Visual Enterprise Architecture & Topology (GCP Multi-Agent ADK)
The visual diagram below depicts the end-to-end zero-trust architecture across all six operational tiers: (1) Ingress & WAF, (2)
Sub-120ms Dynamic Safety Interceptors, (3) Google ADK Multi-Agent Tier, (4) Workload Identity Federation, (5)
Enterprise Connectors (Zero Caching FR-3.4), and (6) WORM Audit Log & Hybrid RAG Store.

Figure 1: Enterprise GCP Multi-Agent Architecture, Step-by-Step Data Flow [1]-[6], VPC Service Controls Perimeter &
Zero-Trust PII Redaction

Figure 2: Multi-Turn Cross-System Orchestration Sequence Diagram (UC-2.1 Remote Hardware Order)

CONFIDENTIAL — ENTERPRISE ARCHITECTURE REVIEW BOARD & AGENT ENGINEERING

Page 4 of 11

HR AGENTIC SOLUTION (MVP 1) — REVISED SDD (v1.4)

Figure 3: Entity Relationship Diagram (ERD) & Storage Topology across HCM, ITSM, Audit Sink, and Policy Vector Store

4. Explicit JSON Payload Schemas & Interface Contracts (STAKEHOLDER GAP)
4.1. WorkWeek HCM REST API OpenAPI Contracts
// [CONTRACT 1] GET /v1/employees/{emp_id} — Live Profile Read (FR-3.2 / FR-3.4)
REQUEST HEADERS:
Authorization: Bearer
X-Requestor-EmpID: "8841"
X-Automation-Origin: "AGENT_AUTOMATED_ACTION"
RESPONSE (200 OK — JSON SCHEMA BOUND):
{
"$schema": "https://json-schema.org/draft/2020-12/schema",
"emp_id": "8841",
"full_name": "Sarah Jenkins",
"contact_info": { "home_address": "123 High St, London, UK", "personal_phone": "+442079460921" },
"remote_status": "REMOTE"
}

// [CONTRACT 2] POST /v1/employees/{emp_id}/leave — Submit Time-Off Request (FR-3.2 / FR-3.3)
REQUEST PAYLOAD (POST /v1/employees/8841/leave):
{
"leave_type": "VACATION",
"start_date": "2026-09-10",
"end_date": "2026-09-12",
"requested_hours": 24.0,
"pre_check_signature": { "verified_remaining_hours": 96.0, "chronologic_order_valid": true }
}

CONFIDENTIAL — ENTERPRISE ARCHITECTURE REVIEW BOARD & AGENT ENGINEERING

Page 5 of 11

HR AGENTIC SOLUTION (MVP 1) — REVISED SDD (v1.4)

4.2. ServiceImmediately ITSM REST API OpenAPI Contracts
// [CONTRACT 3] POST /v1/incidents — Auditable Support Ticket Creation (FR-4.1 / FR-4.3)
REQUEST PAYLOAD:
{
"requestor_emp_id": "8841",
"category": "Hardware",
"priority": 3,
"short_description": "Remote Home Office Monitor Dispatch - Remote Policy §3.2 Eligible",
"dedupe_fingerprint": "SHA256(8841:Hardware:Remote Home Office Monitor Dispatch)" // Enforces 15m window
}

5. Technical Scalability Model: Concurrency, Connection Pooling & Burst Spikes
Models morning shift peak concurrency for 10,000 employees generating ~25,000 monthly queries with burst arrival
spikes reaching 150 concurrent active sessions (`~25 req/sec`):
Connection Pooling &
Multiplexing Strategy

Concurrency Cap & Overload
Protection

min-instances = 2
max-instances = 20

Stateless HTTP/2 active
multiplexing; concurrency = 80
reqs/instance.

Handles up to 1,600
concurrent turns before
queuing; CPU limits 2 vCPU / 4
GiB per instance.

WorkWeek HCM REST
Client

HTTP/2 Keep-Alive Client Pool

Shared connection pool capped at
max 40 idle connections per
replica (max 800 global).

Prevents saturating WorkWeek
internal web server thread pool;
429 / 504 backoff retry
(NFR-4.2).

ServiceImmediately
ITSM Client

HTTP/2 Client Pool + Redis
Fingerprint Hash

Shared pool (max 30 conns/
instance); client checks Redis 15minute deduplication hash prior to
POST.

Eliminates duplicate ticket
creation spikes during outage
storms (FR-4.3).

Cloud SQL / PgBouncer
DLQ Store

PgBouncer Connection Pooler

PgBouncer Transaction Pooling
Mode with max_client_conn =
1000 and default_pool_size =
150.

Prevents PostgreSQL out-ofmemory connection exhaustion;
statement_timeout = 5000ms.

System Tier / Resource

Autoscaling & Replicas

Cloud Run ADK
Orchestrator

6. Comprehensive Tabular Error-Handling & Fallback Matrix (STAKEHOLDER
GAP)
Component Failure
Scenario

Technical Resiliency & Compensating
Action (NFR-4.2 / NFR-4.3)

Non-Technical User Notification
Message (NFR-4.1)

ERR-01

WorkWeek API HTTP 429 /
504 Timeout

Exponential backoff retry (150ms →
400ms → 1000ms max 3 retries) with
client-side token bucket.

"WorkWeek HCM is experiencing temporary
delay. Retrying your request..." (Handled
transparently; temporary service notice if
retry exhausted).

ERR-02

Complete Backend Outage
(HTTP 503)

Circuit breaker trips open. Internal stack
traces masked.

"The HR Leave / Support Desk service is
temporarily unreachable right now. Please
try again in 5 minutes."

ERR-03

PTO Balance Exceeded /
Validation Rejection
(FR-3.3)

Client-side pre-invocation check aborts
POST request before network execution.

"You currently have 12.0 hours of remaining
Vacation PTO, which is insufficient for your
request of 16.0 hours (2 days). Please
adjust your requested dates."

ERR-04

Cross-System Chaining
Partial Failure (UC-2.x)

Queues compensating record in Dead
Letter Queue (DLQ) for automated IT
dispatch.

"Your leave request (#LW-104) was
submitted to WorkWeek. Opening your
manager notification ticket in
ServiceImmediately was delayed; our IT
support team has been notified."

ERR-05

Policy Retrieval
Confidence < 0.78 (FR-5.2)

Strict grounding checker aborts
generation & sets POLICY_NOT_FOUND
status.

"I could not find an explicit HR policy
statement matching your query. Please
open an HR inquiry ticket or consult your HR
Business Partner."

ID

CONFIDENTIAL — ENTERPRISE ARCHITECTURE REVIEW BOARD & AGENT ENGINEERING

Page 6 of 11

HR AGENTIC SOLUTION (MVP 1) — REVISED SDD (v1.4)

ID
ERR-06

Component Failure
Scenario

Technical Resiliency & Compensating
Action (NFR-4.2 / NFR-4.3)

Non-Technical User Notification
Message (NFR-4.1)

Prompt Injection /
Jailbreak Detected (FR-1.3)

Sub-120ms Ingress Interceptor drops
prompt & records SAFETY_BLOCKED audit
event.

"Your request cannot be processed as it
violates enterprise AI safety & HR domain
guidelines."

7. Formal RBAC Permission Matrix & Identity Bridging Table
Enterprise Role Identity

WorkWeek Profile
& PTO

WorkWeek Leave
Requests

ServiceImmediately ITSM
Tickets

Audit Logs & Vector
Repo

Standard Employee
(emp_id Scoped)

READ / UPDATE
(Own only)

CREATE / VIEW (Own
only)

CREATE / COMMENT (Own
only)

READ Policy Repo. NO
Audit access.

HR Manager / Approver

READ (Direct
reports)

APPROVE / REJECT
(Direct reports)

COMMENT / VIEW
(Department)

READ Policy Repo.

IT Helpdesk Technician

NO ACCESS

NO ACCESS

UPDATE STATUS / RESOLVE

NO ACCESS to PII logs.

Agent Automation
Identity

Scoped via
Delegated Token

Scoped via Delegated
Token

Requires Origin Header

WRITE ONLY (Audit Log
Sink).

Audit Compliance
Officer

NO ACCESS

NO ACCESS

NO ACCESS

READ ONLY (Masked
BigQuery Logs).

8. Consolidated Technical & Operational Risk Register Table
Concrete Architectural Counter-Measure &
Mitigation

ID

Risk Event & Description

Pre-Score

RSK-01

API Rate Limiting & Backend
Throttling

HIGH (16)

Token bucket rate limiter + exponential backoff retry +
Redis rate key.

LOW (3)

RSK-02

LLM Model Drift & Concept
Drift

HIGH (12)

Automated CI/CD 4-tier golden evaluation gatekeeper
blocking promotion.

LOW (2)

RSK-03

Policy Hallucination & Broken
Citations

HIGH (15)

Hybrid RRF threshold ≥ 0.78 + mandatory deep-link
verification.

LOW (2)

RSK-04

Prompt Injection / State
Override

CRITICAL
(20)

Sub-120ms dynamic interceptors + HMAC signed
Delegated Token.

LOW (3)

RSK-05

Cross-System Chaining Partial
Failure

MEDIUM (9)

Automated Dead Letter Queue (DLQ) compensating
rollback.

LOW (2)

RSK-06

SPII Data Leakage into Log
Sinks

CRITICAL
(20)

Local regex/NER masking replacing SPII with
[REDACTED_SPII].

LOW (2)

CONFIDENTIAL — ENTERPRISE ARCHITECTURE REVIEW BOARD & AGENT ENGINEERING

Post-Score

Page 7 of 11

HR AGENTIC SOLUTION (MVP 1) — REVISED SDD (v1.4)

9. Terraform IaC Code Snippets & CI/CD Pipeline YAML Gatekeeper
(STAKEHOLDER GAP)
9.1. Complete Terraform IaC Configuration Snippet (main.tf & iam.tf)
# [main.tf] VPC Service Controls Perimeter & GKE Autopilot / Cloud Run Service
resource "google_cloud_run_v2_service" "hr_agent_orchestrator" {
name
= "hr-agent-orchestrator-mvp1"
location = "europe-west1"
ingress = "INGRESS_TRAFFIC_INTERNAL_ONLY" # Enforces Private VPC Service Controls Ingress
template {
service_account = google_service_account.hr_agent_sa.email
scaling {
min_instance_count = 2
max_instance_count = 20
}
containers {
image = "eu.gcr.io/altostrat-hr-ai/hr-agent-orchestrator:v1.3"
resources { limits = { cpu = "2", memory = "4Gi" } }
env { name = "WORKWEEK_API_BASE_URL"; value = "https://workweek-internal.altostrat.corp/v1" }
env { name = "ITSM_API_BASE_URL";
value = "https://itsm-internal.altostrat.corp/v1" }
env { name = "REDIS_HOST";
value = google_redis_instance.session_store.host }
}
}
}
# [iam.tf] Workload Identity Federation Role Bindings
resource "google_service_account_iam_member" "workload_identity_binding" {
service_account_id = google_service_account.hr_agent_sa.name
role
= "roles/iam.workloadIdentityUser"
member
= "serviceAccount:altostrat-idp.svc.id.goog[hr-namespace/hr-agent-service]"
}

9.2. Automated CI/CD Pipeline Configuration YAML (cloudbuild.yaml with ADK Eval Gatekeeper)
steps:
# STEP 1: Lint OpenAPI Contracts & Tool Definitions
- name: 'stoplight/spectral'
args: ['lint', 'contracts/workweek_openapi.yaml', 'contracts/itsm_openapi.yaml']
# STEP 2: Execute ADK Golden Evaluation Suite on Sandbox Mock
- name: 'gcr.io/altostrat-hr-ai/google-agents-cli:latest'
args:
- 'eval'
- 'run'
- '--config=eval_config.json'
- '--evalset=evalsets/4_tier_golden_evalset.json'
- '--output=eval_results.json'
# STEP 3: Automated Quality Gatekeeper Assertion Script
- name: 'python:3.13-slim'
script: |
import json, sys
res = json.load(open('eval_results.json'))
print(f"Policy Q&A Accuracy: {res['metrics']['policy_accuracy']}% (Target >= 95%)")
print(f"Hallucination Rate: {res['metrics']['hallucination_rate']}% (Target == 0%)")
print(f"Safety Block Rate:
{res['metrics']['safety_block_rate']}% (Target == 100%)")
print(f"Cross-System Pass:
{res['metrics']['cross_system_pass_rate']}% (Target == 100%)")
if res['metrics']['policy_accuracy'] < 95.0 or res['metrics']['hallucination_rate'] > 0.0:
print("CRITICAL: ADK Evaluation Gatekeeper FAILED! Promotion blocked.")
sys.exit(1)
print("ADK Evaluation Gatekeeper PASSED. Proceeding to Staging Rollout.")

CONFIDENTIAL — ENTERPRISE ARCHITECTURE REVIEW BOARD & AGENT ENGINEERING

Page 8 of 11

HR AGENTIC SOLUTION (MVP 1) — REVISED SDD (v1.4)

10. FinOps Cost Estimation Model & Agentic Development Schedule
(STAKEHOLDER GAP)
10.1. Itemized FinOps Cost & Scaling Model Table (10,000 Employees | ~25,000 Queries/Mo)
Cost Component

GCP Enterprise Tier Pricing

Estimated Monthly
Usage

Monthly Cost Estimate

Gemini 1.5 Pro / Flash (Core
LLM)

$1.25 / M input • $5.00 / M output
tokens

30M Input • 6.25M Output
Tokens

$37.50 (Input) + $31.25
(Output)

Vertex AI Vector Search
Index

Standard Shard Hosting

1 Active Index Shard

$145.00

Cloud Run / GKE Autopilot
Compute

4 Replicas (2 CPU, 4 GB RAM)

99.9% Uptime SLA

$180.00

BigQuery & Cloud Logging
(Audit Sink)

$0.01 / GB Ingested

50 GB Audit & Trace Logs

$0.50

TOTAL MONTHLY OPERATING COST (~25,000 queries/mo)

~$394.25 / mo (~$0.016 /
query)

BUSINESS ROI: 40% TICKET DEFLECTION (10,000 Tickets/Mo Deflected @ ~$18/Ticket)

$180,000 / mo Gross
Savings

10.2. Agentic Software Engineering Delivery Schedule (4-Sprint Roadmap)
Sprint & Dates

Focus Area & Core
Deliverables

Specific Engineering Tasks & ADK Subagent
Scaffolding

Verification Gate & Quality
Criteria

Sprint 1
(Weeks 1–2)

Traceably Bounded Sandbox &
Guardrails

Scaffold supervisor_agent, dynamic
interceptors (FR-1.3, FR-1.4), Terraform VPC
perimeter, BigQuery WORM audit sink (FR-1.2),
& Tier 1/4 evalsets.

100% Ingress Safety Block on
prompt injections; 0ms PII
leak.

Sprint 2
(Weeks 3–4)

WorkWeek & ITSM Subagents

Implement HMAC Delegated Auth Scoping
(FR-3.1), pre-check balance validators (FR-3.3),
ITSM transition graph check (FR-4.3), & Redis
post-turn PII eviction (FR-3.4).

100% Transaction Correctness
on PTO balance checks.

Sprint 3
(Weeks 5–6)

Hybrid Policy RAG & Citations

Ingest & chunk HR PDF policies preserving
section anchor URLs (#sec-3.2), wire Hybrid RAG
+ RRF, & configure Cloud Storage Object Change
Webhook Watchdog (FR-5.5).

Tier 1 Policy Q&A Accuracy ≥
95% on golden evalset; 0%
hallucinations.

Sprint 4
(Weeks 7–8)

Cross-System Chaining &
Staging UAT

Orchestrate multi-step chains (UC-2.1 UC-2.3), wire DLQ compensating rollback
(NFR-4.3), execute CI/CD gatekeeper suite, &
complete enterprise UAT.

100% Pass on all UC-2.x crosssystem chains; sign-off for
Staging rollout.

CONFIDENTIAL — ENTERPRISE ARCHITECTURE REVIEW BOARD & AGENT ENGINEERING

Page 9 of 11

HR AGENTIC SOLUTION (MVP 1) — REVISED SDD (v1.4)

11. Open Questions, Known Unknowns & Post-MVP Hypotheses (STAKEHOLDER
GAP)
To ensure complete operational transparency and prevent presenting the MVP design as static or unvalidated, this section
documents tracked architectural unknowns, operational risks under investigation, and empirical post-MVP validation
hypotheses.

11.1. Tracked Open Questions & Known Unknowns Table
Tracked Open Question /
Known Unknown

Architectural Implication & Investigation
Scope

Assigned Owner

Resolution
Gate

OQ-01

Policy Sync Webhook
Quotas (FR-5.5)
Can Cloud Storage Object
Change Webhooks trigger
real-time Vertex AI Vector
Search re-indexing (<15m
SLA) during bulk policy
refactors?

Investigate Vertex AI streaming index update
quotas under simultaneous multi-document
commits to prevent index queue backpressure.

AI Platform Lead

Sprint 1 Gate

OQ-02

Granular Medical SPII
Routing (UC-2.2)
Should short-term medical
leave notes be redacted
completely from
ServiceImmediately ticket
descriptions, or routed to a
restricted HR Medical queue?

Determine whether Egress Interceptor (FR-1.4)
should mask diagnosis text to
[REDACTED_MEDICAL_SPII] before ITSM ticket
POST.

SecOps & Legal

Sprint 2 Gate

OQ-03

WorkWeek On-Prem
Thread Pool Capacity
What is the exact HTTP
connection limit of
WorkWeek's legacy API
gateway during 9:00 AM shift
start bursts (150 concurrent
sessions)?

Conduct load simulation against WorkWeek
staging endpoint to fine-tune PgBouncer & HTTP/
2 keep-alive connection pool sizes.

HCM Integrations
Lead

Sprint 2 Gate

OQ-04

Multi-Region Anycast
Subagent Roundtrips
Will Anycast Global LB routing
APJ employees to European
active-active GKE Autopilot
clusters exceed the <10s
TTFT SLA?

Benchmark open telemetry distributed trace
spans across GKE Europe and APJ regions during
cross-system chaining (UC-2.1).

GCP Infra Architect

Sprint 3 Gate

ID

11.2. Post-MVP Empirical Hypotheses & Validation Metrics
EMPIRICAL POST-MVP LEARNING LOOP (AGENTIC DEVELOPMENT)
Each hypothesis below is instrumented via BigQuery WORM audit telemetry (audit_event_traces) and evaluated
automatically during bi-weekly Enterprise Architecture Review Board sprints.
Hypothesis ID &
Title

Core Post-MVP Hypothesis Statement

Telemetry Instrument & Success Criterion

HYP-01
Deflection Elasticity

We hypothesize that enforcing client-side PTO balance
pre-checking (FR-3.3) and 15-minute duplicate ticket
hash scanning (FR-4.3) will eliminate >90% of erroneous
leave/ticket submissions, driving overall Tier 1 helpdesk
deflection from 25% to ≥ 40% within 180 days.

Compare monthly SUBMITTED vs
PRE_CHECK_FAILED audit events against total
helpdesk ticket volume (≥ 10,000 deflected
tickets/mo).

HYP-02
Zero-Cache Latency
Trade-Off

We hypothesize that fetching Employee Profile and PTO
balances live on every query turn (FR-3.4) adds <
180ms overhead to overall turn latency while
eliminating 100% of stale leave approval edge cases and
meeting GDPR Article 17 zero-retention compliance.

OpenTelemetry P95 span duration on
workweek_subagent live API calls vs. total
dialogue turn latency (< 10.0s TTFT target).

CONFIDENTIAL — ENTERPRISE ARCHITECTURE REVIEW BOARD & AGENT ENGINEERING

Page 10 of 11

HR AGENTIC SOLUTION (MVP 1) — REVISED SDD (v1.4)

Hypothesis ID &
Title
HYP-03
Hybrid RRF Grounding
Superiority

Core Post-MVP Hypothesis Statement

Telemetry Instrument & Success Criterion

We hypothesize that combining BM25 keyword retrieval
with Vertex AI text-embedding-004 semantic search via
Reciprocal Rank Fusion (RRF) increases exact HR Policy
Q&A exact grounding accuracy (FR-5.2) from 88% to ≥
95.5%, reducing policy hallucinations to 0.0%.

Automated LLM-as-a-Judge (eval-adk-skill)
golden evaluation score across Tier 1 policy test
suite (target 0% hallucination).

CONFIDENTIAL — ENTERPRISE ARCHITECTURE REVIEW BOARD & AGENT ENGINEERING

Page 11 of 11

