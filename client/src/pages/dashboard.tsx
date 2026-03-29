import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Upload, Video, BarChart3, Clock, Eye, Trash2, Play,
  TrendingUp, Zap, AlertCircle, ChevronRight,
} from "lucide-react";

function formatDuration(sec: number | null) {
  if (!sec) return "--";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  uploaded: { label: "Uploaded", color: "bg-muted text-muted-foreground" },
  indexing: { label: "Indexing...", color: "bg-blue-500/10 text-blue-400" },
  ready: { label: "Ready", color: "bg-emerald-500/10 text-emerald-400" },
  analyzing: { label: "Analyzing...", color: "bg-amber-500/10 text-amber-400" },
  analyzed: { label: "Analyzed", color: "bg-green-500/10 text-green-400" },
  error: { label: "Error", color: "bg-red-500/10 text-red-400" },
};

export default function Dashboard() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    gameTitle: "", gameDate: "", broadcastNetwork: "", notes: "",
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const { data: videos = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/videos"],
    refetchInterval: 3000,
  });

  const { data: summary } = useQuery<any>({
    queryKey: ["/api/dashboard/summary"],
    refetchInterval: 5000,
  });

  const { data: config } = useQuery<any>({
    queryKey: ["/api/config/status"],
  });

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await fetch(`${import.meta.env.VITE_API_BASE || ""}/api/videos/upload`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Upload failed");
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/videos"] });
      qc.invalidateQueries({ queryKey: ["/api/dashboard/summary"] });
      setUploadOpen(false);
      setSelectedFile(null);
      setUploadForm({ gameTitle: "", gameDate: "", broadcastNetwork: "", notes: "" });
      toast({ title: "Video uploaded", description: "Ready to index and analyze." });
    },
    onError: (err: any) => {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/videos/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/videos"] });
      qc.invalidateQueries({ queryKey: ["/api/dashboard/summary"] });
      toast({ title: "Video deleted" });
    },
  });

  function handleFileSelect(file: File) {
    setSelectedFile(file);
    if (!uploadForm.gameTitle) {
      setUploadForm((f) => ({ ...f, gameTitle: file.name.replace(/\.[^/.]+$/, "") }));
    }
  }

  function handleUpload() {
    if (!selectedFile) return;
    const fd = new FormData();
    fd.append("video", selectedFile);
    fd.append("gameTitle", uploadForm.gameTitle);
    fd.append("gameDate", uploadForm.gameDate);
    fd.append("broadcastNetwork", uploadForm.broadcastNetwork);
    fd.append("notes", uploadForm.notes);
    uploadMutation.mutate(fd);
  }

  return (
    <AppShell>
      {/* Compliance Guardian track badge */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10">
            <span className="text-amber-400 font-bold text-sm">⚖️ Compliance Guardian</span>
            <span className="text-[10px] text-amber-400/70 font-mono">Twelve Labs Hackathon Track</span>
          </div>
          <span className="text-xs text-muted-foreground hidden sm:inline">
            Explainable AI compliance for sports broadcast ad delivery — competitive separation, frequency caps, contextual brand safety
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>
          Powered by Twelve Labs Pegasus 1.2
        </div>
      </div>

      {/* Hero stat bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          {
            label: "Videos",
            value: summary?.totalVideos ?? "--",
            icon: Video,
            color: "text-blue-400",
          },
          {
            label: "Analyzed",
            value: summary?.analyzedVideos ?? "--",
            icon: BarChart3,
            color: "text-green-400",
          },
          {
            label: "Brands Detected",
            value: summary?.uniqueBrandsDetected ?? "--",
            icon: Eye,
            color: "text-amber-400",
          },
          {
            label: "Total Exposure",
            value: summary?.totalExposureSeconds
              ? `${Math.round(summary.totalExposureSeconds)}s`
              : "--",
            icon: Clock,
            color: "text-purple-400",
          },
        ].map((stat) => (
          <div key={stat.label} className="stat-card rounded-lg p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                {stat.label}
              </span>
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
            </div>
            <div className={`text-2xl font-bold tabular-nums ${stat.color}`}>
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* Page title + actions */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-bold text-foreground">Match Video Library</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Upload football broadcast clips, detect sponsor logos across pitch, jersey &amp; broadcast, generate multi-territory ROI reports
          </p>
        </div>

        <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2" data-testid="button-upload">
              <Upload className="w-4 h-4" />
              Upload Video
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Upload Video Clip</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* Drop zone */}
              <div
                className={`upload-zone rounded-lg p-8 text-center cursor-pointer ${dragOver ? "drag-over" : ""}`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  const f = e.dataTransfer.files[0];
                  if (f) handleFileSelect(f);
                }}
                data-testid="upload-drop-zone"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                />
                {selectedFile ? (
                  <div className="text-sm">
                    <Video className="w-8 h-8 mx-auto mb-2 text-primary" />
                    <div className="font-medium text-foreground">{selectedFile.name}</div>
                    <div className="text-muted-foreground mt-1">
                      {(selectedFile.size / 1024 / 1024).toFixed(1)} MB
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    <Upload className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <div>Drop video here or click to browse</div>
                    <div className="text-xs mt-1">MP4, MOV, AVI — up to 500 MB</div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Game Title</Label>
                  <Input
                    placeholder="e.g. KC Chiefs vs Ravens"
                    value={uploadForm.gameTitle}
                    onChange={(e) => setUploadForm((f) => ({ ...f, gameTitle: e.target.value }))}
                    data-testid="input-game-title"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Game Date</Label>
                  <Input
                    type="date"
                    value={uploadForm.gameDate}
                    onChange={(e) => setUploadForm((f) => ({ ...f, gameDate: e.target.value }))}
                    data-testid="input-game-date"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Network</Label>
                  <Input
                    placeholder="CBS, NBC, ESPN..."
                    value={uploadForm.broadcastNetwork}
                    onChange={(e) => setUploadForm((f) => ({ ...f, broadcastNetwork: e.target.value }))}
                    data-testid="input-network"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Notes</Label>
                  <Input
                    placeholder="Segment notes..."
                    value={uploadForm.notes}
                    onChange={(e) => setUploadForm((f) => ({ ...f, notes: e.target.value }))}
                    data-testid="input-notes"
                  />
                </div>
              </div>

              <Button
                className="w-full gap-2"
                onClick={handleUpload}
                disabled={!selectedFile || uploadMutation.isPending}
                data-testid="button-confirm-upload"
              >
                <Upload className="w-4 h-4" />
                {uploadMutation.isPending ? "Uploading..." : "Upload Video"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Video list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="shimmer rounded-lg h-20" />
          ))}
        </div>
      ) : videos.length === 0 ? (
        <EmptyState onUpload={() => setUploadOpen(true)} />
      ) : (
        <div className="space-y-3">
          {videos.map((video: any) => (
            <VideoCard
              key={video.id}
              video={video}
              hasApiKey={config?.hasApiKey}
              onDelete={() => deleteMutation.mutate(video.id)}
            />
          ))}
        </div>
      )}

      {/* How it works */}
      <div className="mt-8 border border-border rounded-lg p-5" id="how-it-works">
        <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-400" /> How It Works
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { step: "01", title: "Upload", desc: "Upload a football broadcast clip — any match, any league, any network" },
            { step: "02", title: "Detect", desc: "Twelve Labs Pegasus 1.2 identifies every jersey sponsor, perimeter board, scoreboard overlay, VAR screen, and CTV ad break — with timestamp, confidence, context, and sentiment" },
            { step: "03", title: "Comply", desc: "Compliance engine fires: competitive separation rules suppressed via SCTE-130 POIS, frequency caps enforced across organic + paid, contextual brand safety checked against OFCOM/ASA policy" },
            { step: "04", title: "Report", desc: "Audit-ready violation log + multi-territory ROI report with residual exposure across replay, time-shifted, highlights, and VOD windows" },
          ].map((item) => (
            <div key={item.step} className="flex gap-3">
              <div className="text-xs font-bold text-primary/60 font-mono mt-0.5 w-6 shrink-0">
                {item.step}
              </div>
              <div>
                <div className="text-sm font-semibold text-foreground">{item.title}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-border/40 flex items-center justify-between flex-wrap gap-2">
          <p className="text-xs text-muted-foreground">
            Built on SCTE-35 · DVB-TA · IAB OpenRTB · LEAP · Deals API · Content Taxonomy 3.1 · CIMM · SMPTE OBID · SonicOrigin · C2PA
          </p>
          <Link href="/ecosystem">
            <a className="text-xs text-primary hover:underline">
              View Standards &amp; Ecosystem Architecture →
            </a>
          </Link>
        </div>
      </div>
    </AppShell>
  );
}

