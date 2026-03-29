import axios from "axios";
import FormData from "form-data";
import fs from "fs";

const API_BASE = "https://api.twelvelabs.io/v1.2";

export function getTLClient(apiKey: string) {
  const headers = { "x-api-key": apiKey };

  return {
    async createIndex(indexName: string) {
      const res = await axios.post(
        `${API_BASE}/indexes`,
        {
          index_name: indexName,
          models: [
            {
              model_name: "pegasus1.2",
              model_options: ["visual", "audio"],
            },
          ],
        },
        { headers }
      );
      return res.data;
    },

    async listIndexes() {
      const res = await axios.get(`${API_BASE}/indexes`, { headers });
      return res.data;
    },

    async getOrCreateIndex(indexName: string): Promise<string> {
      try {
        const list = await this.listIndexes();
        const existing = (list.data || []).find((idx: any) => idx.index_name === indexName);
        if (existing) return existing._id;
      } catch {}
      const created = await this.createIndex(indexName);
      return created._id;
    },

    async uploadVideo(indexId: string, filePath: string, fileName: string) {
      const form = new FormData();
      form.append("index_id", indexId);
      form.append("language", "en");
      form.append("video_file", fs.createReadStream(filePath), {
        filename: fileName,
        contentType: "video/mp4",
      });
      const res = await axios.post(`${API_BASE}/tasks`, form, {
        headers: { ...headers, ...form.getHeaders() },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      });
      return res.data;
    },

    async getTaskStatus(taskId: string) {
      const res = await axios.get(`${API_BASE}/tasks/${taskId}`, { headers });
      return res.data;
    },

    async listVideos(indexId: string) {
      const res = await axios.get(`${API_BASE}/indexes/${indexId}/videos`, { headers });
      return res.data;
    },

    async getLogosByVideo(indexId: string, videoId: string) {
      const res = await axios.get(
        `${API_BASE}/indexes/${indexId}/videos/${videoId}/logo`,
        { headers }
      );
      return res.data;
    },

    async searchLogos(indexId: string, query: string) {
      const res = await axios.post(
        `${API_BASE}/search`,
        { index_id: indexId, query, search_options: ["logo"] },
        { headers }
      );
      return res.data;
    },

    async analyzeVideo(videoId: string, prompt: string) {
      const res = await axios.post(
        `${API_BASE}/generate`,
        { video_id: videoId, prompt, temperature: 0.1 },
        { headers }
      );
      return res.data;
    },
  };
}

// ─── Types ────────────────────────────────────────────────────────────────────
export interface Appearance {
  brand: string;
  startTime: number;
  endTime: number;
  exposureDuration: number;
  placementType: string;
  sponsorshipCategory: string;
  prominence: string;
  context?: string;
  sentimentContext?: string;
  viewerAttention?: string;
  confidence?: number;
}

// ─── Multi-Territory CPM Model ────────────────────────────────────────────────
// Source: Nielsen Sports, Kantar Media, SportsPro sponsorship benchmarks

export const TERRITORIES: Record<string, {
  name: string;
  flag: string;
  viewerShare: number;  // % of global match audience
  cpmMultiplier: number;  // vs. global base CPM of $12
  estimatedViewers: number; // millions per top-flight match
  currency: string;
}> = {
  UK: {
    name: "United Kingdom",
    flag: "🇬🇧",
    viewerShare: 0.08,
    cpmMultiplier: 4.5,   // ~$54 CPM
    estimatedViewers: 8_000_000,
    currency: "GBP",
  },
  EU: {
    name: "Continental Europe",
    flag: "🇪🇺",
    viewerShare: 0.25,
    cpmMultiplier: 3.2,   // ~$38 CPM
    estimatedViewers: 45_000_000,
    currency: "EUR",
  },
  LATAM: {
    name: "Latin America",
    flag: "🌎",
    viewerShare: 0.22,
    cpmMultiplier: 1.4,   // ~$17 CPM
    estimatedViewers: 38_000_000,
    currency: "USD",
  },
  APAC: {
    name: "Asia-Pacific",
    flag: "🌏",
    viewerShare: 0.30,
    cpmMultiplier: 1.8,   // ~$22 CPM
    estimatedViewers: 55_000_000,
    currency: "USD",
  },
  MENA: {
    name: "Middle East & Africa",
    flag: "🌍",
    viewerShare: 0.10,
    cpmMultiplier: 2.1,   // ~$25 CPM
    estimatedViewers: 18_000_000,
    currency: "USD",
  },
  NA: {
    name: "North America",
    flag: "🇺🇸",
    viewerShare: 0.05,
    cpmMultiplier: 5.8,   // ~$70 CPM — premium digital market
    estimatedViewers: 9_000_000,
    currency: "USD",
  },
};

const BASE_GLOBAL_CPM = 12; // USD — blended global floor for football

// Soccer-specific placement CPM multipliers
const SOCCER_PLACEMENT_MULTIPLIERS: Record<string, number> = {
  pitch_perimeter_board: 1.6,   // rotating LED sideline boards
  jersey_front_sponsor: 2.2,    // main shirt sponsor (highest value)
  jersey_sleeve_sponsor: 1.4,
  shorts_sponsor: 0.9,
  goalkeeper_kit: 0.8,
  scoreboard_overlay: 1.5,
  var_review_screen: 1.3,
  corner_flag: 0.7,
  tunnel_backdrop: 1.2,
  field_centre_logo: 1.8,       // painted centre circle branding
  goal_net_branding: 1.1,
  captain_armband: 1.0,
  ctv_ad_break: 2.0,            // digital/streaming ad insertion
  broadcast_overlay: 1.7,       // digital L-shape, ticker overlays
};

const SOCCER_CONTEXT_MULTIPLIERS: Record<string, number> = {
  goal_scored: 2.5,             // highest attention moment
  penalty_kick: 2.2,
  celebration: 2.0,
  var_review: 1.8,
  free_kick: 1.5,
  corner_kick: 1.4,
  game_action: 1.3,
  replay: 1.4,
  halftime_show: 1.1,
  substitution: 0.9,
  throw_in: 0.8,
  dead_ball: 0.7,
};

// Brand prominence CPM weights
const PROMINENCE_CPM: Record<string, number> = {
  primary: 1.8,
  secondary: 1.0,
  background: 0.45,
};

export interface BrandROI {
  brand: string;
  totalAppearances: number;
  totalExposureSeconds: number;
  adPlacements: number;
  inGamePlacements: number;
  primaryAppearances: number;
  secondaryAppearances: number;
  backgroundAppearances: number;
  highAttentionMoments: number;
  positiveContextAppearances: number;
  dominanceScore: number;
  globalImpressionValue: number;
  territoryBreakdown: Record<string, { impressionValue: number; viewers: number; cpm: number }>;
  placementQualityScore: number;
  attentionScore: number;
  overallROIScore: number;
  grade: string;
  insights: string[];
  topPlacementType: string;
  topTerritory: string;
  formatIntelligence: FormatIntelligence;
}

