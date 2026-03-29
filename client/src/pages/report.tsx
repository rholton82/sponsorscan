import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import AppShell from "@/components/AppShell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  ArrowLeft, Clock, Eye, DollarSign, TrendingUp,
  BarChart3, Globe, AlertTriangle,
} from "lucide-react";
import { Link } from "wouter";

// ─── Constants ────────────────────────────────────────────────────────────────
const BRAND_COLORS = [
  "#3b9eff", "#f59e0b", "#10b981", "#a78bfa",
  "#f87171", "#34d399", "#fb923c", "#e879f9",
  "#22d3ee", "#facc15", "#4ade80", "#f472b6",
];

const TERRITORY_META: Record<string, { name: string; flag: string; color: string }> = {
  UK:    { name: "United Kingdom",      flag: "🇬🇧", color: "#3b9eff" },
  EU:    { name: "Continental Europe",  flag: "🇪🇺", color: "#10b981" },
  LATAM: { name: "Latin America",       flag: "🌎", color: "#f59e0b" },
  APAC:  { name: "Asia-Pacific",        flag: "🌏", color: "#a78bfa" },
  MENA:  { name: "Middle East & Africa",flag: "🌍", color: "#f87171" },
  NA:    { name: "North America",       flag: "🇺🇸", color: "#34d399" },
};

const PLACEMENT_LABELS: Record<string, string> = {
  pitch_perimeter_board: "Perimeter Board",
  jersey_front_sponsor: "Jersey Front",
  jersey_sleeve_sponsor: "Jersey Sleeve",
  shorts_sponsor: "Shorts Sponsor",
  field_centre_logo: "Centre Circle",
  scoreboard_overlay: "Scoreboard",
  var_review_screen: "VAR Screen",
  corner_flag: "Corner Flag",
  goal_net_branding: "Goal Net",
  tunnel_backdrop: "Tunnel Backdrop",
  ctv_ad_break: "CTV / Ad Break",
  broadcast_overlay: "Broadcast Overlay",
  captain_armband: "Captain Armband",
  logo: "Logo",
  stadium_signage: "Stadium Signage",
};

const CONTEXT_LABELS: Record<string, string> = {
  goal_scored: "Goal Scored",
  celebration: "Celebration",
  penalty_kick: "Penalty Kick",
  var_review: "VAR Review",
  free_kick: "Free Kick",
  corner_kick: "Corner Kick",
  game_action: "Open Play",
  replay: "Replay",
  halftime_show: "Half-Time",
  substitution: "Substitution",
  dead_ball: "Dead Ball",
  timeout: "Timeout",
  commercial_break: "Ad Break",
};

