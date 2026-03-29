import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Zap, Clock, CheckCircle, AlertCircle, RefreshCw } from "lucide-react";
import { Link } from "wouter";

export default function VideoDetail() {
  const { id } = useParams<{ id: string }>();
  const videoId = parseInt(id!);
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [brands, setBrands] = useState("");
  const [pollingEnabled, setPollingEnabled] = useState(false);

  const { data: video, refetch: refetchVideo } = useQuery<any>({
    queryKey: ["/api/videos", videoId],
    queryFn: () => apiRequest("GET", `/api/videos/${videoId}`),
    refetchInterval: pollingEnabled ? 3000 : false,
  });

  // Poll task status when indexing
  useEffect(() => {
    if (video?.status === "indexing" || video?.status === "analyzing") {
      setPollingEnabled(true);
    } else if (video?.status === "analyzed") {
      setPollingEnabled(false);
      navigate(`/report/${videoId}`);
    } else {
      setPollingEnabled(false);
    }
  }, [video?.status]);

  // Poll Twelve Labs task status
  const pollTaskMutation = useMutation({
    mutationFn: () => apiRequest("GET", `/api/videos/${videoId}/task-status`),
    onSuccess: (data: any) => {
      if (data.status === "ready") {
        qc.invalidateQueries({ queryKey: ["/api/videos", videoId] });
        toast({ title: "Video ready", description: "You can now run analysis." });
      }
    },
  });

  const analyzeMutation = useMutation({
    mutationFn: (brandList: string[]) =>
      apiRequest("POST", `/api/videos/${videoId}/analyze`, { brands: brandList }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/videos", videoId] });
      setPollingEnabled(true);
      toast({ title: "Analysis started", description: "Scanning video for sponsor logos..." });
    },
    onError: (err: any) => {
      toast({ title: "Analysis failed", description: err.message, variant: "destructive" });
    },
  });

  if (!video) {
    return (
      <AppShell>
        <div className="shimmer rounded-lg h-48" />
      </AppShell>
    );
  }

  const brandList = brands
    .split(",")
    .map((b) => b.trim())
    .filter(Boolean);

  return (
    <AppShell>
      <div className="max-w-2xl">
        {/* Back */}
        <Link href="/">
          <a className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </a>
        </Link>

        <div className="stat-card rounded-xl p-6 space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-lg font-bold text-foreground">
              {video.gameTitle || video.originalName}
            </h1>
            <div className="flex items-center gap-3 mt-1">
              {video.broadcastNetwork && (
                <span className="text-xs text-muted-foreground">{video.broadcastNetwork}</span>
              )}
              {video.gameDate && (
                <span className="text-xs text-muted-foreground">{video.gameDate}</span>
              )}
            </div>
          </div>

          {/* Status timeline */}
          <div className="space-y-2">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Processing Status
            </h2>
            <StatusTimeline status={video.status} />
          </div>

          {/* Brands to detect */}
          {video.status === "ready" && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Target Brands (optional)</Label>
                <Input
                  placeholder="Adidas, Heineken, Emirates, Mastercard... (comma-separated)"
                  value={brands}
                  onChange={(e) => setBrands(e.target.value)}
                  data-testid="input-brands"
                />
                <p className="text-xs text-muted-foreground">
                  Leave blank to detect all visible brands automatically.
                </p>
              </div>

              <Button
                className="w-full gap-2"
                onClick={() => analyzeMutation.mutate(brandList)}
                disabled={analyzeMutation.isPending}
                data-testid="button-start-analysis"
              >
                <Zap className="w-4 h-4" />
                {analyzeMutation.isPending ? "Starting analysis..." : "Run Sponsorship Analysis"}
              </Button>
            </div>
          )}

          {/* Indexing in progress */}
          {video.status === "indexing" && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Twelve Labs is indexing your video. This typically takes 1–5 minutes depending on video length.
              </p>
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => pollTaskMutation.mutate()}
                disabled={pollTaskMutation.isPending}
                data-testid="button-check-status"
              >
                <RefreshCw className={`w-4 h-4 ${pollTaskMutation.isPending ? "animate-spin" : ""}`} />
                Check Status
              </Button>
            </div>
          )}

          {/* Analyzing */}
          {video.status === "analyzing" && (
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
              Analyzing video with Twelve Labs Pegasus 1.2... Detecting logos, banners, and signage.
            </div>
          )}

          {/* Error */}
          {video.status === "error" && (
            <div className="flex items-start gap-2 text-sm text-red-400 bg-red-500/10 rounded-lg p-3">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>Analysis failed. Try demo mode from the dashboard or check your API key.</span>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function StatusTimeline({ status }: { status: string }) {
  const steps = [
    { key: "uploaded", label: "Uploaded" },
    { key: "indexing", label: "Indexing with Twelve Labs" },
    { key: "ready", label: "Ready for Analysis" },
    { key: "analyzing", label: "Detecting Sponsors" },
    { key: "analyzed", label: "Report Ready" },
  ];

  const statusOrder = ["uploaded", "indexing", "ready", "analyzing", "analyzed"];
  const currentIdx = statusOrder.indexOf(status);

  return (
    <div className="space-y-1.5">
      {steps.map((step, i) => {
        const done = i < currentIdx;
        const active = i === currentIdx;
        const pending = i > currentIdx;

        return (
          <div key={step.key} className="flex items-center gap-3">
            <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
              done
                ? "bg-green-500/20 text-green-400"
                : active
                ? "bg-primary/20 text-primary"
                : "bg-muted text-muted-foreground"
            }`}>
              {done ? (
                <CheckCircle className="w-3.5 h-3.5" />
              ) : active && (status === "indexing" || status === "analyzing") ? (
                <RefreshCw className="w-3 h-3 animate-spin" />
              ) : (
                <span>{i + 1}</span>
              )}
            </div>
            <span className={`text-sm ${active ? "text-foreground font-medium" : done ? "text-muted-foreground" : "text-muted-foreground/50"}`}>
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
