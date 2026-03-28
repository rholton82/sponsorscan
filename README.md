# SponsorScan ⚽ — Global Football Sponsor Intelligence

> **Twelve Labs LA/ME 2026 Hackathon · Compliance Guardian Track**

AI-powered sponsorship compliance and ROI measurement for live football broadcasts. Detects sponsor logos, jersey placements, and pitch signage using Twelve Labs Pegasus 1.2 — then enforces competitive separation, frequency caps, and contextual brand safety rules with a full audit trail.

**Live Demo:** [sponsorscan.perplexity.ai](https://www.perplexity.ai/computer/a/sponsorscan-global-football-sp-D..3lSviQE6vxC3BRMai0A)

---

## What It Does

| Capability | Description |
|---|---|
| **Compliance Guardian** | Detects competitive conflicts, frequency cap breaches, and contextual brand safety violations — each with timestamp, confidence, policy rule, and suppression action |
| **Multi-territory ROI** | Calculates impression value across 6 global territories (UK, EU, LatAm, APAC, MENA, NA) using IAB CPM benchmarks |
| **Format Intelligence** | Maps IAB CTV Ad Portfolio formats (overlay, squeeze back, in-scene insertion) to match context — fires or suppresses based on sentiment and viewer attention |
| **Residual Exposure** | Quantifies value beyond the live broadcast: in-match replays, time-shifted viewing (Goldbach: 30% of TV), highlights/social clips, VOD catch-up |
| **ACR Alternative** | SonicOrigin watermark approach vs. ACR (Texas AG sued Samsung, LG, Hisense, TCL Dec 2025) — content self-identifies without viewer surveillance |
| **Standards Architecture** | Full ecosystem page covering 20+ standards: SCTE-35/130, DVB-TA, HbbTV, IAB LEAP, CIMM, SMPTE, C2PA, WIPO |

---

## Quick Start (< 5 minutes)

### Prerequisites
- Node.js 18+
- A Twelve Labs API key (get one free at [playground.twelvelabs.io](https://playground.twelvelabs.io))

### Install & Run

```bash
git clone https://github.com/YOUR_USERNAME/sponsorscan.git
cd sponsorscan
npm install
npm run dev
```

Open [http://localhost:5000](http://localhost:5000).

### Without a Twelve Labs API Key (Demo Mode)

The app ships with **Demo Mode** — no API key needed. Click **Upload Video**, fill in match details, then click **Demo Mode** to load realistic soccer brand data (12 brands, ~80 appearances, full compliance + ROI analysis). All features work without a key.

### With a Real Twelve Labs API Key

1. Click **Set API Key** in the top-right header
2. Enter your key (starts with `tlk_`)
3. Upload a football broadcast clip (MP4, up to 500MB)
4. Click **Index** → wait for Twelve Labs to process (~1–5 min depending on clip length)
5. Click **Analyze** → Pegasus 1.2 scans for sponsors and generates the full report

---

## Environment Variables

No `.env` file required for demo mode. For production deployment with a persisted API key, set:

```bash
TWELVE_LABS_API_KEY=tlk_your_key_here   # Optional — can also be set via UI
NODE_ENV=production
```

---

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full data flow diagram.

**Stack:**
- **Frontend:** React 18 + Vite + Tailwind CSS + shadcn/ui + Recharts
- **Backend:** Express + TypeScript + Drizzle ORM + SQLite (better-sqlite3)
- **AI:** Twelve Labs Pegasus 1.2 (visual + audio multimodal)
- **Standards:** SCTE-35/130, IAB OpenRTB, LEAP, Content Taxonomy 3.1, DVB-TA, SMPTE OBID

---

## Performance Benchmarks

All benchmarks measured on a 2-vCPU sandbox against the production build:

| Operation | Response Time | Notes |
|---|---|---|
| `GET /api/dashboard/summary` | 13–24ms | SQLite aggregation across all videos |
| `GET /api/videos` | 2ms | Full video list |
| `GET /api/videos/:id/report` | 8–32ms | Full report including appearances |
| `POST /api/videos/upload` | 18ms | Multipart video file upload |
| `POST /api/videos/:id/demo-analyze` | **118–133ms** | Full pipeline: ROI engine + compliance engine (3 rule categories) + residual exposure (5 windows) + format intelligence (5 IAB formats) + territory CPM model (6 markets) across 79+ detected appearances |
| Twelve Labs Pegasus 1.2 (real video) | 1–5 min | Depends on video length; 30s clip ≈ 60s processing |

**Scalability:** The SQLite + in-memory compliance engine handles single-match analysis. Production deployment would use PostgreSQL + a queue (BullMQ/SQS) for parallel video indexing across a full season (200+ matches).

---

## Report Tabs

| Tab | What It Shows |
|---|---|
| ⚖ **Compliance** | Violation audit log with COMP-XXXX IDs, policy rules, evidence, suppression actions |
| **Brand Rankings** | Per-brand ROI score, global impression value, territory breakdown, grade (A+–F) |
| **Global Reach** | Territory bar chart, CPM by market, XR/CTV decisioning callout |
| **Format Intelligence** | IAB CTV Ad Portfolio format recommendations with context gate matrix |
| **Residual Exposure** | Post-live value across 5 windows + ACR vs. SonicOrigin watermark comparison |
| **Timeline** | Brand exposure stacked bar across match segments |
| **Placement Types** | In-game vs. ad break split, sentiment, viewer attention |
| **Detection Log** | Every appearance with timestamp, placement type, confidence % |

---

## Standards & Ecosystem

The [/ecosystem](https://www.perplexity.ai/computer/a/sponsorscan-global-football-sp-D..3lSviQE6vxC3BRMai0A/#/ecosystem) page documents the full production architecture across 8 layers:

- **Detection:** Twelve Labs Pegasus 1.2 · SMPTE ST 2110/2112
- **Provenance:** SonicOrigin · C2PA · PKIC · W3C VCs
- **Ad Signal:** SCTE-35/130/138 · DVB-TA · HbbTV TS 103 736 · ATSC 3.0
- **Decisioning:** IAB OpenRTB · VAST · ACIF · Content Taxonomy 3.1 · Ad Product Taxonomy 2.0 · Deals API · IAB CTV Ad Portfolio · LEAP · Go Addressable
- **Measurement:** CIMM · OM SDK · SMPTE OBID · ACR risk profile
- **Delivery:** SVTA Open Caching
- **Rights:** WIPO Broadcasting Treaty
- **Agentic Future:** AAMP/ARTF · AdCP · ADMaP · CoMP

---

## Business Case

See [business-case.pdf](./business-case.pdf) for the one-page quantified business case.

**TL;DR:**
- Manual sponsorship compliance: $64K–$96K/year labor + $2M–$10M penalty exposure per season
- SponsorScan: 4–6 hrs per match → under 5 minutes AI-assisted audit
- Three compliance use cases: competitive separation (SCTE-130 POIS), frequency cap (OFCOM/ASA + OM SDK), contextual brand safety (4A's/MRC + IAB Content Taxonomy)
- Residual exposure: +32% impression value captured from time-shifted/highlights/VOD windows missed by current workflows

---

## Project Structure

```
├── client/src/
│   ├── pages/
│   │   ├── dashboard.tsx      # Video library + compliance badge
│   │   ├── report.tsx         # Full report (8 tabs)
│   │   ├── ecosystem.tsx      # Standards architecture
│   │   └── video-detail.tsx   # Index + analyze workflow
│   └── components/
│       └── AppShell.tsx       # Nav + API key management
├── server/
│   ├── routes.ts              # All API endpoints
│   ├── twelvelabs.ts          # TL client + ROI/compliance/residual engines
│   └── storage.ts             # Drizzle ORM + SQLite
└── shared/
    └── schema.ts              # Database schema + types
```

---

## Submission

- **Track:** Compliance Guardian
- **Live Demo:** [sponsorscan](https://www.perplexity.ai/computer/a/sponsorscan-global-football-sp-D..3lSviQE6vxC3BRMai0A)
- **Business Case:** [business-case.pdf](./business-case.pdf)
- **Builder:** Global Solution Architect, ExtremeReach (XR) · [xr.global](https://xr.global)
- **Context:** SonicOrigin provenance & watermarking layer — [sonicorigin.com](https://sonicorigin.com)
