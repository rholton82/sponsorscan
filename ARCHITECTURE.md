# SponsorScan — Architecture

## System Overview

SponsorScan combines Twelve Labs multimodal video AI with a multi-layer compliance and ROI engine to deliver explainable sponsorship decisions from live football broadcast footage.

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         LIVE FOOTBALL BROADCAST                                 │
│                    (SMPTE ST 2110 IP production infrastructure)                 │
└─────────────────────────────┬───────────────────────────────────────────────────┘
                              │  MP4 clip or live stream
                              ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         VIDEO INGESTION                                         │
│  POST /api/videos/upload  →  Multer multipart handler  →  SQLite (videos table) │
│  POST /api/videos/:id/index  →  Twelve Labs Tasks API  →  Index ID + Task ID    │
└─────────────────────────────┬───────────────────────────────────────────────────┘
                              │  Task ID → poll until status = "ready"
                              ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    TWELVE LABS PEGASUS 1.2 ANALYSIS                             │
│                                                                                 │
│  POST /api/generate  (video_id, prompt, temperature=0.1)                        │
│                                                                                 │
│  Prompt instructs Pegasus to detect:                                            │
│  • pitch_perimeter_board    • jersey_front_sponsor    • jersey_sleeve_sponsor   │
│  • field_centre_logo        • scoreboard_overlay      • var_review_screen       │
│  • corner_flag              • goal_net_branding        • ctv_ad_break           │
│  • broadcast_overlay        • tunnel_backdrop                                   │
│                                                                                 │
│  For each appearance: brand, start_time, end_time, placement_type,             │
│  sponsorship_category, prominence, context, sentiment_context,                  │
│  viewer_attention, confidence                                                   │
│                                                                                 │
│  Visual (frame-by-frame) + Audio (commentary context) multimodal fusion        │
└─────────────────────────────┬───────────────────────────────────────────────────┘
                              │  JSON array of Appearance objects
                              ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                     COMPLIANCE GUARDIAN ENGINE                                  │
│                    (runComplianceEngine — server/twelvelabs.ts)                 │
│                                                                                 │
│  Rule 1: COMPETITIVE SEPARATION                                                 │
│    For each in-game placement, check if a rival brand appears within            │
│    the contractual exclusivity window (5–10 min per category).                  │
│    → SCTE-130 POIS constraint injected → rival CTV ad break suppressed         │
│    → Audit record: COMP-XXXX, timestamp, brands, policy rule, evidence          │
│                                                                                 │
│  Rule 2: FREQUENCY CAP (ORGANIC + PAID COMBINED)                               │
│    Track brand exposures: organic in-game (Twelve Labs) + paid CTV (OM SDK).   │
│    When combined count exceeds OFCOM/ASA/UKGC cap → next CTV insertion blocked │
│    → Audit record: organic count, paid count, cap limit, regulatory basis       │
│                                                                                 │
│  Rule 3: CONTEXTUAL BRAND SAFETY                                                │
│    Detect negative-sentiment contexts (VAR review, penalty kick, negative).    │
│    If regulated brand (alcohol/gambling) has ad break within 5-min window →    │
│    suppress per OFCOM Broadcasting Code / ASA rules.                            │
│    → Audit record: sentiment log, context classification, suppression action    │
│                                                                                 │
│  Output: ComplianceReport { violations[], suppressedAdBreaks, penaltyAvoided,  │
│          labourSaved, complianceScore, summary }                                 │
└──────────────┬──────────────────────────────────────────────┬───────────────────┘
               │                                              │
               ▼                                              ▼