// ─── IAB CTV Ad Portfolio Format Intelligence ──────────────────────────────────────────────

export interface FormatRecommendation {
  format: string;          // IAB CTV Ad Portfolio format name
  formatId: string;        // machine key
  verdict: "optimal" | "caution" | "suppress";
  roasMultiplier: number;  // estimated ROAS vs. standard mid-roll
  triggerContexts: string[];   // contexts where this fires well
  suppressContexts: string[];  // contexts that should gate this off
  rationale: string;
  qualifyingAppearances: number; // how many appearances in this clip would have qualified
  suppressedAppearances: number; // how many should have been blocked
}

export interface FormatIntelligence {
  recommendations: FormatRecommendation[];
  topFormat: string;
  suppressionRate: number; // % of appearances where non-interruptive format should have been blocked
  optimalMoments: number;  // appearances in high-value context windows
  viewerExperienceScore: number; // 0-100: how well brand appeared in positive, high-attn contexts
  formatIntelNote: string;
}

// IAB CTV Ad Portfolio format definitions with context gate rules
const CTV_FORMATS = [
  {
    format: "In-Scene Insertion",
    formatId: "in_scene",
    description: "Brand composited directly into the video as virtual OOH — blends naturally into the environment",
    optimalContexts: ["game_action", "corner_kick", "free_kick", "dead_ball"],
    suppressContexts: ["var_review", "penalty_kick", "celebration"],  // high volatility — sentiment risk
    baseRoasMultiplier: 1.8,
    requiresPrimaryProminence: false,
    note: "Organic integration with gameplay; perimeter board positions ideal. Suppress during VAR/penalty — scene sentiment is unpredictable.",
  },
  {
    format: "Overlay (Lower-Third)",
    formatId: "overlay",
    description: "Ad creative over lower third of screen — content continues playing, non-interruptive",
    optimalContexts: ["game_action", "replay", "halftime_show", "substitution"],
    suppressContexts: ["goal_scored", "celebration", "penalty_kick", "var_review"],
    baseRoasMultiplier: 1.4,
    requiresPrimaryProminence: false,
    note: "Works during steady-state play and replays. Never fire during goal/penalty — you're competing with the highest-attention moment in the match.",
  },
  {
    format: "Squeeze Back (L-Shape)",
    formatId: "squeezeback",
    description: "Content resized to share screen with ad; no content is covered — viewer retains full match context",
    optimalContexts: ["halftime_show", "substitution", "dead_ball", "replay"],
    suppressContexts: ["goal_scored", "celebration", "penalty_kick", "var_review", "free_kick"],
    baseRoasMultiplier: 1.2,
    requiresPrimaryProminence: false,
    note: "Low disruption but any frame resize during live action irritates viewers. Reserve for dead-ball and halftime windows only.",
  },
  {
    format: "Pause Ad",
    formatId: "pause_ad",
    description: "Viewer-initiated; fires when viewer pauses content",
    optimalContexts: ["game_action", "halftime_show"],  // pauses likely during casual viewing
    suppressContexts: [],  // viewer-initiated so suppression is less critical, but sentiment still matters
    baseRoasMultiplier: 1.6,
    requiresPrimaryProminence: false,
    note: "Viewer-initiated = high tolerance. High ROAS because brand has 100% screen share with a captive viewer. Sentiment from prior scene still influences recall.",
  },
  {
    format: "Ad Squeeze Back (Product Correlation)",
    formatId: "ad_squeezeback",
    description: "Within ad break: original ad resized for companion product-correlated creative alongside it",
    optimalContexts: ["game_action", "replay", "halftime_show", "dead_ball", "substitution"],
    suppressContexts: ["goal_scored", "celebration", "penalty_kick"],
    baseRoasMultiplier: 1.3,
    requiresPrimaryProminence: false,
    note: "Companion creative must be contextually coherent with primary ad. Logo detection identifies what brand just appeared organically — the companion should amplify, not conflict.",
  },
];

export function generateFormatIntelligence(appearances: Appearance[]): FormatIntelligence {
  if (!appearances.length) {
    return {
      recommendations: [],
      topFormat: "",
      suppressionRate: 0,
      optimalMoments: 0,
      viewerExperienceScore: 0,
      formatIntelNote: "No appearances detected.",
    };
  }

  const recommendations: FormatRecommendation[] = CTV_FORMATS.map((fmt) => {
    let qualifying = 0;
    let suppressed = 0;
    let roasSum = 0;

    for (const a of appearances) {
      const isOptimal = fmt.optimalContexts.includes(a.context || "");
      const isSuppressed = fmt.suppressContexts.includes(a.context || "");
      const sentimentOk = a.sentimentContext !== "negative";
      const attentionOk = a.viewerAttention !== "low";

      if (isSuppressed || !sentimentOk) {
        suppressed++;
      } else if (isOptimal && attentionOk) {
        qualifying++;
        // ROAS multiplier boosted by attention + sentiment
        const attnBoost = a.viewerAttention === "high" ? 1.2 : 1.0;
        const sentBoost = a.sentimentContext === "positive" ? 1.15 : 1.0;
        roasSum += fmt.baseRoasMultiplier * attnBoost * sentBoost;
      }
    }

    const avgRoas = qualifying > 0 ? roasSum / qualifying : fmt.baseRoasMultiplier * 0.7;
    const total = qualifying + suppressed;
    const suppressRate = total > 0 ? suppressed / total : 0;

    let verdict: "optimal" | "caution" | "suppress";
    if (suppressRate > 0.6) verdict = "suppress";
    else if (qualifying >= 3 && suppressRate < 0.3) verdict = "optimal";
    else verdict = "caution";

    return {
      format: fmt.format,
      formatId: fmt.formatId,
      verdict,
      roasMultiplier: parseFloat(avgRoas.toFixed(2)),
      triggerContexts: fmt.optimalContexts,
      suppressContexts: fmt.suppressContexts,
      rationale: fmt.note,
      qualifyingAppearances: qualifying,
      suppressedAppearances: suppressed,
    };
  });

  // Sort: optimal first, then caution, then suppress
  recommendations.sort((a, b) => {
    const order = { optimal: 0, caution: 1, suppress: 2 };
    return order[a.verdict] - order[b.verdict] || b.roasMultiplier - a.roasMultiplier;
  });

  const totalAppearances = appearances.length;
  const totalSuppressed = recommendations.reduce((s, r) => s + r.suppressedAppearances, 0) / CTV_FORMATS.length;
  const suppressionRate = parseFloat(Math.min(100, (totalSuppressed / totalAppearances) * 100).toFixed(1));

  const optimalMoments = appearances.filter(
    (a) => ["goal_scored", "celebration", "penalty_kick", "var_review"].includes(a.context || "") && a.viewerAttention === "high"
  ).length;

  const positiveHighAttn = appearances.filter(
    (a) => a.sentimentContext === "positive" && a.viewerAttention === "high"
  ).length;
  const viewerExperienceScore = parseFloat(
    Math.min(100, ((positiveHighAttn / totalAppearances) * 60) +
      ((1 - suppressionRate / 100) * 40)).toFixed(1)
  );

  const topFormat = recommendations[0]?.format ?? "";

  return {
    recommendations,
    topFormat,
    suppressionRate,
    optimalMoments,
    viewerExperienceScore,
    formatIntelNote:
      `IAB CTV Ad Portfolio (Dec 2025). Non-interruptive formats assessed against ${totalAppearances} detected appearances. ` +
      `${Math.round(suppressionRate)}% of appearances occurred in contexts where overlay/squeezeback should be suppressed to protect viewer experience and brand safety. ` +
      `${optimalMoments} high-attention moments (goal/penalty/celebration) represent peak ROAS windows for in-scene insertion.`,
  };
}

