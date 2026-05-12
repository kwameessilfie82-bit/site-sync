import Link from "next/link";
import { Button } from "@/ui/primitives/button";

export default function HomePage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-20">
      <div className="max-w-lg text-center space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight">Site Sync</h1>
        <p className="text-muted-foreground leading-relaxed">
          Know who is on which site across projects. Check-ins, geofenced sites, supervisor
          attestation, incidents, and lightweight asset tracking — backed by Supabase.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button asChild>
          <Link href="/login">Sign in</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/signup">Create account</Link>
        </Button>
      </div>
    </div>
  );
}
