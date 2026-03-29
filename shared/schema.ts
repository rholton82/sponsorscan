import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Videos table
export const videos = sqliteTable("videos", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  filename: text("filename").notNull(),
  originalName: text("original_name").notNull(),
  twelveLabsIndexId: text("twelve_labs_index_id"),
  twelveLabsVideoId: text("twelve_labs_video_id"),
  twelveLabsTaskId: text("twelve_labs_task_id"),
  duration: real("duration"),
  status: text("status").notNull().default("uploaded"), // uploaded | indexing | ready | analyzing | analyzed | error
  uploadedAt: integer("uploaded_at").notNull(),
  gameTitle: text("game_title"),
  gameDate: text("game_date"),
  broadcastNetwork: text("broadcast_network"),
  notes: text("notes"),
});

// Sponsor appearances table
export const sponsorAppearances = sqliteTable("sponsor_appearances", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  videoId: integer("video_id").notNull(),
  brand: text("brand").notNull(),
  startTime: real("start_time").notNull(),
  endTime: real("end_time").notNull(),
  exposureDuration: real("exposure_duration").notNull(),
  placementType: text("placement_type").notNull(), // logo | jersey_sponsor | stadium_signage | ctv_ad | scoreboard | field_logo
  sponsorshipCategory: text("sponsorship_category").notNull(), // ad_placement | in_game_placement
  prominence: text("prominence").notNull(), // primary | secondary | background
  context: text("context"), // game_action | celebration | replay | timeout | commercial_break
  sentimentContext: text("sentiment_context"), // positive | neutral | negative
  viewerAttention: text("viewer_attention"), // high | medium | low
  confidence: real("confidence"),
});

// Analysis reports table
export const analysisReports = sqliteTable("analysis_reports", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  videoId: integer("video_id").notNull(),
  createdAt: integer("created_at").notNull(),
  totalBrandsDetected: integer("total_brands_detected").default(0),
  totalExposureSeconds: real("total_exposure_seconds").default(0),
  analysisData: text("analysis_data"), // JSON blob with full analysis
  roiData: text("roi_data"), // JSON blob with ROI calculations
  status: text("status").notNull().default("pending"), // pending | complete | error
  errorMessage: text("error_message"),
});

// Insert schemas
export const insertVideoSchema = createInsertSchema(videos).omit({ id: true });
export const insertSponsorAppearanceSchema = createInsertSchema(sponsorAppearances).omit({ id: true });
export const insertAnalysisReportSchema = createInsertSchema(analysisReports).omit({ id: true });

// Types
export type Video = typeof videos.$inferSelect;
export type InsertVideo = z.infer<typeof insertVideoSchema>;
export type SponsorAppearance = typeof sponsorAppearances.$inferSelect;
export type InsertSponsorAppearance = z.infer<typeof insertSponsorAppearanceSchema>;
export type AnalysisReport = typeof analysisReports.$inferSelect;
export type InsertAnalysisReport = z.infer<typeof insertAnalysisReportSchema>;