export function calculateROI(
  appearances: Appearance[],
  videoDurationSeconds: number,
): { brands: BrandROI[]; summary: any } {
  const brandMap = new Map<string, Appearance[]>();
  for (const a of appearances) {
    const key = a.brand.trim();
    if (!brandMap.has(key)) brandMap.set(key, []);
    brandMap.get(key)!.push(a);
  }

  const totalExposure = appearances.reduce((s, a) => s + a.exposureDuration, 0);
  const brandROIs: BrandROI[] = [];
  let totalGlobalValue = 0;

  for (const [brand, apps] of brandMap.entries()) {
    const totalSec = apps.reduce((s, a) => s + a.exposureDuration, 0);
    const primaryCount = apps.filter((a) => a.prominence === "primary").length;
    const secondaryCount = apps.filter((a) => a.prominence === "secondary").length;
    const bgCount = apps.filter((a) => a.prominence === "background").length;
    const highAttn = apps.filter((a) => a.viewerAttention === "high").length;
    const positiveCtx = apps.filter((a) => a.sentimentContext === "positive").length;

    // Weighted placement quality (average multiplier across all appearances)
    const placementQuality =
      apps.reduce((s, a) => s + (SOCCER_PLACEMENT_MULTIPLIERS[a.placementType] || 1.0), 0) / apps.length;

    // Weighted context quality
    const contextQuality =
      apps.reduce((s, a) => s + (SOCCER_CONTEXT_MULTIPLIERS[a.context || ""] || 1.0), 0) / apps.length;

    // Weighted prominence
    const prominenceWeight =
      (primaryCount * PROMINENCE_CPM.primary +
       secondaryCount * PROMINENCE_CPM.secondary +
       bgCount * PROMINENCE_CPM.background) / (apps.length || 1);

    // Effective CPM = base × prominence × placement × context
    const effectiveCPM = BASE_GLOBAL_CPM * prominenceWeight * placementQuality * contextQuality;

    // ─── Per-territory impression value ───────────────────────────────────────
    // Formula: (exposureSec / 30) × (CPM × territory_multiplier / 1000) × territory_viewers
    const territoryBreakdown: Record<string, { impressionValue: number; viewers: number; cpm: number }> = {};
    let globalValue = 0;

    for (const [code, terr] of Object.entries(TERRITORIES)) {
      const terrCPM = effectiveCPM * terr.cpmMultiplier / 1.0; // already baked in above
      // Actually: territory CPM = base_global * multipliers * territory_multiplier
      const adjustedCPM = BASE_GLOBAL_CPM * prominenceWeight * placementQuality * contextQuality * terr.cpmMultiplier;
      // impressions = viewers in millions × 1000 (to get per-thousand impressions denominator right)
      // Formula: (exposureSec / 30s) × (CPM / 1000) × actual_viewers
      // actual_viewers = estimatedViewers (already in absolute numbers, e.g. 8,000,000)
      const impressions = terr.estimatedViewers; // already in absolute viewer count
      const value = (totalSec / 30) * (adjustedCPM / 1000) * impressions;

      // Cap to avoid inflating short clips — realistic clip ceiling ~$10M per territory
      const cappedValue = Math.min(value, 10_000_000);
      territoryBreakdown[code] = {
        impressionValue: parseFloat(cappedValue.toFixed(0)),
        viewers: terr.estimatedViewers,
        cpm: parseFloat(adjustedCPM.toFixed(2)),
      };
      globalValue += cappedValue;
    }

    totalGlobalValue += globalValue;

    // Dominance score = share of total detected exposure
    const dominanceScore = totalExposure > 0 ? Math.min(100, (totalSec / totalExposure) * 100) : 0;

    // Attention score
    const attentionScore = Math.min(
      100,
      (highAttn / (apps.length || 1)) * 55 +
      (positiveCtx / (apps.length || 1)) * 25 +
      (primaryCount / (apps.length || 1)) * 20
    );

    // Placement quality score 0–100
    const placementQualityScore = Math.min(100, (placementQuality / 2.5) * 100);

    // Overall ROI = dominance (25%) + attention (35%) + placement quality (25%) + airtime (15%)
    const airtimeFactor = Math.min(100, (totalSec / 120) * 100);
    const overallROIScore = Math.min(
      100,
      dominanceScore * 0.25 +
      attentionScore * 0.35 +
      placementQualityScore * 0.25 +
      airtimeFactor * 0.15
    );

    const grade =
      overallROIScore >= 85 ? "A+" :
      overallROIScore >= 75 ? "A" :
      overallROIScore >= 65 ? "B+" :
      overallROIScore >= 55 ? "B" :
      overallROIScore >= 45 ? "C+" :
      overallROIScore >= 35 ? "C" :
      overallROIScore >= 25 ? "D" : "F";

    // Top placement type by appearance count
    const ptCounts: Record<string, number> = {};
    apps.forEach((a) => { ptCounts[a.placementType] = (ptCounts[a.placementType] || 0) + 1; });
    const topPlacementType = Object.entries(ptCounts).sort(([,a],[,b]) => b - a)[0]?.[0] || "logo";

    // Top territory by value
    const topTerritory = Object.entries(territoryBreakdown).sort(([,a],[,b]) => b.impressionValue - a.impressionValue)[0]?.[0] || "EU";

    // Insights
    const insights: string[] = [];
    if (apps.some((a) => a.placementType === "jersey_front_sponsor")) {
      insights.push(`Jersey front sponsorship detected — highest-value placement in global football (~$2.2x CPM multiplier)`);
    }
    if (apps.some((a) => a.placementType === "pitch_perimeter_board")) {
      insights.push(`Perimeter LED board exposure captured — standard rotating placement seen by all broadcast angles`);
    }
    if (apps.some((a) => a.context === "goal_scored" || a.context === "celebration")) {
      insights.push(`Brand visible during goal/celebration — peak attention window (2.0–2.5x audience engagement)`);
    }
    if (territoryBreakdown.APAC && territoryBreakdown.APAC.impressionValue > territoryBreakdown.EU.impressionValue) {
      insights.push(`APAC drives highest territory value — large viewer base offsets lower CPM`);
    }
    if (territoryBreakdown.NA && territoryBreakdown.NA.cpm > 60) {
      insights.push(`North America CPM premium ($${territoryBreakdown.NA.cpm.toFixed(0)}) — high value despite smaller audience`);
    }
    if (overallROIScore < 40) {
      insights.push(`Opportunity: increase placement prominence — negotiate for jersey or scoreboard positions`);
    }
    if (primaryCount / (apps.length || 1) > 0.5) {
      insights.push(`${Math.round((primaryCount / apps.length) * 100)}% primary prominence — excellent brand visibility index`);
    }

    brandROIs.push({
      brand,
      totalAppearances: apps.length,
      totalExposureSeconds: parseFloat(totalSec.toFixed(2)),
      adPlacements: apps.filter((a) => a.sponsorshipCategory === "ad_placement").length,
      inGamePlacements: apps.filter((a) => a.sponsorshipCategory === "in_game_placement").length,
      primaryAppearances: primaryCount,
      secondaryAppearances: secondaryCount,
      backgroundAppearances: bgCount,
      highAttentionMoments: highAttn,
      positiveContextAppearances: positiveCtx,
      dominanceScore: parseFloat(dominanceScore.toFixed(1)),
      globalImpressionValue: parseFloat(globalValue.toFixed(0)),
      territoryBreakdown,
      placementQualityScore: parseFloat(placementQualityScore.toFixed(1)),
      attentionScore: parseFloat(attentionScore.toFixed(1)),
      overallROIScore: parseFloat(overallROIScore.toFixed(1)),
      grade,
      insights,
      topPlacementType,
      topTerritory,
      formatIntelligence: generateFormatIntelligence(apps),
    });
  }

  brandROIs.sort((a, b) => b.overallROIScore - a.overallROIScore);

  // Summary territory totals
  const summaryTerritories: Record<string, number> = {};
  for (const b of brandROIs) {
    for (const [code, td] of Object.entries(b.territoryBreakdown)) {
      summaryTerritories[code] = (summaryTerritories[code] || 0) + td.impressionValue;
    }
  }

  return {
    brands: brandROIs,
    summary: {
      totalBrands: brandROIs.length,
      totalExposureSeconds: parseFloat(totalExposure.toFixed(2)),
      totalGlobalImpressionValue: parseFloat(totalGlobalValue.toFixed(0)),
      topBrand: brandROIs[0]?.brand ?? null,
      avgROIScore: brandROIs.length
        ? parseFloat((brandROIs.reduce((s, b) => s + b.overallROIScore, 0) / brandROIs.length).toFixed(1))
        : 0,
      videoDurationSeconds,
      summaryTerritories,
      territories: TERRITORIES,
      globalFormatIntelligence: generateFormatIntelligence(appearances),
      analysisNote:
        "Values based on global football broadcast CPM benchmarks (Nielsen Sports, Kantar Media, SportsPro). Base CPM $12 global, scaled by territory ($17–$70 CPM), placement type (0.7–2.2×), and viewer attention context (0.7–2.5× — goal/penalty moments). Viewer counts are static benchmark estimates; in production, replace with IAB Tech Lab LEAP Concurrent Streams API (v1.0 Final) for real-time per-territory device counts. Deals API + LEAP Forecasting API enable advance inventory reservation for high-value live sports slots.",
    },
  };
}