// ─── Formatters ───────────────────────────────────────────────────────────────
function fmtMoney(n: number) {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}
function fmtSec(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}
function fmtMillions(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}B`;
  return `${n}M`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function GradeChip({ grade }: { grade: string }) {
  const cls =
    grade.startsWith("A") ? "grade-a" :
    grade.startsWith("B") ? "grade-b" :
    grade.startsWith("C") ? "grade-c" :
    grade.startsWith("D") ? "grade-d" : "grade-f";
  return (
    <span className={`inline-flex items-center justify-center w-10 h-10 rounded-lg text-base font-bold shrink-0 ${cls}`}>
      {grade}
    </span>
  );
}

function ROIBar({ value }: { value: number }) {
  const pct = Math.min(100, value);
  const color = pct >= 75 ? "bg-green-500" : pct >= 50 ? "bg-blue-500" : pct >= 30 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
      <div className={`h-full ${color} progress-fill rounded-full`} style={{ width: `${pct}%` }} />
    </div>
  );
}

// Custom tooltip for charts
function DarkTooltip(props: any) {
  return (
    <div style={{
      background: "hsl(222 40% 10%)",
      border: "1px solid hsl(222 25% 18%)",
      borderRadius: 6,
      padding: "6px 10px",
      fontSize: 11,
      color: "hsl(210 40% 92%)",
    }}>
      {props.label && <div style={{ fontWeight: 600, marginBottom: 4 }}>{props.label}</div>}
      {props.payload?.map((p: any) => (
        <div key={p.name} style={{ color: p.color, marginBottom: 2 }}>
          {p.name}: {typeof p.value === "number" && p.value > 1000 ? fmtMoney(p.value) : p.value}
        </div>
      ))}
    </div>
  );
}

// ─── Main Report Page ─────────────────────────────────────────────────────────
export default function ReportPage() {
  const { id } = useParams<{ id: string }>();
  const videoId = parseInt(id!);

  const { data, isLoading } = useQuery<any>({
    queryKey: ["/api/videos", videoId, "report"],
    queryFn: () => apiRequest("GET", `/api/videos/${videoId}/report`),
  });

  if (isLoading) {
    return (
      <AppShell>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <div key={i} className="shimmer rounded-lg h-24" />)}
        </div>
      </AppShell>
    );
  }

  if (!data || !data.roi) {
    return (
      <AppShell>
        <div className="text-center py-12 text-muted-foreground">No report available. Run analysis first.</div>
      </AppShell>
    );
  }

  const { video, roi, appearances, report } = data;
  const { brands, summary } = roi;

  // ── Chart data ──────────────────────────────────────────────────────────────
  const topBrands = brands.slice(0, 10);

  const pieData = topBrands.map((b: any) => ({
    name: b.brand,
    value: parseFloat(b.totalExposureSeconds.toFixed(1)),
  }));

  const valueBarData = topBrands.map((b: any) => ({
    name: b.brand,
    value: parseFloat((b.globalImpressionValue / 1_000_000).toFixed(2)),
  }));

  // Timeline: bucket appearances by 30s
  const buildTimeline = () => {
    if (!appearances?.length) return [];
    const allBrands = [...new Set(appearances.map((a: any) => a.brand))] as string[];
    const bucketSize = 30;
    const buckets: Record<number, Record<string, number>> = {};
    appearances.forEach((a: any) => {
      const bucket = Math.floor(a.startTime / bucketSize) * bucketSize;
      if (!buckets[bucket]) {
        buckets[bucket] = {};
        allBrands.forEach((b: string) => { buckets[bucket][b] = 0; });
      }
      buckets[bucket][a.brand] = (buckets[bucket][a.brand] || 0) + a.exposureDuration;
    });
    return Object.entries(buckets).sort(([a], [b]) => +a - +b).map(([t, vals]) => ({
      time: `${Math.floor(+t / 60)}'`, ...vals,
    }));
  };
  const timelineData = buildTimeline();
  const topBrandNames = topBrands.map((b: any) => b.brand);

  // Territory data for global bar chart
  const territoryBarData = summary.summaryTerritories
    ? Object.entries(summary.summaryTerritories as Record<string, number>)
        .sort(([, a], [, b]) => b - a)
        .map(([code, value]) => ({
          name: (TERRITORY_META[code]?.flag ?? "") + " " + (TERRITORY_META[code]?.name ?? code),
          code,
          value: parseFloat((value / 1_000_000).toFixed(2)),
          cpm: summary.territories?.[code]
            ? parseFloat((12 * summary.territories[code].cpmMultiplier).toFixed(2))
            : 0,
        }))
    : [];

  // Placement type breakdown
  const placementCounts: Record<string, number> = {};
  appearances?.forEach((a: any) => {
    placementCounts[a.placementType] = (placementCounts[a.placementType] || 0) + 1;
  });
  const placementData = Object.entries(placementCounts)
    .sort(([, a], [, b]) => b - a)
    .map(([type, count]) => ({ type: PLACEMENT_LABELS[type] || type, rawType: type, count }));

  // Context breakdown
  const contextCounts: Record<string, number> = {};
  appearances?.forEach((a: any) => {
    contextCounts[a.context] = (contextCounts[a.context] || 0) + 1;
  });
  const contextData = Object.entries(contextCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)
    .map(([ctx, count]) => ({ name: CONTEXT_LABELS[ctx] || ctx, count }));

  const totalAppearances = appearances?.length || 1;

  return (
    <AppShell>
      {/* Back */}
      <Link href="/">
        <a className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </a>
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-bold text-foreground">Global Sponsorship ROI Report</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            {video?.gameTitle || video?.originalName}
            {video?.broadcastNetwork && ` · ${video.broadcastNetwork}`}
            {video?.gameDate && ` · ${video.gameDate}`}
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs text-muted-foreground">Analyzed {new Date(report?.createdAt).toLocaleDateString()}</div>
          <div className="text-xs text-muted-foreground mt-0.5">Twelve Labs Pegasus 1.2 · Multi-territory CPM model</div>
        </div>
      </div>

      {/* KPI bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {[
          { label: "Brands Detected",   value: summary.totalBrands,                                  icon: Eye,         color: "text-blue-400",   sub: "unique sponsors" },
          { label: "Total Exposure",     value: fmtSec(summary.totalExposureSeconds),                 icon: Clock,       color: "text-amber-400",  sub: "logo airtime" },
          { label: "Global Est. Value",  value: fmtMoney(summary.totalGlobalImpressionValue),         icon: DollarSign,  color: "text-green-400",  sub: "6 territories" },
          { label: "Avg ROI Score",      value: `${summary.avgROIScore}/100`,                         icon: TrendingUp,  color: "text-purple-400", sub: "quality index" },
        ].map((kpi) => (
          <div key={kpi.label} className="stat-card rounded-lg p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{kpi.label}</span>
              <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
            </div>
            <div className={`text-xl font-bold tabular-nums ${kpi.color}`}>{kpi.value}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* Territory mini-bar */}
      {territoryBarData.length > 0 && (
        <div className="stat-card rounded-lg px-4 py-3 mb-4 flex items-center gap-3 flex-wrap">
          <span className="text-xs text-muted-foreground font-medium shrink-0 flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-primary" /> Territories
          </span>
          {territoryBarData.map(({ code, name, value }) => (
            <div key={code} className="flex items-center gap-1.5 shrink-0 text-xs">
              <span>{TERRITORY_META[code]?.flag}</span>
              <span className="text-muted-foreground hidden lg:inline">{TERRITORY_META[code]?.name}</span>
              <span className="font-bold" style={{ color: TERRITORY_META[code]?.color }}>{fmtMoney(value * 1_000_000)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Methodology note */}
      <div className="bg-muted/40 rounded-lg px-3 py-2.5 mb-6 border border-border/30 space-y-2">
        <div className="flex items-start gap-2 text-xs text-foreground/60">
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-400/70" />
          <span>{summary.analysisNote}</span>
        </div>
        <div className="flex flex-wrap gap-1.5 pt-1 border-t border-border/20">
          <span className="text-[10px] text-muted-foreground">Standards:</span>
          {[
            { label: "LEAP Concurrent Streams API", href: "https://iabtechlab.com/standards/leap/" },
            { label: "LEAP Forecasting API", href: "https://iabtechlab.com/standards/leap/" },
            { label: "Deals API v1.0", href: "https://iabtechlab.com/standards/dealsapi/" },
            { label: "CIMM CTV Best Practices", href: "https://cimm-us.org/" },
            { label: "SMPTE OBID", href: "https://www.smpte.org/" },
          ].map((s) => (
            <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer"
              className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-medium">
              {s.label}
            </a>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="brands">
        <TabsList className="mb-4 flex-wrap h-auto gap-1">
          <TabsTrigger value="compliance" className="text-amber-400 data-[state=active]:text-amber-400 data-[state=active]:bg-amber-500/10">
            ⚖ Compliance
          </TabsTrigger>
          <TabsTrigger value="brands">Brand Rankings</TabsTrigger>
          <TabsTrigger value="territories">Global Reach</TabsTrigger>
          <TabsTrigger value="formats">Format Intelligence</TabsTrigger>
          <TabsTrigger value="residual">Residual Exposure</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="placements">Placement Types</TabsTrigger>
          <TabsTrigger value="log">Detection Log</TabsTrigger>
        </TabsList>

        {/* ── Brand Rankings ── */}
        <TabsContent value="brands" className="space-y-4">
          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="stat-card rounded-lg p-4">
              <h3 className="text-sm font-semibold text-foreground mb-3">Exposure Share (seconds)</h3>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={pieData} cx="45%" cy="50%" innerRadius={55} outerRadius={82} paddingAngle={2} dataKey="value">
                    {pieData.map((_: any, i: number) => (
                      <Cell key={i} fill={BRAND_COLORS[i % BRAND_COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend
                    layout="vertical" align="right" verticalAlign="middle"
                    iconSize={8}
                    formatter={(v) => <span className="text-xs text-muted-foreground">{v}</span>}
                  />
                  <Tooltip content={<DarkTooltip />} formatter={(v: number) => [`${v}s`, "Exposure"]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="stat-card rounded-lg p-4">
              <h3 className="text-sm font-semibold text-foreground mb-3">Estimated Global Value ($M)</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={valueBarData} layout="vertical" barSize={12} margin={{ left: 4, right: 36 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 25% 18%)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 9, fill: "hsl(215 20% 52%)" }} tickFormatter={(v) => `$${v}M`} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: "hsl(215 20% 52%)" }} width={84} />
                  <Tooltip formatter={(v: number) => [`$${v}M`, "Est. Global Value"]} contentStyle={{ background: "hsl(222 40% 10%)", border: "1px solid hsl(222 25% 18%)", borderRadius: 6, fontSize: 11 }} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {valueBarData.map((_: any, i: number) => (
                      <Cell key={i} fill={BRAND_COLORS[i % BRAND_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Brand cards */}
          <div className="space-y-3">
            {brands.map((brand: any, i: number) => (
              <BrandCard key={brand.brand} brand={brand} rank={i + 1} color={BRAND_COLORS[i % BRAND_COLORS.length]} />
            ))}
          </div>
        </TabsContent>

        {/* ── Global Reach / Territory ── */}
        <TabsContent value="territories" className="space-y-4">
          <div className="stat-card rounded-lg p-4">
            <h3 className="text-sm font-semibold text-foreground mb-1">Estimated Value by Territory ($M)</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Global football audiences vary sharply in CPM. North America commands the highest per-viewer rate ($~70 CPM)
              while APAC delivers volume — 55M+ viewers at $~22 CPM. The multi-territory model captures the full global impression stack.
            </p>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={territoryBarData} barSize={20} margin={{ top: 4, right: 32, bottom: 4, left: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 25% 18%)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: "hsl(215 20% 52%)" }} />
                <YAxis tick={{ fontSize: 9, fill: "hsl(215 20% 52%)" }} tickFormatter={(v) => `$${v}M`} />
                <Tooltip formatter={(v: number, name: string) => name === "value" ? [`$${v}M`, "Est. Value"] : [`$${v}`, "CPM"]}
                  contentStyle={{ background: "hsl(222 40% 10%)", border: "1px solid hsl(222 25% 18%)", borderRadius: 6, fontSize: 11 }} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {territoryBarData.map(({ code }: any) => (
                    <Cell key={code} fill={TERRITORY_META[code]?.color || "#3b9eff"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Territory detail cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {territoryBarData.map(({ code, value, cpm }: any) => {
              const meta = TERRITORY_META[code];
              const terrInfo = summary.territories?.[code];
              return (
                <div key={code} className="stat-card rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{meta?.flag}</span>
                      <div>
                        <div className="text-sm font-semibold text-foreground">{meta?.name}</div>
                        <div className="text-xs text-muted-foreground">{terrInfo ? fmtMillions(terrInfo.estimatedViewers) + " viewers" : ""}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold" style={{ color: meta?.color }}>{fmtMoney(value * 1_000_000)}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">${cpm} CPM</div>
                    </div>
                  </div>

                  {/* Per-brand territory breakdown for top 3 brands */}
                  <div className="space-y-1 mt-2 pt-2 border-t border-border/30">
                    {brands.slice(0, 4).map((b: any) => {
                      const terrVal = b.territoryBreakdown?.[code]?.impressionValue || 0;
                      const maxVal = Math.max(...brands.slice(0, 4).map((br: any) => br.territoryBreakdown?.[code]?.impressionValue || 0));
                      return (
                        <div key={b.brand} className="flex items-center gap-2 text-xs">
                          <span className="text-muted-foreground w-16 truncate">{b.brand}</span>
                          <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${maxVal > 0 ? (terrVal / maxVal) * 100 : 0}%`, background: meta?.color }} />
                          </div>
                          <span className="text-muted-foreground font-mono w-14 text-right">{fmtMoney(terrVal)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* XR use case callout */}
          <div className="border border-primary/20 bg-primary/5 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Globe className="w-5 h-5 text-primary mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-foreground mb-1">
                  CTV Ad Decisioning Application — ExtremeReach / XR
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  This territory model directly informs XR's omnichannel ad delivery workflow.
                  When Twelve Labs detects a brand's perimeter board or jersey in a specific territory's broadcast feed,
                  XR can apply <strong className="text-foreground">competitive separation</strong> rules
                  (suppressing rival brands via <strong className="text-foreground">SCTE-130 POIS</strong> policy constraints),
                  enforce <strong className="text-foreground">frequency caps</strong> relative to in-game organic exposure
                  already received, and trigger <strong className="text-foreground">contextual DCO</strong> via
                  <strong className="text-foreground"> IAB OpenRTB pod bidding</strong> — dynamically serving creative
                  that amplifies a goal-moment celebration where the brand already appeared organically.
                  Playback is verified by <strong className="text-foreground">SonicOrigin</strong> watermark tokens;
                  measurement follows <strong className="text-foreground">CIMM</strong> best practices and
                  <strong className="text-foreground"> SMPTE OBID</strong> Ad-ID binding.
                  Scene context also gates <strong className="text-foreground">non-interruptive formats</strong> —
                  overlays, squeeze backs, and in-scene insertions from the
                  <strong className="text-foreground"> IAB CTV Ad Portfolio</strong> (Dec 2025) fire or suppress
                  based on match moment, sentiment, and viewer attention detected by Twelve Labs.
                  Firing a squeeze back during a goal celebration costs ROAS; in-scene insertion during open play earns it.
                </p>
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  {[
                    { label: "SCTE-35 Ad Break Signal",      color: "bg-amber-500/10 text-amber-400" },
                    { label: "DVB-TA (EU/UK/MENA)",          color: "bg-amber-500/10 text-amber-400" },
                    { label: "HbbTV Fast Media Switch",      color: "bg-amber-500/10 text-amber-400" },
                    { label: "IAB OpenRTB + VAST",           color: "bg-green-500/10 text-green-400" },
                    { label: "CTV Ad Portfolio Formats",      color: "bg-green-500/10 text-green-400" },
                    { label: "ACIF Creative Identity",        color: "bg-green-500/10 text-green-400" },
                    { label: "IAB LEAP Concurrent Streams",   color: "bg-green-500/10 text-green-400" },
                    { label: "LEAP Forecasting API",           color: "bg-green-500/10 text-green-400" },
                    { label: "Deals API v1.0 (Feb 2026)",      color: "bg-green-500/10 text-green-400" },
                    { label: "SonicOrigin Playback Verify",  color: "bg-purple-500/10 text-purple-400" },
                    { label: "C2PA Content Credentials",     color: "bg-purple-500/10 text-purple-400" },
                    { label: "CIMM CTV Measurement",         color: "bg-orange-500/10 text-orange-400" },
                    { label: "SMPTE OBID Ad-ID Binding",     color: "bg-orange-500/10 text-orange-400" },
                    { label: "Go Addressable ADS",           color: "bg-cyan-500/10 text-cyan-400" },
                    { label: "WIPO Broadcasting Treaty",     color: "bg-rose-500/10 text-rose-400" },
                  ].map((tag) => (
                    <span key={tag.label} className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${tag.color}`}>
                      {tag.label}
                    </span>
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t border-primary/10">
                  <a
                    href="/#/ecosystem"
                    className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                  >
                    View full Standards &amp; Ecosystem Architecture →
                  </a>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ── Compliance Guardian ── */}
        <TabsContent value="compliance">
          <ComplianceTab roi={roi} video={video} />
        </TabsContent>

        {/* ── Format Intelligence ── */}
        <TabsContent value="formats">
          <FormatIntelligenceTab roi={roi} appearances={appearances} />
        </TabsContent>

        {/* ── Residual Exposure ── */}
        <TabsContent value="residual">
          <ResidualExposureTab roi={roi} />
        </TabsContent>

        {/* ── Timeline ── */}
        <TabsContent value="timeline">
          <div className="stat-card rounded-lg p-4 mb-4">
            <h3 className="text-sm font-semibold text-foreground mb-4">Brand Exposure Timeline (per 30-second window)</h3>
            {timelineData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={timelineData} barSize={8} barCategoryGap="15%">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 25% 18%)" />
                  <XAxis dataKey="time" tick={{ fontSize: 9, fill: "hsl(215 20% 52%)" }} interval={2} />
                  <YAxis tick={{ fontSize: 9, fill: "hsl(215 20% 52%)" }} unit="s" />
                  <Tooltip contentStyle={{ background: "hsl(222 40% 10%)", border: "1px solid hsl(222 25% 18%)", borderRadius: 6, fontSize: 11 }} />
                  <Legend iconSize={8} formatter={(v) => <span className="text-xs text-muted-foreground">{v}</span>} />
                  {topBrandNames.map((brandName: string, i: number) => (
                    <Bar key={brandName} dataKey={brandName} stackId="a" fill={BRAND_COLORS[i % BRAND_COLORS.length]}
                      radius={i === topBrandNames.length - 1 ? [2, 2, 0, 0] : [0, 0, 0, 0]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">No timeline data</div>
            )}
          </div>

          {/* Context distribution */}
          <div className="stat-card rounded-lg p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">Match Context Distribution</h3>
            <p className="text-xs text-muted-foreground mb-3">
              When brands appeared during the broadcast — high-attention contexts (goals, penalties) command 2–2.5x the CPM multiplier.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {contextData.map(({ name, count }: any) => {
                const pct = Math.round((count / totalAppearances) * 100);
                const isHigh = ["Goal Scored", "Celebration", "Penalty Kick", "VAR Review"].includes(name);
                return (
                  <div key={name} className={`rounded-lg p-2.5 border ${isHigh ? "border-amber-500/30 bg-amber-500/5" : "border-border/30 bg-muted/20"}`}>
                    <div className={`text-xs font-semibold ${isHigh ? "text-amber-400" : "text-foreground"}`}>{name}</div>
                    <div className="text-lg font-bold tabular-nums text-foreground mt-0.5">{count}</div>
                    <div className="text-[10px] text-muted-foreground">{pct}% of appearances</div>
                    {isHigh && <div className="text-[10px] text-amber-400/80 mt-0.5">2.0–2.5x CPM</div>}
                  </div>
                );
              })}
            </div>
          </div>
        </TabsContent>

        {/* ── Placement Types ── */}
        <TabsContent value="placements">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Placement distribution */}
            <div className="stat-card rounded-lg p-4">
              <h3 className="text-sm font-semibold text-foreground mb-3">Placement Distribution</h3>
              <div className="space-y-2">
                {placementData.map(({ type, rawType, count }: any, i: number) => {
                  const total = placementData.reduce((s: number, p: any) => s + p.count, 0);
                  return (
                    <div key={type} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-foreground">{type}</span>
                        <span className="text-muted-foreground font-mono">{count} ({Math.round((count / total) * 100)}%)</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full rounded-full progress-fill"
                          style={{ width: `${(count / total) * 100}%`, background: BRAND_COLORS[i % BRAND_COLORS.length] }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Category + prominence */}
            <div className="space-y-3">
              <div className="stat-card rounded-lg p-4">
                <h3 className="text-sm font-semibold text-foreground mb-3">Category Split</h3>
                {(() => {
                  const adCount = appearances?.filter((a: any) => a.sponsorshipCategory === "ad_placement").length || 0;
                  const igCount = appearances?.filter((a: any) => a.sponsorshipCategory === "in_game_placement").length || 0;
                  const total = adCount + igCount || 1;
                  return (
                    <div className="space-y-3 text-sm">
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-foreground font-medium">In-Game (pitch / jersey)</span>
                          <span className="text-amber-400 font-bold">{igCount} · {Math.round(igCount/total*100)}%</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-amber-400 rounded-full" style={{ width: `${igCount/total*100}%` }} />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-foreground font-medium">Ad Break / CTV / Broadcast</span>
                          <span className="text-blue-400 font-bold">{adCount} · {Math.round(adCount/total*100)}%</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-blue-400 rounded-full" style={{ width: `${adCount/total*100}%` }} />
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground pt-1 border-t border-border/30">
                        In-game placements provide persistent organic exposure across all territory broadcasts simultaneously.
                        CTV ad breaks enable territory-specific dynamic creative and frequency management.
                      </p>
                    </div>
                  );
                })()}
              </div>

              <div className="stat-card rounded-lg p-4">
                <h3 className="text-sm font-semibold text-foreground mb-3">Viewer Attention</h3>
                {(() => {
                  const counts: Record<string, number> = {};
                  appearances?.forEach((a: any) => { counts[a.viewerAttention] = (counts[a.viewerAttention] || 0) + 1; });
                  const total = appearances?.length || 1;
                  return (
                    <div className="space-y-2 text-xs">
                      {[
                        { key: "high", label: "High Attention", color: "bg-amber-400" },
                        { key: "medium", label: "Medium Attention", color: "bg-blue-400" },
                        { key: "low", label: "Low Attention", color: "bg-slate-500" },
                      ].map(({ key, label, color }) => (
                        <div key={key} className="space-y-1">
                          <div className="flex justify-between">
                            <span className="text-foreground">{label}</span>
                            <span className="text-muted-foreground font-mono">{counts[key] || 0} ({Math.round((counts[key] || 0) / total * 100)}%)</span>
                          </div>
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${color}`} style={{ width: `${(counts[key] || 0) / total * 100}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ── Detection Log ── */}
        <TabsContent value="log">
          <div className="stat-card rounded-lg overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">
                All Detected Appearances <span className="text-muted-foreground font-normal">({appearances?.length || 0})</span>
              </h3>
            </div>
            <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm">
                  <tr>
                    {["Time", "Brand", "Placement", "Category", "Prominence", "Context", "Duration", "Conf."].map((h) => (
                      <th key={h} className="px-3 py-2 text-left text-muted-foreground font-medium whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {appearances?.sort((a: any, b: any) => a.startTime - b.startTime).map((a: any, i: number) => (
                    <tr key={i} className="border-b border-border/20 hover:bg-muted/20 transition-colors" data-testid={`row-appearance-${i}`}>
                      <td className="px-3 py-1.5 font-mono text-muted-foreground whitespace-nowrap">{Math.floor(a.startTime/60)}'{String(Math.floor(a.startTime%60)).padStart(2,"0")}</td>
                      <td className="px-3 py-1.5 font-semibold text-foreground whitespace-nowrap">{a.brand}</td>
                      <td className="px-3 py-1.5 text-muted-foreground whitespace-nowrap">{PLACEMENT_LABELS[a.placementType] || a.placementType}</td>
                      <td className="px-3 py-1.5 whitespace-nowrap">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] ${a.sponsorshipCategory === "ad_placement" ? "bg-blue-500/10 text-blue-400" : "bg-amber-500/10 text-amber-400"}`}>
                          {a.sponsorshipCategory === "ad_placement" ? "Ad" : "In-Game"}
                        </span>
                      </td>
                      <td className={`px-3 py-1.5 capitalize whitespace-nowrap ${a.prominence === "primary" ? "text-green-400" : a.prominence === "secondary" ? "text-blue-400" : "text-muted-foreground"}`}>
                        {a.prominence}
                      </td>
                      <td className="px-3 py-1.5 text-muted-foreground whitespace-nowrap">{CONTEXT_LABELS[a.context] || a.context || "—"}</td>
                      <td className="px-3 py-1.5 text-right font-mono text-muted-foreground whitespace-nowrap">{a.exposureDuration.toFixed(1)}s</td>
                      <td className="px-3 py-1.5 text-right font-mono text-muted-foreground/70 whitespace-nowrap">{a.confidence ? `${Math.round(a.confidence * 100)}%` : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}

// ─── Brand Card ───────────────────────────────────────────────────────────────



// ─── Compliance Guardian Tab ──────────────────────────────────────────────────

const VIOLATION_META: Record<string, { label: string; color: string; bg: string; border: string; icon: string }> = {
  competitive_separation: { label: "Competitive Separation", color: "text-blue-400",  bg: "bg-blue-500/10",  border: "border-blue-500/30",  icon: "⚡" },
  frequency_cap:          { label: "Frequency Cap",          color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/30", icon: "📊" },
  contextual_brand_safety:{ label: "Contextual Brand Safety",color: "text-red-400",   bg: "bg-red-500/10",   border: "border-red-500/30",   icon: "🛡" },
};

const SEVERITY_META: Record<string, { label: string; color: string }> = {
  suppressed: { label: "Suppressed",     color: "text-green-400" },
  warning:    { label: "Flagged",        color: "text-amber-400" },
  critical:   { label: "Critical",       color: "text-red-400" },
};

function ComplianceTab({ roi, video }: { roi: any; video: any }) {
  const cr = roi?.summary?.complianceReport;
  if (!cr) {
    return <div className="text-sm text-muted-foreground py-8 text-center">No compliance data available.</div>;
  }

  const totalV = cr.violations?.length ?? 0;

  return (
    <div className="space-y-4">
      {/* Track badge */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10">
          <span className="text-amber-400 text-sm font-bold">✅ Compliance Guardian</span>
          <span className="text-[10px] text-amber-400/70 font-mono">Twelve Labs Hackathon Track</span>
        </div>
        <div className="text-xs text-muted-foreground">
          Explainable AI compliance decisions with full audit trail — flags violations with timestamp, confidence, policy rule, and suppression action
        </div>
      </div>

      {/* KPI bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Compliance Score",    value: `${cr.complianceScore}/100`,
            color: cr.complianceScore >= 75 ? "text-green-400" : cr.complianceScore >= 50 ? "text-amber-400" : "text-red-400" },
          { label: "Violations Detected", value: totalV,                                    color: totalV > 0 ? "text-amber-400" : "text-green-400" },
          { label: "Breaks Suppressed",   value: cr.suppressedAdBreaks,                     color: "text-green-400" },
          { label: "Penalty Risk Avoided",value: `$${(cr.estimatedPenaltyAvoided/1000).toFixed(0)}K`, color: "text-green-400" },
        ].map((k) => (
          <div key={k.label} className="stat-card rounded-lg p-3">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{k.label}</div>
            <div className={`text-xl font-bold tabular-nums ${k.color}`}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Category breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { key: "competitive_separation", count: cr.competitiveSeparationViolations,  description: "Rival brands detected within contractual exclusivity window — CTV ad breaks suppressed via SCTE-130 POIS" },
          { key: "frequency_cap",          count: cr.frequencyCapViolations,           description: "Combined organic in-game + paid CTV impressions exceeded regulated category hourly cap (OFCOM/ASA)" },
          { key: "contextual_brand_safety",count: cr.contextualSafetyViolations,       description: "Regulated brand ad break scheduled within 5-min negative-sentiment window — suppressed per OFCOM Broadcasting Code" },
        ].map(({ key, count, description }) => {
          const meta = VIOLATION_META[key];
          return (
            <div key={key} className={`rounded-lg border p-4 ${meta.border} ${meta.bg}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{meta.icon}</span>
                  <span className={`text-xs font-bold ${meta.color}`}>{meta.label}</span>
                </div>
                <span className={`text-2xl font-bold tabular-nums ${meta.color}`}>{count}</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">{description}</p>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="stat-card rounded-lg p-4 border-l-2 border-amber-500/50">
        <p className="text-xs text-muted-foreground leading-relaxed">{cr.summary}</p>
        <div className="flex flex-wrap gap-2 mt-2 text-[10px] text-muted-foreground">
          <span>Labour saved: <strong className="text-foreground">{cr.estimatedLabourSaved}hrs</strong> manual review</span>
          <span>·</span>
          <span>Penalty avoided: <strong className="text-green-400">${(cr.estimatedPenaltyAvoided).toLocaleString()}</strong></span>
          <span>·</span>
          <span>Standards: <strong className="text-foreground">SCTE-130 · IAB Content Tax 3.1 · OFCOM · 4A's/MRC</strong></span>
        </div>
      </div>

      {/* Violation audit log */}
      {totalV > 0 ? (
        <div className="stat-card rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">
              Audit Log <span className="text-muted-foreground font-normal">({totalV} events)</span>
            </h3>
            <span className="text-[10px] text-muted-foreground">Exportable for legal review · MAM/DAM integration ready</span>
          </div>
          <div className="divide-y divide-border/20 max-h-[560px] overflow-y-auto">
            {cr.violations.map((v: any) => {
              const vm = VIOLATION_META[v.violationType];
              const sm = SEVERITY_META[v.severity];
              const timeStr = `${Math.floor(v.timestamp/60)}'${String(Math.floor(v.timestamp%60)).padStart(2,'0')}`;
              return (
                <div key={v.id} className="p-4 hover:bg-muted/10 transition-colors" data-testid={`violation-${v.id}`}>
                  <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono text-muted-foreground">{v.id}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${vm.bg} ${vm.color}`}>
                        {vm.icon} {vm.label}
                      </span>
                      <span className={`text-[10px] font-bold ${sm.color}`}>{sm.label}</span>
                      <span className="text-xs text-muted-foreground font-mono">{timeStr}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs shrink-0">
                      <span className="text-muted-foreground">Conf: <span className="text-foreground font-mono">{Math.round(v.confidence * 100)}%</span></span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${v.severity === 'suppressed' ? 'bg-green-500/10 text-green-400' : 'bg-amber-500/10 text-amber-400'}`}>
                        {v.severity === 'suppressed' ? '✓ Auto-suppressed' : '⚠ Flagged for review'}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <div className="text-[11px]">
                        <span className="text-muted-foreground">Detected: </span>
                        <strong className="text-foreground">{v.brandDetected}</strong>
                        {v.affectedBrand !== v.brandDetected && (
                          <span> → suppressed <strong className="text-foreground">{v.affectedBrand}</strong></span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">{v.policyRule}</p>
                      <div className="text-[10px] text-primary">{v.suppressionAction}</div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {v.standardRef.split(' · ').map((s: string) => (
                          <span key={s} className="text-[10px] px-1 py-0.5 rounded bg-muted/60 text-muted-foreground font-mono">{s}</span>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Audit Evidence</div>
                      {v.auditEvidence.map((e: string, i: number) => (
                        <div key={i} className="text-[11px] text-muted-foreground flex items-start gap-1.5">
                          <span className="text-primary shrink-0 mt-0.5">·</span>
                          {e}
                        </div>
                      ))}
                      <div className="text-[10px] mt-1">
                        <span className="text-amber-400 font-medium">Penalty risk avoided: </span>
                        <span className="text-foreground font-mono">{v.penaltyRisk}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="stat-card rounded-lg p-8 text-center">
          <div className="text-4xl mb-3">✅</div>
          <div className="text-sm font-semibold text-green-400 mb-1">No violations detected</div>
          <div className="text-xs text-muted-foreground">All competitive separation, frequency cap, and contextual brand safety rules were satisfied in this broadcast segment.</div>
        </div>
      )}

      {/* Explainability note */}
      <div className="text-xs text-muted-foreground border-t border-border/30 pt-3 space-y-1">
        <p className="font-medium text-foreground">How this satisfies the Compliance Guardian track</p>
        <p>Each violation record includes: timestamp (seconds), detected brand, confidence score, affected brand, specific policy rule fired, governing standard reference, suppression action taken, and structured audit evidence — providing the explainability required for fast human validation and legal defensibility. The compliance engine runs on top of Twelve Labs Pegasus 1.2 multimodal detections, combining visual logo detection with audio context, sentiment analysis, and viewer attention signals.</p>
        <div className="flex flex-wrap gap-2 mt-2">
          {[
            { label: "Competitive Separation → SCTE-130 POIS", href: "https://www.scte.org/" },
            { label: "Frequency Cap → OFCOM Broadcasting Code", href: "https://www.ofcom.org.uk/" },
            { label: "Contextual Safety → 4A's/MRC Brand Safety", href: "https://www.aaaa.org/" },
            { label: "IAB Content Taxonomy 3.1", href: "https://iabtechlab.com/standards/content-taxonomy/" },
          ].map((s) => (
            <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer"
              className="text-[10px] px-1.5 py-0.5 rounded bg-muted/60 text-primary hover:bg-primary/10 transition-colors">
              {s.label} ↗
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Residual Exposure Tab ────────────────────────────────────────────────────

const WINDOW_ICONS: Record<string, string> = {
  in_match_replay:  "🔄",
  time_shifted:     "⏱️",
  highlights_social: "📱",
  vod_catchup:      "🎬",
  media_library:    "📺",
};

const WINDOW_COLORS: Record<string, string> = {
  in_match_replay:   "border-blue-500/30 bg-blue-500/5",
  time_shifted:      "border-teal-500/30 bg-teal-500/5",
  highlights_social: "border-purple-500/30 bg-purple-500/5",
  vod_catchup:       "border-amber-500/30 bg-amber-500/5",
  media_library:     "border-slate-500/30 bg-slate-500/5",
};

const WINDOW_TEXT: Record<string, string> = {
  in_match_replay:   "text-blue-400",
  time_shifted:      "text-teal-400",
  highlights_social: "text-purple-400",
  vod_catchup:       "text-amber-400",
  media_library:     "text-slate-400",
};

function ResidualExposureTab({ roi }: { roi: any }) {
  const residual = roi?.summary?.residualExposure;
  if (!residual) {
    return <div className="text-sm text-muted-foreground py-8 text-center">No residual exposure data available.</div>;
  }

  const totalValue = residual.liveImpressionValue + residual.totalResidualValue;
  const activeWindows = residual.windows.filter((w: any) => w.additionalValue > 0);

  return (
    <div className="space-y-4">
      {/* KPI bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Live Value",      value: fmtMoney(residual.liveImpressionValue),  color: "text-blue-400",   sub: "6 territories" },
          { label: "Residual Value",  value: fmtMoney(residual.totalResidualValue),    color: "text-purple-400", sub: `${activeWindows.length} windows` },
          { label: "Total Value",     value: fmtMoney(totalValue),                     color: "text-green-400",  sub: "live + residual" },
          { label: "Residual Lift",   value: `${residual.residualMultiplier}×`,         color: "text-amber-400",  sub: "vs. live only" },
        ].map((k) => (
          <div key={k.label} className="stat-card rounded-lg p-3">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{k.label}</div>
            <div className={`text-xl font-bold tabular-nums ${k.color}`}>{k.value}</div>
            <div className="text-[10px] text-muted-foreground">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* The structural advantage */}
      <div className="stat-card rounded-lg p-4 border-l-2 border-purple-500/50">
        <h3 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
          The In-Game Placement Structural Advantage
        </h3>
        <p className="text-xs text-muted-foreground leading-relaxed mb-2">{residual.inGameResidualAdvantage}</p>
        <div className="flex flex-wrap gap-3 text-xs mt-3 pt-3 border-t border-border/20">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-400 shrink-0"></span>
            <span className="text-foreground font-medium">{residual.eligibleAppearances} in-game</span>
            <span className="text-muted-foreground">appearances earn residual</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-400/60 shrink-0"></span>
            <span className="text-foreground font-medium">{residual.ineligibleAppearances} ad-break</span>
            <span className="text-muted-foreground">appearances expire with broadcast</span>
          </div>
        </div>
      </div>

      {/* Live vs residual stacked bar */}
      <div className="stat-card rounded-lg p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">Value Composition</h3>
        <div className="space-y-2 mb-3">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-foreground">Live Broadcast</span>
              <span className="font-mono text-blue-400">{fmtMoney(residual.liveImpressionValue)} ({Math.round(residual.liveImpressionValue / totalValue * 100)}%)</span>
            </div>
            <div className="h-3 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-blue-400 rounded-full progress-fill"
                style={{ width: `${(residual.liveImpressionValue / totalValue) * 100}%` }} />
            </div>
          </div>
          {activeWindows.map((w: any) => (
            <div key={w.windowType}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-foreground">{WINDOW_ICONS[w.windowType]} {w.label}</span>
                <span className={`font-mono ${WINDOW_TEXT[w.windowType]}`}>
                  {fmtMoney(w.additionalValue)} ({Math.round(w.additionalValue / totalValue * 100)}%)
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className={`h-full rounded-full progress-fill ${WINDOW_TEXT[w.windowType].replace('text-', 'bg-')}`}
                  style={{ width: `${(w.additionalValue / totalValue) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Window cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {residual.windows.filter((w: any) => w.additionalValue > 0).map((w: any) => (
          <div key={w.windowType} className={`rounded-lg border p-4 ${WINDOW_COLORS[w.windowType] || "border-border bg-muted/10"}`}>
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xl leading-none">{WINDOW_ICONS[w.windowType]}</span>
                <div>
                  <div className="text-sm font-bold text-foreground">{w.label}</div>
                  {w.durationDays > 0 && (
                    <div className="text-[10px] text-muted-foreground">{w.durationDays} day window</div>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className={`text-sm font-bold ${WINDOW_TEXT[w.windowType]}`}>{fmtMoney(w.additionalValue)}</div>
                <div className="text-[10px] text-muted-foreground font-mono">
                  {(w.additionalImpressions/1e6).toFixed(1)}M viewers
                </div>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed mb-2">{w.description}</p>
            <div className="text-[10px] text-muted-foreground border-t border-border/20 pt-2">{w.sourceNote}</div>
          </div>
        ))}
      </div>

      {/* ACR vs Watermark callout */}
      <div className="border border-amber-500/20 bg-amber-500/5 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
          <span className="text-amber-400">⚠</span>
          Residual Measurement Problem — ACR vs. SonicOrigin Watermark
        </h3>
        <p className="text-xs text-muted-foreground leading-relaxed mb-3">
          Capturing residual impressions across time-shifted viewing, highlight clips, and VOD requires identifying
          that a brand's creative appeared in a specific piece of content — wherever and whenever that content plays.
          Two approaches exist, with fundamentally different privacy profiles:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3">
            <div className="text-red-400 font-bold mb-1 flex items-center gap-1.5">
              <span>⚠</span> ACR (Automatic Content Recognition)
            </div>
            <ul className="text-muted-foreground space-y-1">
              <li>• Smart TV fingerprints every frame on screen, including HDMI sources</li>
              <li>• Data sold to brokers; Samsung transmits every 1 min, LG every 15 sec</li>
              <li>• Texas AG sued Sony, Samsung, LG, Hisense, TCL (Dec 2025); TROs obtained</li>
              <li>• FTC Vizio settlement: $2.2M; class action $17M (16M users)</li>
              <li>• <strong className="text-red-300">Brand has zero control</strong> over detection, metadata, or data retention</li>
              <li>• Sensitive inferences: health, religion, political views drawn from viewing habits</li>
            </ul>
          </div>
          <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-3">
            <div className="text-green-400 font-bold mb-1 flex items-center gap-1.5">
              <span>✓</span> SonicOrigin Embedded Watermark
            </div>
            <ul className="text-muted-foreground space-y-1">
              <li>• Imperceptible audio watermark embedded at point of production</li>
              <li>• Survives compression, re-encoding, HDMI pass-through, re-broadcast</li>
              <li>• Brand controls the metadata schema — hard or soft bond to registry</li>
              <li>• Detection reads the <strong className="text-green-300">content token</strong>, not viewer behavior</li>
              <li>• No PII collected, no cross-device profiling, no sensitive inferences</li>
              <li>• Structurally bypasses ACR regulatory exposure — no surveillance of the viewer</li>
            </ul>
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground mt-3 pt-3 border-t border-border/20">
          For residual impression measurement, SonicOrigin's approach enables accurate cross-window tracking
          (live → replay → highlights → VOD) <strong className="text-foreground">without touching viewer data</strong>.
          The watermark token embedded in the creative at production propagates through every distribution window
          and is readable by authorized systems — making the brand the source of its own measurement data rather
          than a subject of someone else's surveillance infrastructure.
        </p>
      </div>

      {/* Methodology */}
      <div className="text-xs text-muted-foreground border-t border-border/30 pt-3 space-y-1">
        <p className="font-medium text-foreground">Methodology</p>
        <p>{residual.methodologyNote}</p>
        <div className="flex flex-wrap gap-2 mt-2">
          {[
            { label: "Goldbach Replay Ads", href: "https://goldbach.com/en/tv/replay-ads/" },
            { label: "Amplified Digital CTV Sports", href: "https://amplifieddigitalagency.com/sports-marketing-on-ctv-capitalizing-on-live-events-and-fan-engagement/" },
            { label: "SonicOrigin", href: "https://www.sonicorigin.com/" },
            { label: "OM SDK", href: "https://iabtechlab.com/standards/open-measurement-sdk/" },
          ].map((s) => (
            <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer"
              className="text-[10px] px-1.5 py-0.5 rounded bg-muted/60 text-primary hover:bg-primary/10 transition-colors">
              {s.label} ↗
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Format Intelligence Tab ─────────────────────────────────────────────────

const FORMAT_ICONS: Record<string, string> = {
  in_scene:     "🎬",
  overlay:      "📺",
  squeezeback:  "▢",
  pause_ad:     "⏸",
  ad_squeezeback: "⊡",
};

const FORMAT_VERDICT_COLORS: Record<string, { bg: string; text: string; border: string; label: string }> = {
  optimal:  { bg: "bg-green-500/10",  text: "text-green-400",  border: "border-green-500/30", label: "Optimal" },
  caution:  { bg: "bg-amber-500/10",  text: "text-amber-400",  border: "border-amber-500/30", label: "Caution" },
  suppress: { bg: "bg-red-500/10",    text: "text-red-400",    border: "border-red-500/30",   label: "Suppress" },
};

const MATCH_CONTEXT_META: Record<string, { label: string; icon: string; isHighAttn: boolean }> = {
  goal_scored:   { label: "Goal Scored",    icon: "⚽", isHighAttn: true  },
  celebration:   { label: "Celebration",    icon: "🎉", isHighAttn: true  },
  penalty_kick:  { label: "Penalty Kick",   icon: "⚠️", isHighAttn: true  },
  var_review:    { label: "VAR Review",     icon: "📹", isHighAttn: true  },
  free_kick:     { label: "Free Kick",      icon: "🎯", isHighAttn: false },
  corner_kick:   { label: "Corner Kick",    icon: "🚩", isHighAttn: false },
  game_action:   { label: "Open Play",      icon: "▶️", isHighAttn: false },
  replay:        { label: "Replay",         icon: "↺",  isHighAttn: false },
  halftime_show: { label: "Half-Time",      icon: "⏱️", isHighAttn: false },
  substitution:  { label: "Substitution",   icon: "🔄", isHighAttn: false },
  dead_ball:     { label: "Dead Ball",      icon: "⏹️", isHighAttn: false },
};

function FormatIntelligenceTab({ roi, appearances }: { roi: any; appearances: any[] }) {
  const globalFI = roi?.summary?.globalFormatIntelligence;
  if (!globalFI || !appearances?.length) {
    return <div className="text-sm text-muted-foreground py-8 text-center">No format intelligence data available.</div>;
  }

  const contextCounts: Record<string, number> = {};
  appearances.forEach((a: any) => {
    contextCounts[a.context] = (contextCounts[a.context] || 0) + 1;
  });

  const highAttnContexts = ["goal_scored", "celebration", "penalty_kick", "var_review"];
  const highAttnCount = appearances.filter((a: any) => highAttnContexts.includes(a.context)).length;
  const suppressRisk = appearances.filter((a: any) =>
    highAttnContexts.includes(a.context) && a.sentimentContext !== "positive"
  ).length;

  const ctxCell = (fire: boolean, suppress: boolean) =>
    suppress ? <span className="text-red-400 font-bold text-base">×</span>
    : fire    ? <span className="text-green-400 font-bold text-base">✓</span>
             : <span className="text-muted-foreground/40 text-base">○</span>;

  const MATRIX: Record<string, Record<string, boolean[]>> = {
    game_action:   { in_scene:[true,false], overlay:[true,false], squeezeback:[false,false], pause_ad:[true,false] },
    goal_scored:   { in_scene:[false,true], overlay:[false,true], squeezeback:[false,true],  pause_ad:[true,false] },
    celebration:   { in_scene:[false,true], overlay:[false,true], squeezeback:[false,true],  pause_ad:[true,false] },
    penalty_kick:  { in_scene:[false,true], overlay:[false,true], squeezeback:[false,true],  pause_ad:[true,false] },
    var_review:    { in_scene:[false,true], overlay:[false,true], squeezeback:[false,true],  pause_ad:[true,false] },
    corner_kick:   { in_scene:[true,false], overlay:[false,false], squeezeback:[false,false], pause_ad:[false,false] },
    free_kick:     { in_scene:[true,false], overlay:[false,false], squeezeback:[false,true],  pause_ad:[false,false] },
    replay:        { in_scene:[false,false],overlay:[true,false], squeezeback:[true,false],  pause_ad:[false,false] },
    halftime_show: { in_scene:[false,false],overlay:[true,false], squeezeback:[true,false],  pause_ad:[true,false] },
    substitution:  { in_scene:[false,false],overlay:[true,false], squeezeback:[true,false],  pause_ad:[false,false] },
    dead_ball:     { in_scene:[true,false], overlay:[false,false], squeezeback:[true,false],  pause_ad:[false,false] },
  };

  const ROAS_NOTES: Record<string, string> = {
    goal_scored:   "Peak attention — protect the moment; clean mid-roll after the goal is the highest-value slot",
    celebration:   "Emotional peak — brand association here is high-reward or high-risk; never interrupt",
    penalty_kick:  "Volatile sentiment — suppress all overlays; brand recall strongly influenced by outcome",
    var_review:    "Viewer frustration risk — hold all non-interruptive; fire post-VAR resolution instead",
    game_action:   "In-scene optimal — organic brand integration matches open-play rhythm naturally",
    corner_kick:   "In-scene works — ball stopped, camera pans, perimeter boards fully visible",
    free_kick:     "In-scene window — setup moment; overlay risks competing with critical camera angles",
    replay:        "Overlay and ad squeezeback viable — viewer re-watching a moment, lower irritation risk",
    halftime_show: "All formats viable — lowest disruption risk; viewer already in passive mode",
    substitution:  "Squeeze back and overlay viable — tactical pause, viewer attention lowered briefly",
    dead_ball:     "Squeeze back window — ball stopped, standard break expectation, viewer tolerates",
  };

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Viewer Exp. Score", value: `${globalFI.viewerExperienceScore}/100`, color: globalFI.viewerExperienceScore >= 60 ? "text-green-400" : "text-amber-400" },
          { label: "High-Attn Moments", value: highAttnCount, color: "text-amber-400" },
          { label: "Suppression Rate",  value: `${globalFI.suppressionRate}%`, color: globalFI.suppressionRate > 40 ? "text-red-400" : "text-amber-400" },
          { label: "Top Format",        value: globalFI.topFormat, color: "text-purple-400" },
        ].map((kpi) => (
          <div key={kpi.label} className="stat-card rounded-lg p-3">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{kpi.label}</div>
            <div className={`text-sm font-bold leading-tight ${kpi.color}`}>{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* Explainer */}
      <div className="stat-card rounded-lg p-4 border-l-2 border-primary/50">
        <h3 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
          <span className="text-primary">IAB CTV Ad Portfolio</span>
          <a href="https://iabtechlab.com/standards/ctv-ad-portfolio/" target="_blank"
            className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-mono hover:bg-primary/20">Dec 2025 ↗</a>
          <a href="https://iabtechlab.com/ad-format-hero/" target="_blank"
            className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-mono hover:bg-primary/20">Ad Format Hero ↗</a>
        </h3>
        <p className="text-xs text-muted-foreground leading-relaxed mb-2">
          Scene context from Twelve Labs determines when each non-interruptive format should fire, be held, or be suppressed.
          The IAB CTV Ad Portfolio (released Dec 11, 2025 from the Ad Format Hero initiative) defines six format types.
          <strong className="text-foreground"> Firing an overlay or squeeze back during a goal celebration
          competes with the highest-attention moment of the match, damages viewer experience, and measurably
          reduces brand recall vs. a clean mid-roll.</strong> Conversely, in-scene insertion during open play
          is organic, non-disruptive, and directly amplifies the brand's existing perimeter board presence.
        </p>
        <p className="text-xs text-muted-foreground">{globalFI.formatIntelNote}</p>
      </div>

      {/* Format recommendation cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {globalFI.recommendations.map((rec: any) => {
          const vc = FORMAT_VERDICT_COLORS[rec.verdict];
          const icon = FORMAT_ICONS[rec.formatId] || "📺";
          return (
            <div key={rec.formatId} className={`rounded-lg border p-4 ${vc.border} ${vc.bg}`}
              data-testid={`format-card-${rec.formatId}`}>
              <div className="mb-2">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-base leading-none">{icon}</span>
                  <span className="text-sm font-bold text-foreground leading-tight">{rec.format}</span>
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <div className={`text-[10px] font-bold uppercase tracking-wider ${vc.text}`}>
                    {vc.label} — {rec.roasMultiplier.toFixed(1)}× ROAS
                  </div>
                  <div className="flex items-center gap-2 text-[10px] ml-auto">
                    <span className="text-green-400 font-mono">{rec.qualifyingAppearances}✓</span>
                    <span className="text-red-400 font-mono">{rec.suppressedAppearances}×</span>
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed mb-3">{rec.rationale}</p>
              <div className="space-y-1.5">
                {rec.triggerContexts.length > 0 && (
                  <div>
                    <div className="text-[10px] text-green-400 font-semibold mb-1">✓ Fire when:</div>
                    <div className="flex flex-wrap gap-1">
                      {rec.triggerContexts.map((ctx: string) => (
                        <span key={ctx} className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-400">
                          {MATCH_CONTEXT_META[ctx]?.icon} {MATCH_CONTEXT_META[ctx]?.label || ctx}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {rec.suppressContexts.length > 0 && (
                  <div>
                    <div className="text-[10px] text-red-400 font-semibold mb-1">× Suppress when:</div>
                    <div className="flex flex-wrap gap-1">
                      {rec.suppressContexts.map((ctx: string) => (
                        <span key={ctx} className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400">
                          {MATCH_CONTEXT_META[ctx]?.icon} {MATCH_CONTEXT_META[ctx]?.label || ctx}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Context × Format matrix */}
      <div className="stat-card rounded-lg p-4">
        <h3 className="text-sm font-semibold text-foreground mb-1">Scene Context × Format Decision Matrix</h3>
        <p className="text-xs text-muted-foreground mb-4">
          Each row is a match context detected in this clip. ✓ = fire, × = suppress, ○ = hold/evaluate.
          High-attention rows (amber) require the most careful format selection — wrong timing here damages ROAS and viewer experience simultaneously.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                <th className="px-3 py-2 text-left text-muted-foreground font-medium">Context</th>
                <th className="px-3 py-2 text-center text-muted-foreground font-medium">Count</th>
                <th className="px-3 py-2 text-center text-muted-foreground font-medium">🎬 In-Scene</th>
                <th className="px-3 py-2 text-center text-muted-foreground font-medium">📺 Overlay</th>
                <th className="px-3 py-2 text-center text-muted-foreground font-medium">▢ Squeeze</th>
                <th className="px-3 py-2 text-center text-muted-foreground font-medium">⏸ Pause</th>
                <th className="px-3 py-2 text-left text-muted-foreground font-medium">ROAS guidance</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(contextCounts)
                .sort(([,a],[,b]) => (b as number) - (a as number))
                .map(([ctx, count]) => {
                  const meta = MATCH_CONTEXT_META[ctx] || { label: ctx, icon: "", isHighAttn: false };
                  const m = MATRIX[ctx] || {};
                  const inS = m.in_scene     || [false, false];
                  const ov  = m.overlay      || [false, false];
                  const sq  = m.squeezeback  || [false, false];
                  const pa  = m.pause_ad     || [false, false];
                  return (
                    <tr key={ctx} className={`border-b border-border/20 ${meta.isHighAttn ? "bg-amber-500/5" : ""}`}
                      data-testid={`matrix-row-${ctx}`}>
                      <td className="px-3 py-2 font-medium whitespace-nowrap">
                        <span className="mr-1">{meta.icon}</span>
                        <span className={meta.isHighAttn ? "text-amber-400" : "text-foreground"}>{meta.label}</span>
                        {meta.isHighAttn && <span className="ml-1.5 text-[10px] px-1 py-0.5 rounded bg-amber-500/10 text-amber-400">high attn</span>}
                      </td>
                      <td className="px-3 py-2 text-center font-mono text-muted-foreground">{count as number}</td>
                      <td className="px-3 py-2 text-center">{ctxCell(inS[0], inS[1])}</td>
                      <td className="px-3 py-2 text-center">{ctxCell(ov[0],  ov[1])}</td>
                      <td className="px-3 py-2 text-center">{ctxCell(sq[0],  sq[1])}</td>
                      <td className="px-3 py-2 text-center">{ctxCell(pa[0],  pa[1])}</td>
                      <td className="px-3 py-2 text-muted-foreground text-[10px] max-w-[200px]">{ROAS_NOTES[ctx] || "Evaluate sentiment before firing"}</td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {/* High attention callout */}
      {highAttnCount > 0 && (
        <div className="stat-card rounded-lg p-4 border-l-2 border-amber-400/50">
          <h3 className="text-sm font-semibold text-foreground mb-2">
            ⚡ {highAttnCount} Peak Attention Windows — In-Scene Insertion Opportunity
          </h3>
          <ul className="text-xs text-muted-foreground space-y-1.5">
            <li className="flex items-start gap-2">
              <span className="text-green-400 shrink-0 font-bold">✓</span>
              <span><strong className="text-foreground">In-scene virtual OOH during open play before the moment</strong> — brand is already organically integrated when peak attention arrives</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-400 shrink-0 font-bold">×</span>
              <span><strong className="text-foreground">Overlay or squeeze back during goal/penalty</strong> — you are competing with the most emotionally significant seconds of the match; viewer irritation and recall damage are measurable</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-400 shrink-0 font-bold">○</span>
              <span><strong className="text-foreground">Post-moment mid-roll</strong> — the ad break immediately after a goal is the highest-CPM slot in the broadcast; use standard formats, not overlays, to maximise that window</span>
            </li>
            {suppressRisk > 0 && (
              <li className="flex items-start gap-2">
                <span className="text-red-400 shrink-0 font-bold">⚠</span>
                <span><strong className="text-foreground">{suppressRisk} brand appearances</strong> occurred during high-attention moments with non-positive sentiment — these represent brand safety risk if non-interruptive formats had fired without context gating</span>
              </li>
            )}
          </ul>
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border/30 pt-3">
        <span>
          <a href="https://iabtechlab.com/standards/ctv-ad-portfolio/" target="_blank" className="text-primary hover:underline">IAB CTV Ad Portfolio</a>
          {" · "}
          <a href="https://iabtechlab.com/ad-format-hero/" target="_blank" className="text-primary hover:underline">Ad Format Hero</a>
          {" · Dec 2025"}
        </span>
        <a href="/#/ecosystem" className="text-primary hover:underline">Standards Architecture →</a>
      </div>
    </div>
  );
}

function BrandCard({ brand, rank, color }: { brand: any; rank: number; color: string }) {
  const topTerrMeta = TERRITORY_META[brand.topTerritory];
  const topPlacementLabel = PLACEMENT_LABELS[brand.topPlacementType] || brand.topPlacementType;

  return (
    <div className="stat-card rounded-lg p-4" data-testid={`card-brand-${brand.brand}`}>
      <div className="flex items-start gap-4">
        <div className="flex flex-col items-center gap-1 shrink-0 pt-0.5">
          <span className="text-[10px] text-muted-foreground font-mono">#{rank}</span>
          <GradeChip grade={brand.grade} />
        </div>

        <div className="flex-1 min-w-0">
          {/* Name row */}
          <div className="flex items-center gap-3 flex-wrap mb-2">
            <h3 className="text-base font-bold text-foreground">{brand.brand}</h3>
            <span className="text-xs text-muted-foreground">{brand.totalAppearances} appearances</span>
            <span className="text-xs font-mono" style={{ color }}>{fmtSec(brand.totalExposureSeconds)} airtime</span>
            {topTerrMeta && (
              <span className="text-xs text-muted-foreground">Top: {topTerrMeta.flag} {topTerrMeta.name}</span>
            )}
          </div>

          {/* Metrics grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1.5 mb-3 text-xs">
            {[
              { label: "ROI Score",        value: `${brand.overallROIScore}/100`,      highlight: true },
              { label: "Global Value",      value: fmtMoney(brand.globalImpressionValue) },
              { label: "Attention Score",   value: `${brand.attentionScore.toFixed(0)}%` },
              { label: "Placement Quality", value: `${brand.placementQualityScore.toFixed(0)}%` },
              { label: "In-Game",           value: brand.inGamePlacements },
              { label: "Ad Breaks",         value: brand.adPlacements },
              { label: "Primary %",         value: `${brand.totalAppearances > 0 ? Math.round(brand.primaryAppearances / brand.totalAppearances * 100) : 0}%` },
              { label: "Top Placement",     value: topPlacementLabel },
            ].map((m) => (
              <div key={m.label}>
                <div className="text-muted-foreground">{m.label}</div>
                <div className={`font-semibold truncate ${m.highlight ? "" : "text-foreground"}`}
                  style={m.highlight ? { color } : {}}>
                  {m.value}
                </div>
              </div>
            ))}
          </div>

          {/* ROI bar */}
          <ROIBar value={brand.overallROIScore} />

          {/* Per-territory mini sparkline */}
          {brand.territoryBreakdown && (
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              {Object.entries(brand.territoryBreakdown as Record<string, any>).map(([code, td]) => (
                <div key={code} className="flex items-center gap-1 text-[10px]">
                  <span>{TERRITORY_META[code]?.flag}</span>
                  <span className="font-mono" style={{ color: TERRITORY_META[code]?.color }}>
                    {fmtMoney((td as any).impressionValue)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Insights */}
          {brand.insights?.length > 0 && (
            <div className="mt-2 space-y-0.5 pt-2 border-t border-border/20">
              {brand.insights.map((ins: string, i: number) => (
                <div key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                  <span className="text-primary mt-0.5 shrink-0">·</span>
                  {ins}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
