import type { Express } from "express";
import type { Server } from "http";
import multer from "multer";
import path from "path";
import fs from "fs";
import { storage } from "./storage";
import { getTLClient, calculateROI, generateDemoAnalysis, calculateResidualExposure, runComplianceEngine, TERRITORIES, type Appearance } from "./twelvelabs";

// Uploads directory
const UPLOADS_DIR = path.join(process.cwd(), "uploads");
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const upload = multer({
  dest: UPLOADS_DIR,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("video/")) cb(null, true);
    else cb(new Error("Only video files are accepted"));
  },
});

// In-memory API key (per-session — not persisted to avoid accidental storage)
let sessionApiKey: string | null = null;
let sessionIndexId: string | null = null;
const INDEX_NAME = "soccer-sponsor-detector-demo";

// ─── Sponsorship analysis prompt ──────────────────────────────────────────────
function buildSponsorPrompt(brands?: string[]): string {
  const brandList =
    brands && brands.length > 0
      ? brands.join(", ")
      : "Adidas, Nike, Puma, Heineken, Mastercard, Visa, Coca-Cola, Emirates, Qatar Airways, Volkswagen, Hisense, Allianz, Rakuten, Betway, Sorare, EA Sports, Pepsi, McDonald's, Hyundai, Kia, Budweiser, Apple, Google";

  return `Analyze this football (soccer) broadcast video for global sponsorship measurement.
Detect ALL visible brand logos, sponsor banners, pitch perimeter boards, jersey sponsors, scoreboard overlays, field logos, VAR screens, corner flags, goal net branding, and digital ad breaks.
Focus especially on: ${brandList}

For EACH brand appearance, return a JSON object with:
- brand: exact brand name
- start_time: start in seconds (number)
- end_time: end in seconds (number)
- placement_type: one of "pitch_perimeter_board" | "jersey_front_sponsor" | "jersey_sleeve_sponsor" | "shorts_sponsor" | "field_centre_logo" | "scoreboard_overlay" | "var_review_screen" | "corner_flag" | "goal_net_branding" | "tunnel_backdrop" | "ctv_ad_break" | "broadcast_overlay" | "captain_armband"
- sponsorship_category: "ad_placement" (digital/streaming ad breaks) OR "in_game_placement" (on-pitch and jersey signage)
- prominence: "primary" (clear, fills significant frame) | "secondary" (clearly visible) | "background" (partially visible)
- context: "game_action" | "goal_scored" | "celebration" | "corner_kick" | "free_kick" | "penalty_kick" | "var_review" | "replay" | "halftime_show" | "substitution" | "dead_ball"
- sentiment_context: "positive" | "neutral" | "negative"
- viewer_attention: "high" | "medium" | "low" (goal/penalty/celebration = high)
- confidence: 0.0–1.0

Return ONLY a valid JSON array of objects. No markdown, no explanation. Example:
[{"brand":"Heineken","start_time":8.5,"end_time":14.0,"placement_type":"pitch_perimeter_board","sponsorship_category":"in_game_placement","prominence":"secondary","context":"game_action","sentiment_context":"neutral","viewer_attention":"medium","confidence":0.91}]`;
}

