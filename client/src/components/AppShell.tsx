import { Link, useLocation } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

// Logo SVG
function LogoMark() {
  return (
    <svg aria-label="NFL Sponsor Detector" viewBox="0 0 36 36" className="w-8 h-8" fill="none">
      {/* Shield shape */}
      <path d="M18 3L4 9v10c0 7.5 5.6 14.5 14 16.5C26.4 33.5 32 26.5 32 19V9L18 3z"
        fill="hsl(213 94% 55% / 0.15)" stroke="hsl(213 94% 55%)" strokeWidth="1.5"/>
      {/* Eye / lens */}
      <circle cx="18" cy="18" r="5" fill="none" stroke="hsl(36 100% 55%)" strokeWidth="1.5"/>
      <circle cx="18" cy="18" r="2" fill="hsl(36 100% 55%)"/>
      {/* Scan lines */}
      <line x1="8" y1="18" x2="13" y2="18" stroke="hsl(213 94% 55%)" strokeWidth="1" strokeLinecap="round"/>
      <line x1="23" y1="18" x2="28" y2="18" stroke="hsl(213 94% 55%)" strokeWidth="1" strokeLinecap="round"/>
    </svg>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [location] = useHashLocation();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [apiKeyOpen, setApiKeyOpen] = useState(false);

  const { data: config } = useQuery({
    queryKey: ["/api/config/status"],
    refetchInterval: 10000,
  });

  const saveKeyMutation = useMutation({
    mutationFn: (apiKey: string) =>
      apiRequest("POST", "/api/config", { apiKey }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/config/status"] });
      setApiKeyOpen(false);
      toast({ title: "API key saved", description: "Twelve Labs API key configured for this session." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="app-header sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <Link href="/">
              <a className="flex items-center gap-3 group">
                <LogoMark />
                <div>
                  <div className="text-sm font-bold text-white leading-none tracking-wide">
                    SPONSOR<span className="text-[hsl(213_94%_65%)]">SCAN</span><span className="text-[hsl(36_100%_60%)]">⚽</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground tracking-wider uppercase leading-none mt-0.5">
                    Global Football Sponsor Intelligence
                  </div>
                </div>
              </a>
            </Link>

            <nav className="hidden sm:flex items-center gap-1">
              <Link href="/">
                <a className={`px-3 py-1.5 text-xs rounded font-medium transition-colors ${
                  location === "/" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
                }`}>
                  Dashboard
                </a>
              </Link>
              <Link href="/ecosystem">
                <a className={`px-3 py-1.5 text-xs rounded font-medium transition-colors ${
                  location === "/ecosystem" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
                }`}>
                  Ecosystem
                </a>
              </Link>
            </nav>

            <div className="flex items-center gap-2">
              {/* API key status */}
              <Dialog open={apiKeyOpen} onOpenChange={setApiKeyOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5"
                    data-testid="button-api-key">
                    <span className={`w-1.5 h-1.5 rounded-full ${(config as any)?.hasApiKey ? "bg-green-400" : "bg-amber-400 pulse-dot"}`} />
                    {(config as any)?.hasApiKey ? "API Key Set" : "Set API Key"}
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Twelve Labs API Key</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Enter your Twelve Labs API key to enable real video analysis.
                      Without a key, you can still use demo mode with sample NFL data.
                    </p>
                    <div className="space-y-2">
                      <Label htmlFor="api-key">API Key</Label>
                      <Input
                        id="api-key"
                        data-testid="input-api-key"
                        type="password"
                        placeholder="tlk_..."
                        value={apiKeyInput}
                        onChange={(e) => setApiKeyInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && saveKeyMutation.mutate(apiKeyInput)}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        className="flex-1"
                        onClick={() => saveKeyMutation.mutate(apiKeyInput)}
                        disabled={!apiKeyInput || saveKeyMutation.isPending}
                        data-testid="button-save-api-key"
                      >
                        Save Key
                      </Button>
                      <Button variant="outline" onClick={() => setApiKeyOpen(false)}>
                        Cancel
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Get your key at{" "}
                      <a href="https://playground.twelvelabs.io" target="_blank"
                        className="text-primary underline">
                        playground.twelvelabs.io
                      </a>. Without a key, use Demo Mode to explore with simulated match data.
                    </p>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-xs text-muted-foreground text-center">
            Powered by{" "}
            <a href="https://twelvelabs.io" target="_blank" className="text-primary hover:underline">
              Twelve Labs Pegasus 1.2
            </a>{" "}
            · Global football sponsorship ROI · Multi-territory CPM · Demo for XR / SonicOrigin · Twelve Labs Hackathon 2026 ·{" "}
            <a href="/#/ecosystem" className="text-primary hover:underline">Standards Architecture</a>
          </p>
        </div>
      </footer>
    </div>
  );
}