┌──────────────────────────────┐          ┌────────────────────────────────────────┐
│     MULTI-TERRITORY ROI      │          │       FORMAT INTELLIGENCE              │
│     calculateROI()           │          │       generateFormatIntelligence()     │
│                              │          │                                        │
│  6 territories:              │          │  IAB CTV Ad Portfolio (Dec 2025):      │
│  UK  · EU  · LatAm           │          │  For each IAB format type:             │
│  APAC · MENA · NA            │          │  • In-Scene Insertion                  │
│                              │          │  • Overlay (Lower-Third)               │
│  Per brand per territory:    │          │  • Squeeze Back / L-Shape              │
│  Base CPM $12 × multipliers: │          │  • Pause Ad                            │
│  • Territory (1.4–5.8×)      │          │  • Ad Squeeze Back                     │
│  • Placement type (0.7–2.2×) │          │                                        │
│  • Context (0.7–2.5×)        │          │  Context gate per appearance:          │
│  • Prominence (0.45–1.8×)    │          │  fire / caution / suppress             │
│                              │          │  based on match moment + sentiment     │
│  Output: BrandROI[]          │          │                                        │
│  territory breakdown         │          │  Output: FormatIntelligence {          │
│  grade (A+–F)                │          │    recommendations[], suppressionRate, │
│  global impression value     │          │    viewerExperienceScore }             │
└──────────────┬───────────────┘          └──────────────────┬─────────────────────┘
               │                                             │
               └──────────────────┬──────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                      RESIDUAL EXPOSURE ENGINE                                   │
│                      calculateResidualExposure()                                │
│                                                                                 │
│  In-game placements only (perimeter boards, jerseys, field logos) earn          │
│  residual value. CTV ad breaks expire with the live broadcast.                  │
│                                                                                 │
│  5 residual windows:                                                            │
│  • In-Match Replays    (+25% audience · same day)                               │
│  • Time-Shifted TV     (+30% audience · 7 days) [Goldbach: 30% of TV usage]    │
│  • Highlights/Social   (+40% audience · 30 days) [UCL: 5–20M+ views/clip]      │
│  • VOD / Catch-Up      (+12% audience · 30 days)                               │
│  • Media Library       (+8% audience  · 90 days)                               │
│                                                                                 │
│  Value = inGameLiveValue × audienceMultiplier × placementShare × 0.55 CPM disc │
│  Typical lift: +30–35% over live-only impression value                          │
└─────────────────────────────┬───────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        STORAGE LAYER                                            │
│                      Drizzle ORM + SQLite (better-sqlite3)                      │
│                                                                                 │
│  Tables: videos | sponsor_appearances | analysis_reports                        │
│  Synchronous driver · .get() / .all() / .run() patterns                         │
│  Persists across server restarts                                                 │
└─────────────────────────────┬───────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        REPORT API RESPONSE                                      │
│                   GET /api/videos/:id/report                                    │
│                                                                                 │
│  {                                                                              │
│    report: AnalysisReport,                                                      │
│    appearances: SponsorAppearance[],                                            │
│    video: Video,                                                                │
│    roi: {                                                                       │
│      brands: BrandROI[],                                                        │
│      summary: {                                                                 │
│        totalBrands, totalExposureSeconds, totalGlobalImpressionValue,           │
│        complianceReport: ComplianceReport,     ← Compliance Guardian output    │
│        residualExposure: ResidualExposureReport,                                │
│        globalFormatIntelligence: FormatIntelligence,                            │
│        summaryTerritories, territories, analysisNote                            │
│      }                                                                          │
│    }                                                                            │
│  }                                                                              │
└─────────────────────────────┬───────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        REACT FRONTEND (8 TABS)                                  │
│                      Vite + React 18 + Tailwind + shadcn/ui                     │
│                                                                                 │
│  ⚖ Compliance   │ Brand Rankings  │ Global Reach    │ Format Intelligence       │
│  Residual Exp.  │ Timeline        │ Placement Types │ Detection Log             │
│                                                                                 │
│  + /ecosystem route: 20+ standards across 8 architecture layers                │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Standards Integration Map