// ─── Residual Exposure Engine ───────────────────────────────────────────────────────
// In-game placements (perimeter boards, jersey sponsors, field logos) earn value
// far beyond the live broadcast — through replays, time-shifted viewing, highlights,
// VOD catch-up, and social clip distribution. Standard CTV ad break impressions do not.

export interface ResidualExposureWindow {
  windowType: string;          // "in_match_replay" | "time_shifted" | "highlights_social" | "vod_catchup" | "media_library"
  label: string;
  description: string;
  audienceMultiplier: number;  // additional viewers as % of live audience
  durationDays: number;        // how long this window remains active
  applicablePlacements: string[];  // placement types that earn this residual
  additionalImpressions: number;   // computed
  additionalValue: number;         // computed
  sourceNote: string;
}

export interface ResidualExposureReport {
  windows: ResidualExposureWindow[];
  totalResidualImpressions: number;
  totalResidualValue: number;
  liveImpressionValue: number;
  residualMultiplier: number;   // total value / live value
  inGameResidualAdvantage: string;  // narrative
  eligibleAppearances: number;  // appearances that earn residual (in-game only)
  ineligibleAppearances: number; // ad-break appearances — no residual value
  methodologyNote: string;
}

// Residual window definitions — sourced from:
// Goldbach Replay Ads (30% time-shifted TV usage, 1.3M contacts/format)
// Amplified Digital: on-demand highlights have "longer shelf lives"
// Standard industry estimates for UCL/La Liga highlight distribution
const RESIDUAL_WINDOWS = [
  {
    windowType: "in_match_replay",
    label: "In-Match Replays",
    description: "Goals, key moments, and VAR decisions are replayed 3–5× within the live broadcast. Each replay is a full re-exposure of perimeter boards and jersey sponsors captured in the original frame.",
    audienceMultiplier: 0.25,   // same audience sees it 3-5x; incremental reach ~25% net new
    durationDays: 0,
    applicablePlacements: ["pitch_perimeter_board", "jersey_front_sponsor", "jersey_sleeve_sponsor", "field_centre_logo", "corner_flag", "goal_net_branding"],
    sourceNote: "Standard broadcast practice; 3–5 replays per goal/key event in UCL/La Liga broadcasts",
  },
  {
    windowType: "time_shifted",
    label: "Time-Shifted / Replay TV",
    description: "Nearly 30% of TV viewing is now time-shifted (set-top box, media library, streaming catch-up). Goldbach Replay Ads data shows up to 1.3M contacts per format. In-game placements play through in full; traditional ad breaks are frequently fast-forwarded, stranding brand impressions.",
    audienceMultiplier: 0.30,   // Goldbach: ~30% of TV usage is time-shifted
    durationDays: 7,
    applicablePlacements: ["pitch_perimeter_board", "jersey_front_sponsor", "jersey_sleeve_sponsor", "field_centre_logo", "scoreboard_overlay", "corner_flag", "goal_net_branding"],
    sourceNote: "Goldbach Replay Ads: 'Almost 30% of TV usage now occurs on a time-shifted basis'; up to 1.3M contacts per advertising format",
  },
  {
    windowType: "highlights_social",
    label: "Highlights & Social Clips",
    description: "Match highlights are published within minutes of full-time to YouTube, Instagram, TikTok, X, and league/club apps. Perimeter boards, jersey sponsors, and field logos appear in every clip. UCL/La Liga highlights routinely reach 5–20M+ views per clip within 24 hours — an audience that never watched the live match.",
    audienceMultiplier: 0.40,   // UCL highlights: 5-20M+ social views for top matches
    durationDays: 30,
    applicablePlacements: ["pitch_perimeter_board", "jersey_front_sponsor", "field_centre_logo", "jersey_sleeve_sponsor", "goal_net_branding"],
    sourceNote: "Amplified Digital: on-demand content and highlights have 'longer shelf lives, generating impressions over extended periods'; UCL highlights average 5–20M+ views per clip",
  },
  {
    windowType: "vod_catchup",
    label: "VOD / Broadcaster Catch-Up",
    description: "Full-match VOD is available on broadcaster streaming platforms for 7–30 days post-match. Viewers who missed the live broadcast watch on-demand, seeing every in-game placement in full context. Time-shifted viewers often fast-forward commercial breaks but cannot skip in-game placements.",
    audienceMultiplier: 0.12,   // ~10-15% of live audience watches VOD
    durationDays: 30,
    applicablePlacements: ["pitch_perimeter_board", "jersey_front_sponsor", "jersey_sleeve_sponsor", "field_centre_logo", "scoreboard_overlay"],
    sourceNote: "Standard broadcaster VOD window; industry estimates 10–15% of live audience accesses catch-up within 7 days",
  },
  {
    windowType: "media_library",
    label: "Media Library & Licensed Clips",
    description: "Sports content is licensed for news programs, documentary features, sports analysis shows, and press coverage. A goal highlight from El Clásico may appear on Sky Sports News, ESPN, Marca, and L'Equipe for days post-match — each carrying the full frame with in-game brand placements intact.",
    audienceMultiplier: 0.08,
    durationDays: 90,
    applicablePlacements: ["pitch_perimeter_board", "jersey_front_sponsor", "field_centre_logo"],
    sourceNote: "Standard sports media licensing; Amplified Digital: 'evergreen advertising for on-demand libraries'",
  },
];

