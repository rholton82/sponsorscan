import AppShell from "@/components/AppShell";
import { Link } from "wouter";
import { ArrowLeft, ExternalLink, Layers, Shield, Zap, BarChart3, Globe, Lock, FileCheck } from "lucide-react";

// ─── Data ─────────────────────────────────────────────────────────────────────

interface OrgEntry {
  name: string;
  url: string;
  role: string;           // one-line role in this system
  standards: string[];    // key standards/specs
  howItConnects: string;  // specific connection to the demo
  tier: 1 | 2;
}

interface Layer {
  id: string;
  label: string;
  sublabel: string;
  icon: React.ElementType;
  color: string;           // tailwind text color
  borderColor: string;     // tailwind border color
  bgColor: string;         // tailwind bg color
  orgs: OrgEntry[];
}

const LAYERS: Layer[] = [
  {
    id: "detection",
    label: "Detection & Intelligence",
    sublabel: "Video AI that sees what appeared on screen",
    icon: Zap,
    color: "text-[hsl(213_94%_65%)]",
    borderColor: "border-[hsl(213_94%_55%/0.3)]",
    bgColor: "bg-[hsl(213_94%_55%/0.05)]",
    orgs: [
      {
        name: "Twelve Labs",
        url: "https://twelvelabs.io",
        role: "Multimodal video AI — logo, jersey & signage detection engine",
        standards: ["Pegasus 1.2 (visual + audio)", "Marengo 2.7 embeddings"],
        howItConnects: "Core detection engine. Pegasus 1.2 scans every frame of a broadcast for jersey sponsors, pitch perimeter boards, scoreboard overlays, VAR screens, and CTV ad breaks — producing timestamped appearance records with confidence scores and context labels.",
        tier: 1,
      },
      {
        name: "SMPTE",
        url: "https://www.smpte.org/",
        role: "Production & content identification standards body",
        standards: ["ST 2110 (IP live sports production)", "ST 2112 OBID (Ad-ID watermark binding)", "ST 2067 IMF (multi-territory delivery)"],
        howItConnects: "ST 2110 governs the IP production infrastructure of live sports broadcasts being analyzed. ST 2112 OBID watermarking binds Ad-ID codes into commercial video essence — the identifier layer Twelve Labs detections can be anchored to for cross-platform tracking. SMPTE co-ran the joint CIMM/SMPTE Study Group that established audio watermarking as optimal for binding Ad-ID and EIDR codes to all ad and programming content.",
        tier: 1,
      },
    ],
  },
  {
    id: "provenance",
    label: "Content Provenance & Authentication",
    sublabel: "Cryptographic proof that the right creative ran — and hasn't been altered",
    icon: Shield,
    color: "text-purple-400",
    borderColor: "border-purple-500/30",
    bgColor: "bg-purple-500/5",
    orgs: [
      {
        name: "SonicOrigin",
        url: "https://www.sonicorigin.com/",
        role: "Watermark-based video provenance & playback verification",
        standards: ["Patented imperceptible audio/video watermarking", "Decrementing token playback validation", "C2PA Audio Taskforce co-chair", "EIDR · SMPTE · SVTA · PKIC interoperability"],
        howItConnects: "The complementary layer above Twelve Labs. Where Pegasus answers 'what brand appeared on screen', SonicOrigin answers 'was the creative that ran the authorized asset, and did it complete?' Embedded watermark tokens confirm full playback of sponsored content and detect unauthorized substitution or synthetic alteration — providing audit-grade evidence for sponsor contracts.",
        tier: 1,
      },
      {
        name: "C2PA / Content Authenticity Initiative",
        url: "https://c2pa.org/",
        role: "Open standard for cryptographic content credentials",
        standards: ["C2PA Technical Specification v2.1", "BMFF/MP4 Merkle-tree hard bindings (fMP4/ABR streaming)", "COSE signing · X.509 · OCSP · RFC 3161 timestamps", "c2pa.rights · c2pa.hash.bmff.v3 · c2pa.actions.v2"],
        howItConnects: "C2PA manifests embedded in broadcast ad creatives cryptographically record creation, transcoding, and delivery events — verifiable across the supply chain. Any sponsor creative can carry a signed C2PA claim asserting brand ownership, rights holder, and authorized distribution territory. CAI provides the open-source SDK ecosystem for embedding and verifying these credentials at scale.",
        tier: 1,
      },
      {
        name: "PKIC",
        url: "https://pkic.org/",
        role: "PKI infrastructure standards — trust root for C2PA signing keys",
        standards: ["PKI Maturity Model", "Post-Quantum Cryptography Maturity Model", "HSM / TPM integration standards"],
        howItConnects: "C2PA Content Credentials are only as trustworthy as the signing keys behind them. PKIC governs the X.509 certificate infrastructure, HSM key management practices, and post-quantum cryptography readiness that underpin the entire C2PA trust chain — including SonicOrigin's credential signing and the CA validation path in IAB Tech Lab's ads.cert protocol.",
        tier: 2,
      },
      {
        name: "W3C",
        url: "https://www.w3.org/",
        role: "Web standards — identity & privacy-preserving measurement",
        standards: ["Verifiable Credentials Data Model (VC-DATA-MODEL)", "Decentralized Identifiers (DIDs) v1.0", "Privacy-Preserving Attribution (PPA) Level 1"],
        howItConnects: "W3C Verifiable Credentials and DIDs form the identity attestation layer inside C2PA manifests — allowing publishers and brands to bind verified organizational identity to content provenance records. W3C's PPA work defines the future privacy-preserving attribution environment that CTV programmatic measurement must operate within.",
        tier: 2,
      },
      {
        name: "ACR (Automatic Content Recognition) — Risk Profile",
        url: "https://iapp.org/news/a/automated-content-recognition-technology-takes-privacy-enforcement-spotlight",
        role: "Incumbent residual impression measurement method — under active regulatory enforcement",
        standards: [
          "Audio/video fingerprinting against reference databases (proprietary per-manufacturer)",
          "Samsung ACR: transmits viewing data every 1 minute to external servers",
          "LG ACR: transmits every 15 seconds",
          "Texas AG v. Sony, Samsung, LG, Hisense, TCL — lawsuits filed Dec 2025",
          "TROs obtained against Hisense and Samsung (ACR data collection halted in Texas)",
          "FTC v. Vizio (2017): $2.2M settlement + $17M class action (16M users)",
          "Texas DTPA (same statute: $1.4B Meta settlement, $1.375B Google settlement)",
        ],
        howItConnects: "ACR is how smart TVs currently identify what content is on screen — including HDMI-connected devices, replay viewing, and streaming highlights — to enable residual impression measurement and cross-device ad targeting. It is the incumbent technology for measuring brand exposure across the full viewing lifecycle. However: the brand/advertiser whose logo is being detected has zero control over when detection happens, what metadata is attached, who receives the data, or how long it is retained. The creative becomes input data for someone else’s surveillance product. Texas AG enforcement actions in December 2025 (Sony, Samsung, LG, Hisense, TCL) and TROs obtained against Hisense and Samsung signal escalating legal risk for the entire ACR data supply chain. SonicOrigin’s embedded watermark approach is the structural alternative: the content identifies itself via a brand-controlled token, no viewer data is collected, and the detection event is about the creative rather than household behavior.",
        tier: 2,
      },
    ],
  },
  {
    id: "signal",
    label: "Ad Signal & Insertion",
    sublabel: "Standards that mark where ads go and trigger the switch",
    icon: Layers,
    color: "text-amber-400",
    borderColor: "border-amber-500/30",
    bgColor: "bg-amber-500/5",
    orgs: [
      {
        name: "SCTE",
        url: "https://www.scte.org/",
        role: "Universal ad break signaling — the trigger for every ad insertion event",
        standards: ["ANSI/SCTE 35 (Digital Program Insertion Cueing)", "ANSI/SCTE 104 (Baseband SDI signaling)", "ANSI/SCTE 130 (ADM↔ADS↔POIS↔SIS decisioning interfaces)", "ANSI/SCTE 138 (Client-side addressable ad delivery)", "ANSI/SCTE 67 (SCTE-35 in HLS & MPEG-DASH)"],
        howItConnects: "SCTE-35 is the universal binary cue message that fires at every ad break in cable, satellite, OTT, HLS, and MPEG-DASH simultaneously. When Twelve Labs detects a sponsor's brand appearing at 73'42\" during open play, that timestamp can be correlated to SCTE-35 splice points to determine whether a competing brand's CTV ad ran in the prior break — the core of competitive separation logic. SCTE-130's POIS interface carries the rights and policy constraints that govern which ads are eligible for each placement opportunity.",
        tier: 1,
      },
      {
        name: "DVB Project",
        url: "https://dvb.org/",
        role: "European broadcast targeted advertising standard",
        standards: ["ETSI TS 103 752 DVB-TA (targeted advertising — Parts 1 & 2)", "DVB BlueBook A178 (watermark-based ad signaling extension)", "ETSI TS 103 770 DVB-I (hybrid broadcast-broadband)", "ETSI TS 103 285 (MPEG-DASH for DVB)"],
        howItConnects: "For the UK, EU, and MENA territories in the ROI model, DVB-TA is the governing standard for targeted ad substitution in linear broadcast. DVB-TA Part 1 profiles SCTE-35 for DVB use and carries watermark signaling (using ATSC A/334/A/335 — the same standards SonicOrigin interoperates with) for HDMI pass-through STB scenarios. DVB-TA Part 2 uses IAB VAST for the actual ad decision call — making the DVB → VAST → IAB Tech Lab chain complete.",
        tier: 1,
      },
      {
        name: "HbbTV Association",
        url: "https://www.hbbtv.org/",
        role: "Smart TV client execution layer for addressable ad substitution",
        standards: ["TS 103 736 HbbTV-TA Fast Media Switch API", "ETSI TS 103 464 ADB Phase 2 (watermark state machine)", "HbbTV 2.0/3.0 Core Specification (DAS application environment)"],
        howItConnects: "HbbTV is the execution layer that actually performs the ad swap on European smart TVs. When DVB-TA signals an ad opportunity, the HbbTV fast media switch API (TS 103 736) performs a frame-accurate switch from the broadcast stream to the targeted creative. The ADB Phase 2 watermark state machine solves the dominant real-world problem — legacy STBs passing via HDMI where in-band SCTE-35 signals cannot reach the TV — using audio watermarks as the trigger instead.",
        tier: 1,
      },
      {
        name: "ATSC",
        url: "https://www.atsc.org/",
        role: "NextGen broadcast standard enabling programmatic TV ad delivery",
        standards: ["ATSC 3.0 (NextGen TV) — targeted DAI/SSAI for over-the-air broadcast", "A/344 Interactive Content standard", "A/381:2026-03 (published March 2026)", "VAST/OpenRTB adopted as ATSC 3.0 ad delivery standard (Project OAR)"],
        howItConnects: "ATSC 3.0 bridges the final gap between linear broadcast and CTV programmatic delivery. It enables household-level targeted ad insertion, real-time programmatic auction bidding, and deterministic view-count measurement on over-the-air broadcast TV — replacing Nielsen sampling for OTA sports broadcasts. Crucially, ATSC 3.0 adopted VAST and OpenRTB as its standard ad delivery protocols, meaning the same IAB Tech Lab stack governs both streaming and broadcast delivery.",
        tier: 1,
      },
    ],
  },
  {
    id: "decisioning",
    label: "Ad Decisioning & Delivery",
    sublabel: "The programmatic stack that decides what ad runs and confirms it ran",
    icon: FileCheck,
    color: "text-green-400",
    borderColor: "border-green-500/30",
    bgColor: "bg-green-500/5",
    orgs: [
      {
        name: "IAB Tech Lab",
        url: "https://iabtechlab.com/",
        role: "The complete programmatic ad standards stack",
        standards: [
          "OpenRTB v2.6 (pod bidding for CTV commercial breaks)",
          "VAST — CTV addendum July 2024",
          "OM SDK (Open Measurement — CTV impression verification)",
          "ACIF v1.0 (Ad Creative ID Framework)",
          "ads.cert (cryptographic bid-request authentication)",
          "AdCOM (Advertising Common Object Model)",
          "Content Taxonomy 3.1 (Video/CTV Aboutness categories)",
          "Ad Product Taxonomy 2.0",
          "Deals API v1.0 (Feb 2026)",
          "OpenDirect v2.1 (programmatic guaranteed)",
          "CTV Programmatic Guide",
        ],
        howItConnects: "IAB Tech Lab governs the complete programmatic CTV pipeline that Twelve Labs logo detection data feeds into. ACIF v1.0 assigns a persistent identifier to every ad creative — the join key linking 'Heineken appeared at 73:42' to the specific creative in the next break. OpenRTB pod bidding defines how the commercial break slot is auctioned across SSPs. Content Taxonomy 3.1 classifies the match moment (Sports > Football > Goal Celebration) so contextual targeting rules can fire. Ad Product Taxonomy 2.0 classifies what the advertiser sells — enabling competitive separation policy (Beer brand detected on pitch → suppress rival beer brand from next CTV slot). The Deals API streamlines pre-reserved high-value live sports inventory, reducing manual setup for Champions League-tier buys. XR's entire ad delivery workflow runs on this standards stack.",
        tier: 1,
      },
      {
        name: "IAB CTV Ad Portfolio",
        url: "https://iabtechlab.com/standards/ctv-ad-portfolio/",
        role: "Non-interruptive CTV format standards — context gate for overlay, squeeze back & in-scene insertion",
        standards: [
          "In-Scene Insertion Ad (virtual OOH composited into content)",
          "Overlay Ads (lower-third / bottom-right, over live content)",
          "Squeeze Back / L-Shape (content resized, ad alongside — nothing covered)",
          "Ad Squeeze Back / Product Correlation (companion within ad break)",
          "Pause Ad (viewer-initiated full-screen)",
          "Screensaver Ad (OS/App-initiated)",
          "Ad Format Hero initiative — selected from 100+ CTV format submissions (released Dec 11, 2025)",
        ],
        howItConnects: "The CTV Ad Portfolio defines six non-interruptive formats that can appear during program content — outside the traditional ad break. Unlike mid-roll, these formats live or die by scene context. A squeeze back during a goal celebration competes with the highest-attention moment of the match and measurably reduces brand recall. In-scene insertion during open play is organic and non-disruptive. Twelve Labs' scene context output (match moment, sentiment, viewer attention) is the context gate that determines which IAB CTV Ad Portfolio format fires, holds, or suppresses at each timestamp. This creates a feedback loop: logo detected → context classified → SCTE-35 non-interruptive opportunity signaled → format selected based on context gate → ARTF agent executes in sub-millisecond. The Viewer Experience Score and Format Intelligence tab in this report operationalise this framework against the detected appearances.",
        tier: 1,
      },
      {
        name: "LEAP — Live Event Ad Playbook",
        url: "https://iabtechlab.com/standards/leap/",
        role: "Live sports-specific ad delivery standard — the denominator in every CPM calculation",
        standards: [
          "Concurrent Streams API v1.0 Final — real-time per-territory device count",
          "Forecasting API (Public Comment through Mar 20 2026) — pre-match inventory scheduling",
          "Buyer Instructions API (Expected 2026)",
          "Standardized Ad Pre-fetching (TBD)",
          "Creative Readiness (Expected 2026)",
          "Integrates: Deals API + OpenRTB for full live event workflow",
        ],
        howItConnects: "LEAP is the most directly sports-specific standard in this entire stack and the most underdeployed in current programmatic infrastructure. The Concurrent Streams API (v1.0 Final) answers 'how many devices are actually streaming El Clásico right now?' in near-real-time — replacing the static 45M-viewer APAC estimate in this report with a live device count per territory. That number is the denominator in every CPM calculation. The Forecasting API (in public comment right now, March 2026) allows a broadcaster to publish structured metadata — kick-off time, expected ad break schedule, audience forecast by territory — so DSPs and buyers can reserve inventory in advance via the Deals API before the match starts. Without LEAP, live sports inventory is auctioned blind at match time with no advance planning. With LEAP + Deals API, XR can pre-negotiate premium UCL inventory for Heineken before the first whistle, then execute in real-time via OpenRTB pod bidding as Twelve Labs detects brand moments during play.",
        tier: 1,
      },
      {
        name: "Go Addressable",
        url: "https://goaddressable.com/",
        role: "Operational deployment guidelines for 51M U.S. addressable households",
        standards: ["Go Addressable Industry Guidelines (creative format, frequency caps, viewability)", "Go Addressable / CIMM Planning & Buying Guide (2024)", "Technical Implementation Guide: SCTE-35 → ADS integration → CDN delivery → impression data", "OAR Watermark standard (smart TV at-the-glass delivery alternative to SCTE-35)"],
        howItConnects: "Go Addressable translates SCTE-35 and IAB Tech Lab standards into the step-by-step deployment recipe for the largest U.S. pay-TV distributors (Comcast, DIRECTV, DISH, Spectrum). Its Technical Implementation Guide is the production blueprint any XR addressable deployment would follow: implement SCTE-35 → build ADS integration → manage CDN ad copy → share household-ID-matched impression logs. Its 2024 CIMM co-authored Buying Guide directly links deployment to measurement best practices.",
        tier: 1,
      },
    ],
  },
  {
    id: "measurement",
    label: "Measurement & Currency",
    sublabel: "How exposure is valued, audited, and traded",
    icon: BarChart3,
    color: "text-[hsl(36_100%_60%)]",
    borderColor: "border-amber-400/30",
    bgColor: "bg-amber-400/5",
    orgs: [
      {
        name: "CIMM",
        url: "https://cimm-us.org/",
        role: "CTV measurement best practices & audience currency standards",
        standards: ["Brave New World: CTV/Streaming Campaign Best Practices (2025)", "Go Addressable / CIMM Planning & Buying Guide (2024)", "Multi-Currency National TV Measurement feasibility study", "Identity Resolution for Advanced TV best practices", "Attention Measurement Playbook"],
        howItConnects: "The CPM benchmarks and territory model in this report align with CIMM's published CTV measurement best practices. CIMM co-ran the SMPTE/CIMM Study Group that established audio watermarking as optimal for binding Ad-ID codes to content — directly grounding SonicOrigin's playback verification methodology. CIMM's multi-currency measurement work defines how sports broadcast sponsorship value is quantified across linear and streaming simultaneously.",
        tier: 1,
      },
      {
        name: "IAB Open Measurement SDK (OM SDK)",
        url: "https://iabtechlab.com/standards/open-measurement-sdk/",
        role: "CTV impression verification, viewability, and device authenticity",
        standards: [
          "OM SDK 1.5 — expanded to LG and Samsung TVs (irony: same manufacturers under ACR enforcement)",
          "AndroidTV, tvOS, HTML5/Web Video SDK",
          "OMID API — placement on screen, overlay transparency, quartile measurement",
          "Device Attestation (Privacy Pass / IETF) — proves ad rendered on authentic device",
          "Third-party verification: invalid traffic detection, brand requirements",
          "Single SDK replaces custom integrations with multiple verification providers",
        ],
        howItConnects: "OM SDK is the verification counterpart to ACR: where ACR identifies what content is on screen (viewer-side surveillance), OM SDK verifies that an ad impression was actually rendered on an authentic device (content-side confirmation). For residual exposure measurement, OM SDK's Device Attestation using the IETF Privacy Pass protocol confirms that a highlight clip or VOD replay was genuinely viewed — without fingerprinting the viewer's other content. The expansion to LG and Samsung TVs in OM SDK 1.5 is particularly notable: these are the exact manufacturers facing Texas AG ACR enforcement actions, meaning the same smart TVs that are being restricted from ACR data collection can still be verified through OM SDK's privacy-safe attestation approach. Used alongside SonicOrigin's watermark token (content self-identifies) and OM SDK (device authenticity confirmed), residual impression measurement becomes both complete and privacy-compliant.",
        tier: 1,
      },
      {
        name: "VAB",
        url: "https://thevab.com/",
        role: "Sports viewership measurement advocacy & currency reform",
        standards: ["VAB Measurement Innovation Task Force", "Multi-currency guarantee standard (HH/P2+)", "Sports streaming fragmentation analysis"],
        howItConnects: "VAB's Measurement Innovation Task Force and sports viewership research provide the commercial context for why this problem exists — contested Nielsen measurement, sports streaming fragmentation across 8+ platforms, and multi-currency transition all create the measurement gap that logo-based exposure timing fills. VAB's audience advocacy shapes what currency-grade measurement looks like for sports sponsors.",
        tier: 2,
      },
      {
        name: "ANA",
        url: "https://www.ana.net/",
        role: "Buy-side supply chain transparency & programmatic accountability",
        standards: ["Programmatic Transparency Benchmark (CTV-inclusive, quarterly)", "TAG TrustNet LLD Requirements (impression-level log data standards)", "Ethics Code: AI content watermark disclosure requirements"],
        howItConnects: "The ANA's Programmatic Transparency Benchmark — now explicitly including CTV — defines the impression-level log data (LLD) standards that any programmatic CTV measurement system must produce to pass buy-side audits. The TAG TrustNet LLD field requirements govern the data schema that links SCTE-35 insertion events, ACIF creative IDs, and CIMM measurement outputs into a reconciled supply chain report.",
        tier: 2,
      },
      {
        name: "4A's",
        url: "https://www.aaaa.org/",
        role: "Agency accreditation framework & brand safety compliance",
        standards: ["IAB/4A's LFV Addendum (measurement terms for long-form TV DAI)", "4A's / MRC Content-Level Brand Safety Supplement (computer vision accreditation)"],
        howItConnects: "The 4A's/MRC Content-Level Brand Safety Supplement defines what it means to credibly claim brand safety in video environments — requiring computer vision, frame-by-frame classification, and ML validation. This is the accreditation framework that Twelve Labs logo detection data would need to satisfy to be sold as a brand safety product to agencies. The LFV Addendum's measurement terms for DAI in long-form TV content govern how sponsorship impression counts are contractually defined.",
        tier: 2,
      },
    ],
  },
  {
    id: "delivery",
    label: "Delivery Infrastructure",
    sublabel: "Networks and streaming infrastructure that carry the content",
    icon: Globe,
    color: "text-cyan-400",
    borderColor: "border-cyan-500/30",
    bgColor: "bg-cyan-500/5",
    orgs: [
      {
        name: "SVTA",
        url: "https://www.svta.org/",
        role: "Streaming CDN infrastructure & monetization standards",
        standards: ["Open Caching Specifications (SVTA2000 series)", "Open Caching Token Authentication (SVTA2016)", "Streaming Monetization 101 (FAST/AVOD/CPM frameworks)", "SVTA7063 (QUIC vs TCP for media delivery)"],
        howItConnects: "SVTA's Open Caching specs govern the CDN infrastructure layer through which rights-restricted match content is routed and delivered — including the token authentication mechanism (SVTA2016) that validates authorized distribution per-territory. SonicOrigin is a member organization of SVTA. The Streaming Monetization framework covers the FAST and AVOD models where logo-based sponsorship measurement has the highest commercial value.",
        tier: 1,
      },
    ],
  },
  {
    id: "rights",
    label: "Rights & Legal Framework",
    sublabel: "International IP and broadcast rights governance",
    icon: Lock,
    color: "text-rose-400",
    borderColor: "border-rose-500/30",
    bgColor: "bg-rose-500/5",
    orgs: [
      {
        name: "WIPO",
        url: "https://www.wipo.int/portal/en/",
        role: "International broadcast signal protection & IP treaty framework",
        standards: ["Rome Convention (broadcasting organization rights)", "Draft Treaty on the Protection of Broadcasting Organizations (active SCCR negotiation)", "WIPO Copyright Treaty (WCT) — digital rights", "Madrid System (international trademark registration)"],
        howItConnects: "The multi-territory impression values in this report are derived from broadcast rights that exist under WIPO's Rome Convention and are being extended through the pending Broadcasting Treaty — which would grant 50-year signal protection against unauthorized retransmission and reproduction globally. The Madrid System governs international trademark registration of the exact brand logos being detected, making WIPO the legal authority underlying every detection event.",
        tier: 2,
      },
    ],
  },
];