```
DETECTION LAYER
  Twelve Labs Pegasus 1.2 ──────────────────── Visual + Audio multimodal
  SMPTE ST 2110 ────────────────────────────── IP live sports production
  SMPTE ST 2112 OBID ───────────────────────── Ad-ID watermark binding

PROVENANCE LAYER
  SonicOrigin ──────────────────────────────── Embedded watermark token (ACR alternative)
  C2PA v2.1 ────────────────────────────────── Cryptographic content credentials
  PKIC ─────────────────────────────────────── X.509 / HSM trust chain for C2PA
  W3C VCs + DIDs ───────────────────────────── Identity attestation in C2PA manifests

AD SIGNAL LAYER
  SCTE-35 / SCTE-130 ───────────────────────── Ad break cuing + policy constraints (N. America)
  DVB-TA (ETSI TS 103 752) ─────────────────── Targeted ad signaling (EU/UK/MENA)
  HbbTV TS 103 736 ──────────────────────────── Smart TV fast media switch execution
  ATSC 3.0 ─────────────────────────────────── Programmatic OTA broadcast (VAST/OpenRTB)

DECISIONING LAYER
  IAB OpenRTB v2.6 ─────────────────────────── Pod bidding for CTV commercial breaks
  IAB VAST (CTV addendum 2024) ─────────────── Video ad serving
  IAB ACIF v1.0 ────────────────────────────── Ad Creative ID Framework (join key)
  IAB Content Taxonomy 3.1 ─────────────────── Match moment classification
  IAB Ad Product Taxonomy 2.0 ──────────────── Advertiser product classification
  IAB CTV Ad Portfolio (Dec 2025) ──────────── Non-interruptive format standards
  IAB LEAP Concurrent Streams API ──────────── Real-time viewer count denominator
  IAB Deals API v1.0 (Feb 2026) ────────────── Pre-match inventory reservation
  Go Addressable ───────────────────────────── 51M HH addressable TV deployment

MEASUREMENT LAYER
  CIMM ─────────────────────────────────────── CTV measurement best practices
  IAB OM SDK 1.5 ───────────────────────────── Impression verification + Device Attestation
  ACR [RISK] ───────────────────────────────── Incumbent method — TX AG suits Dec 2025
  SMPTE/CIMM OBID ──────────────────────────── Ad-ID to content essence binding

DELIVERY LAYER
  SVTA Open Caching ────────────────────────── CDN infrastructure for rights-restricted content

RIGHTS LAYER
  WIPO Broadcasting Treaty ─────────────────── International signal protection framework
```

---

## Key Design Decisions

### Why Pegasus 1.2 (not Marengo)
The compliance use case requires **generative analysis** — not just embedding similarity search. Pegasus processes visual + audio simultaneously and produces structured JSON describing *what is happening* in the scene (context, sentiment, viewer attention level). Marengo embeds are powerful for retrieval but can't classify "VAR review with negative sentiment" from a frame alone.

### Why Demo Mode exists
Twelve Labs indexing takes 1–5 minutes per clip. Judges have limited time. Demo mode generates statistically realistic soccer brand data (12 brands, ~80 appearances, realistic timing distributions, authentic placement mixes) so the full compliance + ROI pipeline is demonstrable without waiting for indexing.

### Why SQLite not PostgreSQL
Single-match, single-user hackathon context. SQLite's synchronous driver with Drizzle ORM provides zero-config persistence that survives server restarts without any external database setup. README notes the production migration path.

### Why territory-based CPM (not flat global)
The compliance engine's frequency cap logic depends on *which territory's rules apply*. OFCOM (UK) has different alcohol ad frequency rules than the FCC (US). The territory model makes the compliance decisions more accurate and the ROI numbers more defensible.

---