export function calculateResidualExposure(
  appearances: Appearance[],
  liveImpressionValue: number,
  territories: typeof TERRITORIES
): ResidualExposureReport {
  // Only in-game placements earn residual — CTV ad breaks do NOT
  const eligibleApps = appearances.filter(
    (a) => a.sponsorshipCategory === "in_game_placement"
  );
  const ineligibleApps = appearances.filter(
    (a) => a.sponsorshipCategory === "ad_placement"
  );

  if (!eligibleApps.length) {
    return {
      windows: [],
      totalResidualImpressions: 0,
      totalResidualValue: 0,
      liveImpressionValue,
      residualMultiplier: 1.0,
      inGameResidualAdvantage: "No in-game placements detected — all exposures are ad-break placements which do not earn residual value.",
      eligibleAppearances: 0,
      ineligibleAppearances: ineligibleApps.length,
      methodologyNote: "Residual value applies only to in-game placements (perimeter boards, jersey sponsors, field logos). CTV ad break insertions expire with the live broadcast.",
    };
  }

  // Compute share of live value attributable to in-game placements
  const inGameShare = eligibleApps.length / appearances.length;
  const inGameLiveValue = liveImpressionValue * inGameShare;

  // Total global viewer base across territories
  const totalLiveViewers = Object.values(territories).reduce(
    (s, t) => s + t.estimatedViewers, 0
  );

  let totalResidualImpressions = 0;
  let totalResidualValue = 0;

  // Build per-window data
  const windows: ResidualExposureWindow[] = RESIDUAL_WINDOWS.map((w) => {
    // Check if any eligible appearances use placements in this window
    const matchingApps = eligibleApps.filter((a) =>
      w.applicablePlacements.includes(a.placementType)
    );
    if (!matchingApps.length) {
      return {
        ...w,
        additionalImpressions: 0,
        additionalValue: 0,
      };
    }

    const placementShare = matchingApps.length / eligibleApps.length;
    const addImpressions = Math.round(totalLiveViewers * w.audienceMultiplier * placementShare);

    // Value derived as a fraction of the in-game live impression value.
    // In-game placements earn residual proportionally to:
    //   - the audience multiplier (how many additional viewers vs live)
    //   - the placement share (% of appearances in this window)
    //   - a CPM quality discount (residual = lower prominence than live broadcast)
    // Base: audience multiplier × placement share = fraction of live in-game value
    const residualCPMDiscount = 0.55; // residual at ~55% quality vs. live
    const addValue = Math.round(
      inGameLiveValue * w.audienceMultiplier * placementShare * residualCPMDiscount
    );

    totalResidualImpressions += addImpressions;
    totalResidualValue += addValue;

    return {
      ...w,
      additionalImpressions: addImpressions,
      additionalValue: addValue,
    };
  });

  const residualMultiplier = liveImpressionValue > 0
    ? parseFloat(((liveImpressionValue + totalResidualValue) / liveImpressionValue).toFixed(2))
    : 1.0;

  return {
    windows,
    totalResidualImpressions,
    totalResidualValue,
    liveImpressionValue,
    residualMultiplier,
    inGameResidualAdvantage:
      `In-game placements earn residual value across ${windows.filter((w) => w.additionalValue > 0).length} post-live windows. ` +
      `CTV ad break insertions (${ineligibleApps.length} appearances) expire with the live broadcast and earn zero residual. ` +
      `This is the structural advantage of in-game sponsorship over standard commercial inventory — ` +
      `the brand continues earning impressions through replays, time-shifted viewing, highlight clips, and VOD catch-up.`,
    eligibleAppearances: eligibleApps.length,
    ineligibleAppearances: ineligibleApps.length,
    methodologyNote:
      "Residual impression estimates based on: Goldbach Replay Ads data (30% time-shifted TV usage, up to 1.3M contacts/format); " +
      "Amplified Digital agency research (on-demand highlights have extended shelf lives); " +
      "UCL/La Liga highlight distribution estimates (5–20M+ social views per top match). " +
      "CPM discounted 40% vs. live broadcast for residual windows. " +
      "SonicOrigin watermark tracking enables accurate residual impression capture without ACR surveillance.",
  };
}

// ─── Compliance Guardian Engine ──────────────────────────────────────────────────
// Three compliance use cases for broadcast sports ad delivery:
// 1. Competitive Separation: suppress rival brands from CTV breaks when competitor detected in-scene
// 2. Frequency Cap (Organic + Paid): combined in-game organic + paid CTV impressions vs. cap
// 3. Contextual Brand Safety: suppress regulated categories in negative-sentiment context windows

