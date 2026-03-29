import { Link } from "wouter";
import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <AppShell>
      <div className="text-center py-20">
        <div className="text-6xl font-bold text-muted mb-4">404</div>
        <h1 className="text-lg font-semibold text-foreground mb-2">Page not found</h1>
        <p className="text-sm text-muted-foreground mb-6">This page doesn't exist.</p>
        <Link href="/">
          <Button>Go to Dashboard</Button>
        </Link>
      </div>
    </AppShell>
  );
}