## API Reference

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/videos` | List all uploaded videos |
| `POST` | `/api/videos/upload` | Upload a video clip (multipart/form-data) |
| `POST` | `/api/videos/:id/index` | Send to Twelve Labs for indexing (requires API key) |
| `GET` | `/api/videos/:id/task-status` | Poll Twelve Labs task status |
| `POST` | `/api/videos/:id/analyze` | Run Pegasus 1.2 analysis (requires API key + indexed video) |
| `POST` | `/api/videos/:id/demo-analyze` | Run full pipeline with synthetic data (no API key needed) |
| `GET` | `/api/videos/:id/report` | Full report: ROI + compliance + residual + format intel |
| `GET` | `/api/videos/:id/appearances` | Raw appearance list |
| `DELETE` | `/api/videos/:id` | Delete video and all associated data |
| `POST` | `/api/config` | Set Twelve Labs API key (session-scoped) |
| `GET` | `/api/config/status` | Check API key and index status |
| `GET` | `/api/dashboard/summary` | Aggregate stats across all analyzed videos |

---

## Compliance Engine Detail

```
Input:  SponsorAppearance[] (from Twelve Labs or demo generator)

Rule 1: Competitive Separation
  For each in_game_placement:
    Look up competitive pair (Beverages, Sportswear, Payment, Aviation, Automotive)
    Find rival brand within separation window (5–10 min)
    If found: create ComplianceViolation {
      violationType: "competitive_separation"
      severity: "suppressed" (if rival is ad_placement) | "warning" (if rival in-scene)
      standardRef: "SCTE-130 POIS · IAB Content Taxonomy 3.1 · IAB Ad Product Taxonomy 2.0"
      auditEvidence: [detected brand + timestamp, rival brand + timestamp,
                      separation window elapsed, penalty risk range]
    }

Rule 2: Frequency Cap
  Maintain running counter per brand: { organic, paid }
  increment organic on in_game_placement, paid on ad_placement
  For regulated brands (Heineken/alcohol: max 4/hr, Betway/gambling: max 3/hr):
    If (organic + paid) >= ceil(cap * 1.5):
      Create ComplianceViolation {
        violationType: "frequency_cap"
        standardRef: "IAB LEAP · IAB OM SDK · SCTE-130 SIS · OFCOM/ASA"
        auditEvidence: [organic count, paid count, total, cap limit, regulatory basis]
      }

Rule 3: Contextual Brand Safety
  Identify negative contexts: var_review | penalty_kick | sentimentContext="negative"
  For each negative context:
    Find regulated brand (alcohol/gambling) with ad_placement within 300s after
    Create ComplianceViolation {
      violationType: "contextual_brand_safety"
      severity: "suppressed"
      standardRef: "IAB Content Taxonomy 3.1 · 4A's/MRC Brand Safety · OFCOM"
      auditEvidence: [negative context + timestamp, ad break timestamp,
                      window elapsed, content taxonomy classification]
    }

Output: ComplianceReport {
  violations:                  ComplianceViolation[]
  suppressedAdBreaks:          count of severity="suppressed"
  violationsAvoided:           total violation count
  estimatedPenaltyAvoided:     csViolations×$75K + (fc+cbs)×$25K
  estimatedLabourSaved:        violations × 20min / 60
  complianceScore:             100 - violations×6 + suppressed×3  (0–100)
  competitiveSeparationViolations / frequencyCapViolations / contextualSafetyViolations
  summary:                     human-readable audit summary
}
```

---

## Performance

| Operation | Latency | Notes |
|---|---|---|
| Demo analyze (full pipeline) | **118–133ms** | 12 brands, 79+ appearances, all 4 engines |
| Report fetch | **8–32ms** | Full JSON including compliance + residual |
| Dashboard summary | **13–24ms** | Aggregate across all videos |
| Video upload | **18ms** | Multipart to SQLite |
| Twelve Labs Pegasus 1.2 (real) | 1–5 min | External API; depends on clip length |

---

## Deployment

```bash
npm run build        # Vite frontend + esbuild server
NODE_ENV=production node dist/index.cjs
```

Express serves both static assets and API routes on port 5000.