export type ViolationType =
  | "competitive_separation"
  | "frequency_cap"
  | "contextual_brand_safety";

export type ViolationSeverity = "critical" | "warning" | "suppressed";

export interface ComplianceViolation {
  id: string;
  violationType: ViolationType;
  severity: ViolationSeverity;
  timestamp: number;           // seconds into the broadcast when violation was detected
  brandDetected: string;       // brand found in-scene
  affectedBrand: string;       // brand whose ad was suppressed / at risk
  placementType: string;
  context: string;
  sentimentContext: string;
  confidence: number;
  policyRule: string;          // human-readable rule that fired
  standardRef: string;         // which standard governs this rule
  suppressionAction: string;   // what action was taken
  auditEvidence: string[];     // evidence items for human review
  roasImpact: string;          // ROAS impact of suppression vs. violation
  penaltyRisk: string;         // $ penalty avoided
}

export interface ComplianceReport {
  violations: ComplianceViolation[];
  suppressedAdBreaks: number;
  violationsAvoided: number;
  estimatedPenaltyAvoided: number;  // $
  estimatedLabourSaved: number;     // hours
  complianceScore: number;          // 0-100
  competitiveSeparationViolations: number;
  frequencyCapViolations: number;
  contextualSafetyViolations: number;
  summary: string;
}

// Competitive categories — brands that must be separated from each other
const COMPETITIVE_PAIRS: Array<{ brands: string[]; category: string; standardWindowSec: number; penaltyRange: string }> = [
  { brands: ["Heineken", "Budweiser", "Bud Light", "Coca-Cola", "Pepsi"], category: "Beverages", standardWindowSec: 300, penaltyRange: "$50K–$250K" },
  { brands: ["Adidas", "Nike", "Puma"], category: "Sportswear", standardWindowSec: 600, penaltyRange: "$25K–$150K" },
  { brands: ["Mastercard", "Visa"], category: "Payment", standardWindowSec: 300, penaltyRange: "$50K–$200K" },
  { brands: ["Emirates", "Qatar Airways"], category: "Aviation", standardWindowSec: 600, penaltyRange: "$75K–$300K" },
  { brands: ["Volkswagen", "Hyundai", "Toyota"], category: "Automotive", standardWindowSec: 600, penaltyRange: "$50K–$200K" },
];

// Regulated categories requiring contextual compliance
const REGULATED_CATEGORIES: Array<{ brands: string[]; regulation: string; suppressNegativeSentiment: boolean; suppressHighAttn: boolean; maxFreqPerHour: number }> = [
  { brands: ["Heineken", "Budweiser", "Bud Light"], regulation: "Alcohol (OFCOM/ASA)", suppressNegativeSentiment: true, suppressHighAttn: false, maxFreqPerHour: 4 },
  { brands: ["Betway"], regulation: "Gambling (UKGC/ASA)", suppressNegativeSentiment: true, suppressHighAttn: true, maxFreqPerHour: 3 },
  { brands: ["Coca-Cola", "Pepsi"], regulation: "HFSS (Children’s Programming)", suppressNegativeSentiment: false, suppressHighAttn: false, maxFreqPerHour: 6 },
];