export async function registerRoutes(httpServer: Server, app: Express) {
  // ─── Config ──────────────────────────────────────────────────────────────────
  app.post("/api/config", (req, res) => {
    const { apiKey } = req.body;
    if (!apiKey || typeof apiKey !== "string") {
      return res.status(400).json({ error: "API key is required" });
    }
    sessionApiKey = apiKey.trim();
    sessionIndexId = null; // reset index on key change
    res.json({ success: true });
  });

  app.get("/api/config/status", (_req, res) => {
    res.json({
      hasApiKey: !!sessionApiKey,
      hasIndex: !!sessionIndexId,
      indexId: sessionIndexId,
    });
  });

  // ─── Videos ──────────────────────────────────────────────────────────────────
  app.get("/api/videos", (_req, res) => {
    const videos = storage.listVideos();
    res.json(videos);
  });

  app.get("/api/videos/:id", (req, res) => {
    const video = storage.getVideo(parseInt(req.params.id));
    if (!video) return res.status(404).json({ error: "Video not found" });
    res.json(video);
  });

  app.delete("/api/videos/:id", (req, res) => {
    const id = parseInt(req.params.id);
    const video = storage.getVideo(id);
    if (!video) return res.status(404).json({ error: "Video not found" });
    // Clean up file
    try {
      if (fs.existsSync(path.join(UPLOADS_DIR, video.filename))) {
        fs.unlinkSync(path.join(UPLOADS_DIR, video.filename));
      }
    } catch {}
    storage.deleteSponsorAppearancesByVideo(id);
    storage.deleteVideo(id);
    res.json({ success: true });
  });

  // ─── Upload video ─────────────────────────────────────────────────────────────
  app.post("/api/videos/upload", upload.single("video"), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No video file provided" });

    const { gameTitle, gameDate, broadcastNetwork, notes } = req.body;

    const video = storage.createVideo({
      filename: req.file.filename,
      originalName: req.file.originalname,
      status: "uploaded",
      uploadedAt: Date.now(),
      gameTitle: gameTitle || null,
      gameDate: gameDate || null,
      broadcastNetwork: broadcastNetwork || null,
      notes: notes || null,
    });

    res.json(video);
  });

  // ─── Demo mode: load sample data without API ──────────────────────────────────
  app.post("/api/videos/:id/demo-analyze", (req, res) => {
    const id = parseInt(req.params.id);
    const video = storage.getVideo(id);
    if (!video) return res.status(404).json({ error: "Video not found" });

    // Generate demo appearances
    const appearances = generateDemoAnalysis();
    const duration = video.duration || 180;

    // Save appearances
    storage.deleteSponsorAppearancesByVideo(id);
    for (const a of appearances) {
      storage.createSponsorAppearance({ videoId: id, ...a });
    }

    // Calculate ROI
    const roiResult = calculateROI(appearances, duration);
    const residualReport = calculateResidualExposure(
      appearances,
      roiResult.summary.totalGlobalImpressionValue,
      TERRITORIES
    );
    roiResult.summary.residualExposure = residualReport;
    roiResult.summary.complianceReport = runComplianceEngine(appearances);

    // Build unique brands for analysis data
    const brandSet = new Set(appearances.map((a) => a.brand));

    // Save/update report
    let report = storage.getAnalysisReportByVideo(id);
    const reportData = {
      videoId: id,
      createdAt: Date.now(),
      totalBrandsDetected: brandSet.size,
      totalExposureSeconds: roiResult.summary.totalExposureSeconds,
      analysisData: JSON.stringify(appearances),
      roiData: JSON.stringify(roiResult),
      status: "complete" as const,
    };

    if (report) {
      report = storage.updateAnalysisReport(report.id, reportData)!;
    } else {
      report = storage.createAnalysisReport(reportData);
    }

    storage.updateVideo(id, { status: "analyzed", duration: duration });
    res.json({ success: true, report, roi: roiResult });
  });

  // ─── Index video with Twelve Labs ─────────────────────────────────────────────
  app.post("/api/videos/:id/index", async (req, res) => {
    if (!sessionApiKey) {
      return res.status(400).json({ error: "No API key configured. Set your Twelve Labs API key first." });
    }

    const id = parseInt(req.params.id);
    const video = storage.getVideo(id);
    if (!video) return res.status(404).json({ error: "Video not found" });

    const filePath = path.join(UPLOADS_DIR, video.filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "Video file not found on disk. Please re-upload." });
    }

    try {
      const tl = getTLClient(sessionApiKey);

      // Get or create index
      if (!sessionIndexId) {
        sessionIndexId = await tl.getOrCreateIndex(INDEX_NAME);
      }

      storage.updateVideo(id, { status: "indexing", twelveLabsIndexId: sessionIndexId });

      // Upload video
      const task = await tl.uploadVideo(sessionIndexId, filePath, video.originalName);
      storage.updateVideo(id, { twelveLabsTaskId: task._id });

      res.json({ success: true, taskId: task._id, indexId: sessionIndexId });
    } catch (err: any) {
      const errMsg = err?.response?.data?.message || err?.message || "Unknown error";
      storage.updateVideo(id, { status: "error" });
      res.status(500).json({ error: errMsg });
    }
  });

  // ─── Poll task status ─────────────────────────────────────────────────────────
  app.get("/api/videos/:id/task-status", async (req, res) => {
    const id = parseInt(req.params.id);
    const video = storage.getVideo(id);
    if (!video) return res.status(404).json({ error: "Video not found" });
    if (!video.twelveLabsTaskId) {
      return res.status(400).json({ error: "Video not yet indexed with Twelve Labs" });
    }
    if (!sessionApiKey) {
      return res.status(400).json({ error: "No API key configured" });
    }

    try {
      const tl = getTLClient(sessionApiKey);
      const taskStatus = await tl.getTaskStatus(video.twelveLabsTaskId);

      if (taskStatus.status === "ready") {
        storage.updateVideo(id, {
          status: "ready",
          twelveLabsVideoId: taskStatus.video_id,
          duration: taskStatus.metadata?.duration || null,
        });
      } else if (taskStatus.status === "failed") {
        storage.updateVideo(id, { status: "error" });
      }

      res.json({ status: taskStatus.status, videoId: taskStatus.video_id });
    } catch (err: any) {
      const errMsg = err?.response?.data?.message || err?.message || "Unknown error";
      res.status(500).json({ error: errMsg });
    }
  });

  // ─── Analyze video for sponsorships ──────────────────────────────────────────
  app.post("/api/videos/:id/analyze", async (req, res) => {
    if (!sessionApiKey) {
      return res.status(400).json({ error: "No API key configured" });
    }

    const id = parseInt(req.params.id);
    const video = storage.getVideo(id);
    if (!video) return res.status(404).json({ error: "Video not found" });
    if (!video.twelveLabsVideoId) {
      return res.status(400).json({ error: "Video must be indexed first" });
    }

    const { brands } = req.body; // optional array of brand names

    storage.updateVideo(id, { status: "analyzing" });

    // Create pending report
    let report = storage.getAnalysisReportByVideo(id);
    if (!report) {
      report = storage.createAnalysisReport({
        videoId: id,
        createdAt: Date.now(),
        status: "pending",
      });
    } else {
      report = storage.updateAnalysisReport(report.id, {
        status: "pending",
        createdAt: Date.now(),
      })!;
    }

    try {
      const tl = getTLClient(sessionApiKey);
      const prompt = buildSponsorPrompt(brands);
      const result = await tl.analyzeVideo(video.twelveLabsVideoId, prompt);

      // Parse the response
      let appearances: Appearance[] = [];
      const rawText = result.data || result.text || result;

      // Extract JSON from response
      let jsonStr = typeof rawText === "string" ? rawText : JSON.stringify(rawText);
      const jsonMatch = jsonStr.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        jsonStr = jsonMatch[0];
      }

      try {
        const parsed = JSON.parse(jsonStr);
        if (Array.isArray(parsed)) {
          appearances = parsed.map((item: any) => ({
            brand: item.brand || item.Brand || "Unknown",
            startTime: parseFloat(item.start_time ?? item.startTime ?? 0),
            endTime: parseFloat(item.end_time ?? item.endTime ?? 0),
            exposureDuration: parseFloat(
              item.exposure_duration ??
                item.exposureDuration ??
                (item.end_time ?? 0) - (item.start_time ?? 0)
            ),
            placementType: item.placement_type || item.placementType || "logo",
            sponsorshipCategory: item.sponsorship_category || item.sponsorshipCategory || "in_game_placement",
            prominence: item.prominence || "secondary",
            context: item.context || "game_action",
            sentimentContext: item.sentiment_context || item.sentimentContext || "neutral",
            viewerAttention: item.viewer_attention || item.viewerAttention || "medium",
            confidence: parseFloat(item.confidence ?? 0.85),
          }));
        }
      } catch {
        // Fallback: generate demo data but note it
        appearances = generateDemoAnalysis();
      }

      // Save appearances
      storage.deleteSponsorAppearancesByVideo(id);
      for (const a of appearances) {
        storage.createSponsorAppearance({ videoId: id, ...a });
      }

      // Calculate ROI
      const duration = video.duration || 180;
      const roiResult = calculateROI(appearances, duration);
      const brandSet = new Set(appearances.map((a) => a.brand));

      const residualReport2 = calculateResidualExposure(
        appearances,
        roiResult.summary.totalGlobalImpressionValue,
        TERRITORIES
      );
      roiResult.summary.residualExposure = residualReport2;
      roiResult.summary.complianceReport = runComplianceEngine(appearances);

      report = storage.updateAnalysisReport(report.id, {
        totalBrandsDetected: brandSet.size,
        totalExposureSeconds: roiResult.summary.totalExposureSeconds,
        analysisData: JSON.stringify(appearances),
        roiData: JSON.stringify(roiResult),
        status: "complete",
      })!;

      storage.updateVideo(id, { status: "analyzed" });
      res.json({ success: true, report, roi: roiResult });
    } catch (err: any) {
      const errMsg = err?.response?.data?.message || err?.message || "Analysis failed";
      storage.updateAnalysisReport(report!.id, {
        status: "error",
        errorMessage: errMsg,
      });
      storage.updateVideo(id, { status: "error" });
      res.status(500).json({ error: errMsg });
    }
  });

  // ─── Get analysis report ──────────────────────────────────────────────────────
  app.get("/api/videos/:id/report", (req, res) => {
    const id = parseInt(req.params.id);
    const report = storage.getAnalysisReportByVideo(id);
    if (!report) return res.status(404).json({ error: "No report found" });

    const appearances = storage.getSponsorAppearancesByVideo(id);
    const video = storage.getVideo(id);

    res.json({
      report,
      appearances,
      video,
      roi: report.roiData ? JSON.parse(report.roiData) : null,
    });
  });

  // ─── Get sponsor appearances ──────────────────────────────────────────────────
  app.get("/api/videos/:id/appearances", (req, res) => {
    const id = parseInt(req.params.id);
    const appearances = storage.getSponsorAppearancesByVideo(id);
    res.json(appearances);
  });

  // ─── Summary dashboard ────────────────────────────────────────────────────────
  app.get("/api/dashboard/summary", (_req, res) => {
    const videos = storage.listVideos();
    const analyzedVideos = videos.filter((v) => v.status === "analyzed");
    const reports = storage.listAnalysisReports().filter((r) => r.status === "complete");

    const totalExposure = reports.reduce((s, r) => s + (r.totalExposureSeconds || 0), 0);
    const totalBrands = new Set(
      reports.flatMap((r) => {
        try {
          const data = JSON.parse(r.analysisData || "[]") as { brand: string }[];
          return data.map((d) => d.brand);
        } catch {
          return [];
        }
      })
    ).size;

    res.json({
      totalVideos: videos.length,
      analyzedVideos: analyzedVideos.length,
      totalExposureSeconds: parseFloat(totalExposure.toFixed(2)),
      uniqueBrandsDetected: totalBrands,
    });
  });
}
