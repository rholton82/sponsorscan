import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { eq, desc } from "drizzle-orm";
import {
  videos, sponsorAppearances, analysisReports,
  type Video, type InsertVideo,
  type SponsorAppearance, type InsertSponsorAppearance,
  type AnalysisReport, type InsertAnalysisReport,
} from "@shared/schema";

const sqlite = new Database("data.db");
const db = drizzle(sqlite);

// Create tables
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS videos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL,
    original_name TEXT NOT NULL,
    twelve_labs_index_id TEXT,
    twelve_labs_video_id TEXT,
    twelve_labs_task_id TEXT,
    duration REAL,
    status TEXT NOT NULL DEFAULT 'uploaded',
    uploaded_at INTEGER NOT NULL,
    game_title TEXT,
    game_date TEXT,
    broadcast_network TEXT,
    notes TEXT
  );

  CREATE TABLE IF NOT EXISTS sponsor_appearances (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    video_id INTEGER NOT NULL,
    brand TEXT NOT NULL,
    start_time REAL NOT NULL,
    end_time REAL NOT NULL,
    exposure_duration REAL NOT NULL,
    placement_type TEXT NOT NULL,
    sponsorship_category TEXT NOT NULL,
    prominence TEXT NOT NULL,
    context TEXT,
    sentiment_context TEXT,
    viewer_attention TEXT,
    confidence REAL
  );

  CREATE TABLE IF NOT EXISTS analysis_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    video_id INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    total_brands_detected INTEGER DEFAULT 0,
    total_exposure_seconds REAL DEFAULT 0,
    analysis_data TEXT,
    roi_data TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    error_message TEXT
  );
`);

export interface IStorage {
  // Videos
  createVideo(data: InsertVideo): Video;
  getVideo(id: number): Video | undefined;
  listVideos(): Video[];
  updateVideo(id: number, data: Partial<Video>): Video | undefined;
  deleteVideo(id: number): void;

  // Sponsor Appearances
  createSponsorAppearance(data: InsertSponsorAppearance): SponsorAppearance;
  getSponsorAppearancesByVideo(videoId: number): SponsorAppearance[];
  deleteSponsorAppearancesByVideo(videoId: number): void;

  // Analysis Reports
  createAnalysisReport(data: InsertAnalysisReport): AnalysisReport;
  getAnalysisReport(id: number): AnalysisReport | undefined;
  getAnalysisReportByVideo(videoId: number): AnalysisReport | undefined;
  updateAnalysisReport(id: number, data: Partial<AnalysisReport>): AnalysisReport | undefined;
  listAnalysisReports(): AnalysisReport[];
}

export const storage: IStorage = {
  createVideo(data: InsertVideo): Video {
    return db.insert(videos).values(data).returning().get();
  },

  getVideo(id: number): Video | undefined {
    return db.select().from(videos).where(eq(videos.id, id)).get();
  },

  listVideos(): Video[] {
    return db.select().from(videos).orderBy(desc(videos.uploadedAt)).all();
  },

  updateVideo(id: number, data: Partial<Video>): Video | undefined {
    return db.update(videos).set(data).where(eq(videos.id, id)).returning().get();
  },

  deleteVideo(id: number): void {
    db.delete(videos).where(eq(videos.id, id)).run();
  },

  createSponsorAppearance(data: InsertSponsorAppearance): SponsorAppearance {
    return db.insert(sponsorAppearances).values(data).returning().get();
  },

  getSponsorAppearancesByVideo(videoId: number): SponsorAppearance[] {
    return db.select().from(sponsorAppearances).where(eq(sponsorAppearances.videoId, videoId)).all();
  },

  deleteSponsorAppearancesByVideo(videoId: number): void {
    db.delete(sponsorAppearances).where(eq(sponsorAppearances.videoId, videoId)).run();
  },

  createAnalysisReport(data: InsertAnalysisReport): AnalysisReport {
    return db.insert(analysisReports).values(data).returning().get();
  },

  getAnalysisReport(id: number): AnalysisReport | undefined {
    return db.select().from(analysisReports).where(eq(analysisReports.id, id)).get();
  },

  getAnalysisReportByVideo(videoId: number): AnalysisReport | undefined {
    return db.select().from(analysisReports).where(eq(analysisReports.videoId, videoId)).get();
  },

  updateAnalysisReport(id: number, data: Partial<AnalysisReport>): AnalysisReport | undefined {
    return db.update(analysisReports).set(data).where(eq(analysisReports.id, id)).returning().get();
  },

  listAnalysisReports(): AnalysisReport[] {
    return db.select().from(analysisReports).orderBy(desc(analysisReports.createdAt)).all();
  },
};