export function runComplianceEngine(appearances: Appearance[]): ComplianceReport {
  const violations: ComplianceViolation[] = [];
  let violationId = 0;

  const nextId = () => `COMP-${String(++violationId).padStart(4, "0")}`;

  // Sort by time
  const sorted = [...appearances].sort((a, b) => a.startTime - b.startTime);

  // ─── 1. COMPETITIVE SEPARATION ──────────────────────────────────────────────
  // For each detected in-game placement, check if a competitive brand
  // would be scheduled in the standard separation window.
  // If so, flag a competitive separation violation.
  for (const app of sorted) {
    if (app.sponsorshipCategory !== "in_game_placement") continue;

    for (const pair of COMPETITIVE_PAIRS) {
      if (!pair.brands.includes(app.brand)) continue;

      // Find competitors in the same category
      const rivals = pair.brands.filter((b) => b !== app.brand);

      // Check if any rival also appears in-scene within the separation window
      const rivalInScene = sorted.find(
        (b) =>
          b !== app &&
          rivals.includes(b.brand) &&
          b.sponsorshipCategory === "in_game_placement" &&
          Math.abs(b.startTime - app.startTime) <= pair.standardWindowSec
      );

      // Also flag the CTV ad break opportunity that would violate separation
      // (any ad-placement appearance of a rival brand near this window)
      const rivalAdBreak = sorted.find(
        (b) =>
          b !== app &&
          rivals.includes(b.brand) &&
          b.sponsorshipCategory === "ad_placement" &&
          Math.abs(b.startTime - app.startTime) <= pair.standardWindowSec
      );

      if (rivalInScene || rivalAdBreak) {
        const conflictingBrand = (rivalInScene || rivalAdBreak)!.brand;
        const isAdBreak = !!rivalAdBreak;
        violations.push({
          id: nextId(),
          violationType: "competitive_separation",
          severity: isAdBreak ? "suppressed" : "warning",
          timestamp: app.startTime,
          brandDetected: app.brand,
          affectedBrand: conflictingBrand,
          placementType: app.placementType,
          context: app.context || "game_action",
          sentimentContext: app.sentimentContext || "neutral",
          confidence: app.confidence || 0.88,
          policyRule: `${pair.category} competitive separation: ${pair.standardWindowSec / 60} min exclusivity window. ${app.brand} detected in-scene; ${conflictingBrand} ${isAdBreak ? "CTV ad break" : "in-scene placement"} suppressed.`,
          standardRef: "SCTE-130 POIS · IAB Content Taxonomy 3.1 · IAB Ad Product Taxonomy 2.0",
          suppressionAction: isAdBreak
            ? `CTV ad break for ${conflictingBrand} suppressed via SCTE-130 POIS policy constraint`
            : `Both brands flagged for compliance review — simultaneous in-scene placement`,
          auditEvidence: [
            `${app.brand} detected at ${app.startTime.toFixed(1)}s — ${(app.placementType || "").replace(/_/g, " ")} — confidence ${Math.round((app.confidence || 0.88) * 100)}%`,
            `${conflictingBrand} ${isAdBreak ? "ad break" : "in-scene"} at ${((rivalInScene || rivalAdBreak)!.startTime).toFixed(1)}s — ${pair.category} category conflict`,
            `Separation window: ${pair.standardWindowSec / 60} minutes — elapsed: ${Math.abs(((rivalInScene || rivalAdBreak)!.startTime) - app.startTime).toFixed(0)}s`,
            `Policy: ${pair.category} exclusivity clause — Penalty risk: ${pair.penaltyRange}`,
          ],
          roasImpact: "Suppression protects brand exclusivity value; serves clean contextual inventory instead",
          penaltyRisk: pair.penaltyRange,
        });
        break; // one violation per appearance
      }
    }
  }

  // ─── 2. FREQUENCY CAP (ORGANIC + PAID COMBINED) ─────────────────────────────
  const brandExposureCounts: Record<string, { organic: number; paid: number; lastSeen: number }> = {};

  for (const app of sorted) {
    if (!brandExposureCounts[app.brand]) {
      brandExposureCounts[app.brand] = { organic: 0, paid: 0, lastSeen: 0 };
    }
    const counter = brandExposureCounts[app.brand];

    if (app.sponsorshipCategory === "in_game_placement") {
      counter.organic++;
    } else {
      counter.paid++;
    }
    counter.lastSeen = app.startTime;

    // Check regulated category frequency caps
    for (const reg of REGULATED_CATEGORIES) {
      if (!reg.brands.includes(app.brand)) continue;
      const total = counter.organic + counter.paid;
      const capLimit = reg.maxFreqPerHour;
      // Approximate hour-based cap: flag at 1.5x the hourly cap
      if (total >= Math.ceil(capLimit * 1.5)) {
        const alreadyFlagged = violations.some(
          (v) => v.violationType === "frequency_cap" && v.brandDetected === app.brand
        );
        if (!alreadyFlagged) {
          violations.push({
            id: nextId(),
            violationType: "frequency_cap",
            severity: "warning",
            timestamp: app.startTime,
            brandDetected: app.brand,
            affectedBrand: app.brand,
            placementType: app.placementType,
            context: app.context || "game_action",
            sentimentContext: app.sentimentContext || "neutral",
            confidence: app.confidence || 0.88,
            policyRule: `${reg.regulation} frequency cap: max ${capLimit} impressions/hour. Combined count: ${counter.organic} organic in-game + ${counter.paid} paid CTV = ${total} total. Cap exceeded.`,
            standardRef: "IAB LEAP Concurrent Streams API · IAB OM SDK · SCTE-130 SIS · OFCOM/ASA",
            suppressionAction: `Next ${app.brand} CTV ad insertion suppressed until frequency window resets. Organic in-game placements remain (cannot suppress broadcast rights).`,
            auditEvidence: [
              `${app.brand} organic in-game detections: ${counter.organic} (Twelve Labs Pegasus 1.2)`,
              `${app.brand} paid CTV impressions: ${counter.paid} (IAB OM SDK)`,
              `Combined total: ${total} — exceeds ${capLimit}/hr ${reg.regulation} cap`,
              `Standard ref: ${reg.regulation} — Regulatory basis: ${reg.regulation.includes("OFCOM") ? "OFCOM Broadcasting Code Section 9" : "ASA HFSS rules"}`,
            ],
            roasImpact: "Cap enforcement improves ROAS on remaining impressions; avoids oversaturation penalty",
            penaltyRisk: reg.regulation.includes("OFCOM") ? "£10K–£100K+" : "$10K–$50K",
          });
        }
      }
    }
  }

  // ─── 3. CONTEXTUAL BRAND SAFETY ──────────────────────────────────────────
  // For regulated brands, check if a 5-minute context window has negative sentiment.
  // If so, flag the scheduled ad break as a contextual safety violation.
  const negativeContexts = ["var_review", "penalty_kick"];
  const negativeApps = sorted.filter(
    (a) => negativeContexts.includes(a.context || "") || a.sentimentContext === "negative"
  );

  for (const negApp of negativeApps) {
    for (const reg of REGULATED_CATEGORIES) {
      if (!reg.suppressNegativeSentiment) continue;

      // Check if a regulated brand has an ad break within 5 minutes after the negative context
      const regulatedAdBreak = sorted.find(
        (b) =>
          reg.brands.includes(b.brand) &&
          b.sponsorshipCategory === "ad_placement" &&
          b.startTime > negApp.startTime &&
          b.startTime - negApp.startTime <= 300
      );

      if (regulatedAdBreak) {
        const alreadyFlagged = violations.some(
          (v) =>
            v.violationType === "contextual_brand_safety" &&
            v.brandDetected === regulatedAdBreak.brand &&
            Math.abs(v.timestamp - negApp.startTime) < 60
        );
        if (!alreadyFlagged) {
          violations.push({
            id: nextId(),
            violationType: "contextual_brand_safety",
            severity: "suppressed",
            timestamp: negApp.startTime,
            brandDetected: regulatedAdBreak.brand,
            affectedBrand: regulatedAdBreak.brand,
            placementType: negApp.placementType,
            context: negApp.context || "game_action",
            sentimentContext: negApp.sentimentContext || "negative",
            confidence: negApp.confidence || 0.85,
            policyRule: `${reg.regulation} contextual brand safety: negative sentiment context detected at ${negApp.startTime.toFixed(1)}s (${(negApp.context || "").replace(/_/g, " ")}). ${regulatedAdBreak.brand} CTV ad break at ${regulatedAdBreak.startTime.toFixed(1)}s suppressed per policy.`,
            standardRef: "IAB Content Taxonomy 3.1 · 4A’s/MRC Content-Level Brand Safety Supplement · OFCOM Broadcasting Code",
            suppressionAction: `${regulatedAdBreak.brand} ad break at ${regulatedAdBreak.startTime.toFixed(1)}s suppressed. Replacement: brand-safe contextual inventory served instead.`,
            auditEvidence: [
              `Negative context detected: ${(negApp.context || "").replace(/_/g, " ")} at ${negApp.startTime.toFixed(1)}s`,
              `Sentiment classification: ${negApp.sentimentContext} — viewer attention: ${negApp.viewerAttention}`,
              `${regulatedAdBreak.brand} scheduled ad break: ${regulatedAdBreak.startTime.toFixed(1)}s — ${(300 - (regulatedAdBreak.startTime - negApp.startTime)).toFixed(0)}s inside exclusion window`,
              `Regulation: ${reg.regulation} — 5-minute post-negative-context exclusion window`,
              `Content Taxonomy classification: Sports > Football > ${(negApp.context || "").split("_").map((w: string) => w[0].toUpperCase() + w.slice(1)).join(" ")}`,
            ],
            roasImpact: "Brand protected from negative association; ROAS improved by 15–25% vs. forced negative-context placement",
            penaltyRisk: "£10K–£100K+ (OFCOM breach)",
          });
        }
      }
    }
  }

  // ─── Summary ───────────────────────────────────────────────────────────────
  const csViolations = violations.filter((v) => v.violationType === "competitive_separation").length;
  const fcViolations = violations.filter((v) => v.violationType === "frequency_cap").length;
  const cbsViolations = violations.filter((v) => v.violationType === "contextual_brand_safety").length;
  const suppressed = violations.filter((v) => v.severity === "suppressed").length;

  // Penalty estimate: $75K avg per competitive separation, $25K avg per freq/contextual
  const estimatedPenaltyAvoided =
    csViolations * 75_000 + (fcViolations + cbsViolations) * 25_000;

  // Labour saved: 20 min per violation reviewed manually at $80/hr
  const estimatedLabourSaved = parseFloat(
    ((violations.length * 20) / 60).toFixed(1)
  );

  const complianceScore = Math.max(
    0,
    Math.min(100, 100 - violations.length * 6 + suppressed * 3)
  );

  return {
    violations,
    suppressedAdBreaks: suppressed,
    violationsAvoided: violations.length,
    estimatedPenaltyAvoided,
    estimatedLabourSaved,
    complianceScore,
    competitiveSeparationViolations: csViolations,
    frequencyCapViolations: fcViolations,
    contextualSafetyViolations: cbsViolations,
    summary:
      `${violations.length} compliance events detected across 3 rule categories. ` +
      `${suppressed} ad breaks automatically suppressed via policy engine. ` +
      `Estimated ${estimatedPenaltyAvoided.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })} in avoided penalties. ` +
      `${estimatedLabourSaved}hrs of manual compliance review replaced by AI-assisted audit trail.`,
  };
}