// ─── Architecture Flow Diagram Data ──────────────────────────────────────────

const FLOW_STEPS = [
  { label: "Live Match Broadcast", sub: "SMPTE ST 2110 IP production", color: "bg-slate-700 border-slate-600" },
  { label: "Logo Detection", sub: "Twelve Labs Pegasus 1.2", color: "bg-blue-900 border-blue-700" },
  { label: "Playback Verification", sub: "SonicOrigin · C2PA", color: "bg-purple-900 border-purple-700" },
  { label: "Ad Break Signal", sub: "SCTE-35 · DVB-TA · ATSC 3.0", color: "bg-amber-900 border-amber-700" },
  { label: "Live Audience", sub: "LEAP Concurrent Streams API", color: "bg-teal-900 border-teal-700" },
  { label: "Format Gate", sub: "IAB CTV Ad Portfolio · Context → Overlay/In-Scene/Squeeze", color: "bg-violet-900 border-violet-700" },
  { label: "Ad Decision", sub: "IAB OpenRTB · VAST · Deals API · ACIF", color: "bg-green-900 border-green-700" },
  { label: "Creative Delivery", sub: "SVTA CDN · HbbTV fast media switch", color: "bg-cyan-900 border-cyan-700" },
  { label: "Measurement & ROI", sub: "CIMM · SMPTE OBID · ADMaP DCR", color: "bg-orange-900 border-orange-700" },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function EcosystemPage() {
  return (
    <AppShell>
      {/* Back */}
      <Link href="/">
        <a className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </a>
      </Link>

      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Layers className="w-5 h-5 text-primary" />
          Standards & Ecosystem Architecture
        </h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-3xl">
          SponsorScan is built on, and connects to, a layered stack of industry standards bodies governing
          every step from live sports production through logo detection, ad decisioning, creative delivery,
          and multi-territory sponsorship measurement. Each organization below has a direct, specific role
          in a production deployment of this system.
        </p>
      </div>

      {/* Architecture flow */}
      <div className="stat-card rounded-xl p-5 mb-6">
        <h2 className="text-sm font-semibold text-foreground mb-4">System Architecture Flow</h2>
        <div className="flex flex-wrap items-center gap-2 overflow-x-auto pb-1">
          {FLOW_STEPS.map((step, i) => (
            <div key={step.label} className="flex items-center gap-2">
              <div className={`rounded-lg border px-3 py-2 ${step.color} min-w-[120px]`}>
                <div className="text-xs font-semibold text-white leading-tight">{step.label}</div>
                <div className="text-[10px] text-white/80 mt-0.5 leading-tight">{step.sub}</div>
              </div>
              {i < FLOW_STEPS.length - 1 && (
                <span className="text-muted-foreground text-sm font-bold shrink-0">→</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Quick reference table */}
      <div className="stat-card rounded-xl overflow-hidden mb-6">
        <div className="p-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">Quick Reference</h2>
          <p className="text-xs text-muted-foreground mt-0.5">All Tier 1 standards mapped to system layer and specific spec</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-2.5 text-left text-muted-foreground font-medium">Layer</th>
                <th className="px-4 py-2.5 text-left text-muted-foreground font-medium">Organization</th>
                <th className="px-4 py-2.5 text-left text-muted-foreground font-medium">Key Standard / Spec</th>
                <th className="px-4 py-2.5 text-left text-muted-foreground font-medium">Role in This System</th>
              </tr>
            </thead>
            <tbody>
              {[
                { layer: "Detection", org: "Twelve Labs", spec: "Pegasus 1.2 (visual + audio)", role: "Logo, jersey & signage detection engine", color: "text-blue-400" },
                { layer: "Detection", org: "SMPTE", spec: "ST 2112 OBID · ST 2110", role: "Ad-ID watermark binding; IP sports production", color: "text-blue-400" },
                { layer: "Provenance", org: "SonicOrigin", spec: "Watermark token · C2PA Audio", role: "Playback verification; authorized creative confirmation", color: "text-purple-400" },
                { layer: "Provenance", org: "C2PA / CAI", spec: "C2PA v2.1 · BMFF/fMP4 binding", role: "Cryptographic content credentials for ad creatives", color: "text-purple-400" },
                { layer: "Ad Signal", org: "SCTE", spec: "SCTE-35 · SCTE-130 · SCTE-138", role: "Ad break cueing; programmatic decisioning interfaces", color: "text-amber-400" },
                { layer: "Ad Signal", org: "DVB Project", spec: "ETSI TS 103 752 DVB-TA", role: "European targeted ad signaling (UK, EU, MENA)", color: "text-amber-400" },
                { layer: "Ad Signal", org: "HbbTV", spec: "TS 103 736 Fast Media Switch", role: "Smart TV client-side ad substitution execution", color: "text-amber-400" },
                { layer: "Ad Signal", org: "ATSC", spec: "ATSC 3.0 · VAST/OpenRTB adoption", role: "Programmatic OTA broadcast ad delivery (NextGen TV)", color: "text-amber-400" },
                { layer: "Decisioning", org: "IAB Tech Lab", spec: "OpenRTB · VAST · ACIF · Content Tax 3.1 · Ad Product Tax 2.0 · Deals API", role: "Complete CTV programmatic stack; contextual classification; creative identity", color: "text-green-400" },
                { layer: "Decisioning", org: "IAB CTV Ad Portfolio", spec: "In-Scene · Overlay · Squeeze Back · Pause Ad (Dec 2025)", role: "Non-interruptive format standards; context gate for scene-aware ad delivery", color: "text-green-400" },
                { layer: "Decisioning", org: "IAB LEAP", spec: "Concurrent Streams API v1.0 · Forecasting API", role: "Live sports: real-time device counts + pre-match inventory scheduling", color: "text-green-400" },
                { layer: "Decisioning", org: "Go Addressable", spec: "Tech Implementation Guide · SCTE-35 → ADS", role: "51M HH deployment blueprint; ADS integration spec", color: "text-green-400" },
                { layer: "Measurement", org: "CIMM", spec: "CTV Best Practices · SMPTE/CIMM OBID Study", role: "CPM benchmarks; Ad-ID binding methodology", color: "text-amber-300" },
                { layer: "Measurement", org: "OM SDK", spec: "OM SDK 1.5 · OMID API · Device Attestation (IETF)", role: "CTV impression verification; device authenticity; residual window validation", color: "text-amber-300" },
                { layer: "Measurement", org: "ACR — Risk", spec: "Texas AG suits Dec 2025 · TROs: Hisense, Samsung", role: "Incumbent residual measurement; active enforcement risk — replaced by watermark", color: "text-red-400" },
                { layer: "Delivery", org: "SVTA", spec: "Open Caching · SVTA2016 token auth", role: "CDN delivery infrastructure for rights-restricted content", color: "text-cyan-400" },
              ].map((row, i) => (
                <tr key={i} className="border-b border-border/20 hover:bg-muted/15 transition-colors">
                  <td className={`px-4 py-2 font-semibold ${row.color} whitespace-nowrap`}>{row.layer}</td>
                  <td className="px-4 py-2 font-medium text-foreground whitespace-nowrap">{row.org}</td>
                  <td className="px-4 py-2 font-mono text-foreground/70">{row.spec}</td>
                  <td className="px-4 py-2 text-muted-foreground">{row.role}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Layered org detail cards */}
      <div className="space-y-5">
        {LAYERS.map((layer) => (
          <LayerSection key={layer.id} layer={layer} />
        ))}
      </div>

      {/* Agentic Future Section */}
      <div className="mt-5 border border-blue-500/20 bg-blue-500/5 rounded-xl p-5">
        <div className="flex items-start gap-3">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-blue-500/10 border border-blue-500/20 shrink-0 mt-0.5">
            <Zap className="w-4 h-4 text-blue-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-bold text-blue-400 mb-0.5">Agentic Future — Next Horizon</h2>
            <p className="text-[11px] text-muted-foreground mb-3">
              The standards stack above governs today’s production deployment. The following emerging frameworks define where programmatic advertising is heading in 2026–2027 — and where Twelve Labs logo detection + SonicOrigin provenance data plug in at the agentic layer.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                {
                  name: "IAB Tech Lab AAMP + ARTF",
                  url: "https://iabtechlab.com/standards/aamp-agentic-advertising-management-protocols/",
                  status: "Public Comment closed Jan 2026 · v2.0 in progress",
                  description: "AAMP is the IAB Tech Lab’s umbrella agentic roadmap — built on three pillars: Foundations (ARTF execution infrastructure), Protocols (Agentic Direct, Buyer/Seller Agents, Deals API), and Trust. ARTF defines containerized agent services that operate inside SSP/DSP infrastructure and mutate bid streams in sub-millisecond time. The specific ARTF use case of ‘deal or segmentation activation’ is exactly the mechanism by which a Twelve Labs brand detection event at 73’42″ would modify bid eligibility for competitive brands in the next ad break — without requiring a human decisioning loop.",
                  tags: ["ARTF containers", "OpenRTB bidstream mutation", "Agentic Buyer/Seller agents", "MCP interface"],
                  color: "border-blue-500/30 bg-blue-500/5",
                  tagColor: "bg-blue-500/10 text-blue-400",
                },
                {
                  name: "AdCP — Ad Context Protocol",
                  url: "https://agenticadvertising.org",
                  status: "Launched Oct 2025 · Prebid Sales Agent Jan 2026",
                  description: "AdCP is the external agentic competitor to ARTF, created by Scope3, Triton Digital, Yahoo, PubMatic, Optable, and Swivel — governed by AgenticAdvertising.org. Where IAB Tech Lab’s AAMP extends existing standards, AdCP proposes standards native to AI agents. Prebid took over the sell-side Sales Agent reference implementation in January 2026. The live industry debate: AAMP augments OpenRTB, AdCP potentially routes around DSPs entirely. Both camps have agreed interoperability is needed. For XR, monitoring which standard the DSP/SSP ecosystem converges on determines which agentic integration path to build first.",
                  tags: ["Sell-side AI agent", "Prebid Sales Agent", "AgenticAdvertising.org", "DSP bypass risk"],
                  color: "border-purple-500/30 bg-purple-500/5",
                  tagColor: "bg-purple-500/10 text-purple-400",
                },
                {
                  name: "ADMaP + CoMP",
                  url: "https://iabtechlab.com/admap/",
                  status: "ADMaP v1.0 Final Feb 2026 · CoMP v1 Public Comment Apr 2026",
                  description: "ADMaP (Attribution Data Matching Protocol) enables privacy-preserving post-campaign sponsor ROI attribution in a Data Clean Room — matching Twelve Labs exposure timestamps against advertiser conversion events without exposing PII. CoMP (Content Monetization Protocols) governs how licensed AI systems access publisher content, directly relevant to how Twelve Labs indexes and analyzes rights-restricted broadcast footage. As AI bots increasingly index sports broadcast content, CoMP defines the access token and licensing API layer that aligns with SonicOrigin’s provenance and rights enforcement model.",
                  tags: ["Data Clean Room attribution", "Privacy-preserving ROI", "AI content licensing", "SonicOrigin alignment"],
                  color: "border-amber-500/30 bg-amber-500/5",
                  tagColor: "bg-amber-500/10 text-amber-400",
                },
              ].map((item) => (
                <div key={item.name} className={`rounded-lg border p-3 ${item.color}`}>
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <a href={item.url} target="_blank" rel="noopener noreferrer"
                      className="text-xs font-bold text-foreground hover:text-primary transition-colors">
                      {item.name}
                    </a>
                    <ExternalLink className="w-3 h-3 text-muted-foreground shrink-0 mt-0.5" />
                  </div>
                  <div className="text-[10px] text-muted-foreground font-mono mb-2">{item.status}</div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed mb-2">{item.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {item.tags.map((tag) => (
                      <span key={tag} className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${item.tagColor}`}>{tag}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer note */}
      <div className="mt-8 border border-border/40 rounded-lg p-4 text-xs text-muted-foreground">
        <p className="font-semibold text-foreground mb-1">About this architecture</p>
        <p>
          This standards mapping reflects the production architecture for deploying AI-powered logo detection data
          into a real CTV ad decisioning workflow — as would be implemented by a Global Solution Architect at an
          omnichannel ad delivery platform such as ExtremeReach (XR). Each organization listed either publishes
          a technical specification the system depends on, co-governs a methodology used in the ROI model, or
          provides the compliance framework within which the system must operate. Organizations without direct
          technical or governance roles (e.g., Copyright Society of the USA, SVG) are excluded.
        </p>
        <p className="mt-2">
          Logo detection powered by{" "}
          <a href="https://twelvelabs.io" target="_blank" className="text-primary hover:underline">Twelve Labs Pegasus 1.2</a>.
          Provenance layer:{" "}
          <a href="https://www.sonicorigin.com" target="_blank" className="text-primary hover:underline">SonicOrigin</a> ·{" "}
          <a href="https://c2pa.org" target="_blank" className="text-primary hover:underline">C2PA</a>.
          Built for the Twelve Labs LA/ME 2026 Hackathon · XR Global Solution Architect demo.
        </p>
      </div>
    </AppShell>
  );
}

// ─── Layer Section Component ──────────────────────────────────────────────────
function LayerSection({ layer }: { layer: Layer }) {
  const Icon = layer.icon;
  return (
    <div className={`rounded-xl border ${layer.borderColor} ${layer.bgColor} overflow-hidden`}>
      {/* Layer header */}
      <div className="px-5 py-3 border-b border-white/5 flex items-center gap-3">
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${layer.bgColor} border ${layer.borderColor}`}>
          <Icon className={`w-4 h-4 ${layer.color}`} />
        </div>
        <div>
          <h2 className={`text-sm font-bold ${layer.color}`}>{layer.label}</h2>
          <p className="text-[11px] text-muted-foreground">{layer.sublabel}</p>
        </div>
      </div>

      {/* Org cards */}
      <div className="divide-y divide-white/5">
        {layer.orgs.map((org) => (
          <OrgCard key={org.name} org={org} accentColor={layer.color} />
        ))}
      </div>
    </div>
  );
}

// ─── Org Card Component ───────────────────────────────────────────────────────
function OrgCard({ org, accentColor }: { org: OrgEntry; accentColor: string }) {
  return (
    <div className="px-5 py-4" data-testid={`org-card-${org.name.toLowerCase().replace(/\s+/g, "-")}`}>
      <div className="flex items-start justify-between gap-4 flex-wrap mb-2">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-bold text-foreground">{org.name}</h3>
            {org.tier === 1 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-400 font-medium">
                Tier 1 — Direct
              </span>
            )}
            {org.tier === 2 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 font-medium">
                Tier 2 — Adjacent
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{org.role}</p>
        </div>
        <a
          href={org.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors shrink-0"
        >
          <ExternalLink className="w-3 h-3" />
          {new URL(org.url).hostname.replace("www.", "")}
        </a>
      </div>

      {/* Key standards */}
      <div className="flex flex-wrap gap-1.5 mb-2.5">
        {org.standards.map((std) => (
          <span
            key={std}
            className="text-[10px] px-2 py-0.5 rounded-full bg-muted/60 text-muted-foreground font-mono border border-border/40"
          >
            {std}
          </span>
        ))}
      </div>

      {/* How it connects */}
      <div className="flex items-start gap-2">
        <span className={`${accentColor} text-xs mt-0.5 shrink-0 font-bold`}>↳</span>
        <p className="text-xs text-muted-foreground leading-relaxed">{org.howItConnects}</p>
      </div>
    </div>
  );
}