function EmptyState({ onUpload }: { onUpload: () => void }) {
  return (
    <div className="stat-card rounded-xl p-12 text-center">
      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
        <Video className="w-6 h-6 text-primary" />
      </div>
      <h3 className="text-base font-semibold text-foreground mb-1">No clips yet</h3>
      <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
        Upload a football broadcast clip to detect sponsor logos and generate a multi-territory ROI report across 6 global markets.
      </p>
      <Button onClick={onUpload} className="gap-2">
        <Upload className="w-4 h-4" /> Upload Your First Clip
      </Button>
    </div>
  );
}

function VideoCard({
  video,
  hasApiKey,
  onDelete,
}: {
  video: any;
  hasApiKey: boolean;
  onDelete: () => void;
}) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const statusConfig = STATUS_CONFIG[video.status] || STATUS_CONFIG.uploaded;

  const indexMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/videos/${video.id}/index`),
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ["/api/videos"] });
      toast({ title: "Indexing started", description: `Task ID: ${data.taskId}` });
    },
    onError: (err: any) => {
      toast({ title: "Index failed", description: err.message, variant: "destructive" });
    },
  });

  const demoMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/videos/${video.id}/demo-analyze`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/videos"] });
      qc.invalidateQueries({ queryKey: ["/api/dashboard/summary"] });
      toast({ title: "Demo analysis complete", description: "Sample NFL sponsor data loaded." });
    },
    onError: (err: any) => {
      toast({ title: "Demo failed", description: err.message, variant: "destructive" });
    },
  });

  return (
    <div className="stat-card rounded-lg p-4 flex items-center gap-4" data-testid={`card-video-${video.id}`}>
      {/* Thumbnail placeholder */}
      <div className="w-16 h-12 rounded bg-muted flex items-center justify-center shrink-0">
        <Video className="w-5 h-5 text-muted-foreground" />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-foreground truncate">
            {video.gameTitle || video.originalName}
          </span>
          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${statusConfig.color}`}>
            {statusConfig.label}
            {(video.status === "indexing" || video.status === "analyzing") && (
              <span className="ml-1 inline-block w-1 h-1 rounded-full bg-current pulse-dot" />
            )}
          </span>
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          {video.broadcastNetwork && (
            <span className="text-xs text-muted-foreground">{video.broadcastNetwork}</span>
          )}
          {video.gameDate && (
            <span className="text-xs text-muted-foreground">{video.gameDate}</span>
          )}
          {video.duration && (
            <span className="text-xs text-muted-foreground font-mono">
              {formatDuration(video.duration)}
            </span>
          )}
          <span className="text-xs text-muted-foreground">{formatDate(video.uploadedAt)}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 shrink-0">
        {video.status === "analyzed" && (
          <Link href={`/report/${video.id}`}>
            <Button size="sm" variant="default" className="h-7 text-xs gap-1.5" data-testid={`button-report-${video.id}`}>
              <BarChart3 className="w-3.5 h-3.5" />
              ROI Report
            </Button>
          </Link>
        )}

        {video.status === "uploaded" && (
          <>
            {hasApiKey ? (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1.5"
                onClick={() => indexMutation.mutate()}
                disabled={indexMutation.isPending}
                data-testid={`button-index-${video.id}`}
              >
                <Zap className="w-3.5 h-3.5" />
                Index
              </Button>
            ) : null}
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1.5 border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
              onClick={() => demoMutation.mutate()}
              disabled={demoMutation.isPending}
              data-testid={`button-demo-${video.id}`}
            >
              <Play className="w-3.5 h-3.5" />
              Demo Mode
            </Button>
          </>
        )}

        {video.status === "ready" && (
          <Link href={`/video/${video.id}`}>
            <Button size="sm" className="h-7 text-xs gap-1.5" data-testid={`button-analyze-${video.id}`}>
              <TrendingUp className="w-3.5 h-3.5" />
              Analyze
            </Button>
          </Link>
        )}

        {video.status === "error" && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1.5 border-amber-500/30 text-amber-400"
            onClick={() => demoMutation.mutate()}
            data-testid={`button-retry-demo-${video.id}`}
          >
            <Play className="w-3.5 h-3.5" />
            Demo Mode
          </Button>
        )}

        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 text-muted-foreground hover:text-red-400"
          onClick={onDelete}
          data-testid={`button-delete-${video.id}`}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}