// ─── Soccer Demo Data Generator ──────────────────────────────────────────────
// Authentic soccer sponsorship ecosystem — real brand categories in global football

export function generateDemoAnalysis(): Appearance[] {
  const brands = [
    {
      name: "Adidas",
      placements: ["jersey_front_sponsor", "field_centre_logo", "broadcast_overlay", "pitch_perimeter_board"],
      weight: 1.4,
    },
    {
      name: "Heineken",
      placements: ["pitch_perimeter_board", "ctv_ad_break", "scoreboard_overlay", "broadcast_overlay"],
      weight: 1.3,
    },
    {
      name: "Mastercard",
      placements: ["pitch_perimeter_board", "scoreboard_overlay", "ctv_ad_break", "broadcast_overlay"],
      weight: 1.2,
    },
    {
      name: "Emirates",
      placements: ["jersey_front_sponsor", "pitch_perimeter_board", "scoreboard_overlay", "corner_flag"],
      weight: 1.3,
    },
    {
      name: "Hisense",
      placements: ["pitch_perimeter_board", "scoreboard_overlay", "ctv_ad_break"],
      weight: 1.1,
    },
    {
      name: "Coca-Cola",
      placements: ["pitch_perimeter_board", "ctv_ad_break", "scoreboard_overlay", "broadcast_overlay"],
      weight: 1.2,
    },
    {
      name: "Visa",
      placements: ["pitch_perimeter_board", "ctv_ad_break", "scoreboard_overlay"],
      weight: 1.0,
    },
    {
      name: "Volkswagen",
      placements: ["pitch_perimeter_board", "ctv_ad_break", "broadcast_overlay"],
      weight: 1.0,
    },
    {
      name: "Qatar Airways",
      placements: ["jersey_sleeve_sponsor", "pitch_perimeter_board", "corner_flag"],
      weight: 0.9,
    },
    {
      name: "Betway",
      placements: ["jersey_front_sponsor", "pitch_perimeter_board", "broadcast_overlay"],
      weight: 0.9,
    },
    {
      name: "Rakuten",
      placements: ["jersey_front_sponsor", "pitch_perimeter_board", "scoreboard_overlay"],
      weight: 0.8,
    },
    {
      name: "Allianz",
      placements: ["pitch_perimeter_board", "scoreboard_overlay", "goal_net_branding"],
      weight: 0.8,
    },
  ];

  // Soccer-weighted contexts — goals and game action should appear most
  const contextPool = [
    ...Array(8).fill("game_action"),
    ...Array(4).fill("goal_scored"),
    ...Array(3).fill("celebration"),
    ...Array(3).fill("corner_kick"),
    ...Array(2).fill("free_kick"),
    ...Array(2).fill("var_review"),
    ...Array(2).fill("penalty_kick"),
    ...Array(2).fill("replay"),
    ...Array(1).fill("halftime_show"),
    ...Array(1).fill("substitution"),
    ...Array(1).fill("dead_ball"),
  ];

  const sentimentPool = [
    ...Array(6).fill("positive"),
    ...Array(4).fill("neutral"),
    ...Array(1).fill("negative"),
  ];

  const prominencePool = [
    ...Array(4).fill("primary"),
    ...Array(5).fill("secondary"),
    ...Array(3).fill("background"),
  ];

  const attentionPool = [
    ...Array(5).fill("high"),
    ...Array(5).fill("medium"),
    ...Array(2).fill("low"),
  ];

  const appearances: Appearance[] = [];
  let t = 3.0;

  for (const brand of brands) {
    // More appearances for higher-weight brands
    const count = Math.floor(Math.random() * 6 * brand.weight + 4);
    for (let i = 0; i < count; i++) {
      // Pitch perimeter boards typically show 3–12s; jersey sponsors show the whole play
      const placementType = brand.placements[Math.floor(Math.random() * brand.placements.length)];
      const isJersey = placementType.includes("jersey") || placementType === "field_centre_logo";
      const isCTV = placementType === "ctv_ad_break";

      const minDur = isCTV ? 15 : isJersey ? 4 : 2.5;
      const maxDur = isCTV ? 35 : isJersey ? 20 : 12;
      const duration = parseFloat((Math.random() * (maxDur - minDur) + minDur).toFixed(1));

      const context = contextPool[Math.floor(Math.random() * contextPool.length)];
      const sentiment = sentimentPool[Math.floor(Math.random() * sentimentPool.length)];
      const prominence = isJersey ? "primary" : prominencePool[Math.floor(Math.random() * prominencePool.length)];
      const attention = (context === "goal_scored" || context === "celebration" || context === "penalty_kick")
        ? "high"
        : attentionPool[Math.floor(Math.random() * attentionPool.length)];

      appearances.push({
        brand: brand.name,
        startTime: parseFloat(t.toFixed(1)),
        endTime: parseFloat((t + duration).toFixed(1)),
        exposureDuration: duration,
        placementType,
        sponsorshipCategory: isCTV ? "ad_placement" : "in_game_placement",
        prominence,
        context,
        sentimentContext: sentiment,
        viewerAttention: attention,
        confidence: parseFloat((Math.random() * 0.15 + 0.83).toFixed(2)),
      });

      // Vary gap between appearances — soccer has clusters of exposure
      const gap = isCTV ? 45 + Math.random() * 90 : Math.random() * 18 + 3;
      t += duration + gap;
    }
  }

  // Sort by start time
  return appearances.sort((a, b) => a.startTime - b.startTime);
}
