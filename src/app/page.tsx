import Link from "next/link";
import {
  ArrowRight,
  ClipboardCheck,
  HardHat,
  MapPin,
  RadioTower,
  Shield,
  Truck,
} from "lucide-react";
import { MarketingHeader } from "@/components/public-chrome";
import { Badge } from "@/ui/primitives/badge";
import { Button } from "@/ui/primitives/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/ui/primitives/card";
import { Separator } from "@/ui/primitives/separator";

const features = [
  {
    icon: MapPin,
    title: "Sites & geofences",
    description:
      "Define site boundaries and validate clock-ins with GPS when it matters for compliance.",
  },
  {
    icon: ClipboardCheck,
    title: "Attendance you can trust",
    description:
      "Clock in/out flows, live roster visibility, and exports that supervisors can stand behind.",
  },
  {
    icon: RadioTower,
    title: "Live operations",
    description:
      "See who is on site now across projects — fewer radio checks, fewer surprises.",
  },
  {
    icon: Shield,
    title: "Incidents & audit",
    description:
      "Log incidents with severity, tie actions to people and projects, and keep an append-only trail.",
  },
  {
    icon: Truck,
    title: "Asset checkout",
    description:
      "Lightweight tool accountability so crews know who signed out critical equipment.",
  },
  {
    icon: HardHat,
    title: "Built for field teams",
    description:
      "Technician IDs, trades, and roster assignments aligned with how crews actually work.",
  },
];

export default function HomePage() {
  return (
    <div className="flex min-h-svh flex-col bg-background">
      <MarketingHeader />

      <main className="flex flex-1 flex-col">
        <section className="relative overflow-hidden border-b bg-gradient-to-b from-muted/60 via-background to-background px-4 py-16 sm:px-6 sm:py-24 lg:py-28 dark:from-muted/25">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,var(--color-primary)/0.15,transparent)] dark:bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,var(--color-primary)/0.22,transparent)]" />
          <div className="relative mx-auto max-w-6xl">
            <div className="mx-auto max-w-3xl text-center">
              <Badge variant="secondary" className="mb-4 px-3 py-1">
                Field attendance & accountability
              </Badge>
              <h1 className="font-heading text-balance text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
                Know who is on which site —{" "}
                <span className="text-muted-foreground">across every project.</span>
              </h1>
              <p className="mx-auto mt-5 max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
                Construction workforce check-in, multi-project visibility, incidents, and lightweight
                asset tracking — backed by Supabase with a dashboard your team will actually use.
              </p>
              <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
                <Button size="lg" className="gap-2 px-8 shadow-md" asChild>
                  <Link href="/signup">
                    Start free <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="border-border/80 bg-background/50 backdrop-blur-sm" asChild>
                  <Link href="/login">Sign in</Link>
                </Button>
              </div>
            </div>

            <div className="mx-auto mt-16 grid max-w-5xl gap-4 sm:grid-cols-3">
              <Card className="border-border/80 bg-card/80 shadow-sm backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Multi-project
                  </CardTitle>
                  <CardDescription>Sites, people, and attendance unified per organization.</CardDescription>
                </CardHeader>
                <CardContent className="text-2xl font-semibold tabular-nums tracking-tight">
                  One pane
                </CardContent>
              </Card>
              <Card className="border-border/80 bg-card/80 shadow-sm backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Field-ready
                  </CardTitle>
                  <CardDescription>Token links for sites and optional geofence validation.</CardDescription>
                </CardHeader>
                <CardContent className="text-2xl font-semibold tabular-nums tracking-tight">
                  QR + GPS
                </CardContent>
              </Card>
              <Card className="border-border/80 bg-card/80 shadow-sm backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Accountability
                  </CardTitle>
                  <CardDescription>
                    Owner and PM visibility into critical actions and incidents.
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-2xl font-semibold tabular-nums tracking-tight">
                  Audit trail
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
              Everything operations needs
            </h2>
            <p className="mt-3 text-muted-foreground">
              Polished UI primitives throughout — cards, tables, sidebars, and feedback that stay
              consistent in light and dark mode.
            </p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(({ icon: Icon, title, description }) => (
              <Card
                key={title}
                className="border-border/80 transition-colors hover:border-primary/25 hover:bg-muted/30"
              >
                <CardHeader>
                  <div className="mb-2 flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="size-5" />
                  </div>
                  <CardTitle className="text-base">{title}</CardTitle>
                  <CardDescription className="leading-relaxed">{description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </section>

        <section className="border-t bg-muted/40 px-4 py-16 dark:bg-muted/20 sm:px-6">
          <Card className="mx-auto max-w-4xl overflow-hidden border-border/80 shadow-lg">
            <CardHeader className="gap-2 border-b bg-card px-6 py-8 text-center sm:px-10">
              <CardTitle className="font-heading text-2xl sm:text-3xl">
                Ready to sync your sites?
              </CardTitle>
              <CardDescription className="text-base">
                Create an organization, invite your team, and ship attendance visibility this week.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4 px-6 py-8 sm:flex-row sm:justify-center sm:px-10">
              <Button size="lg" className="w-full min-w-[200px] gap-2 sm:w-auto" asChild>
                <Link href="/signup">
                  Create account <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Separator className="sm:hidden" />
              <Button size="lg" variant="outline" className="w-full min-w-[200px] sm:w-auto" asChild>
                <Link href="/login">Already using Site Sync?</Link>
              </Button>
            </CardContent>
          </Card>
        </section>

        <footer className="border-t py-10">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 text-center text-sm text-muted-foreground sm:flex-row sm:text-left">
            <p>© {new Date().getFullYear()} Site Sync. Built for crews who work in the real world.</p>
            <div className="flex gap-6">
              <Link href="/login" className="hover:text-foreground">
                Sign in
              </Link>
              <Link href="/signup" className="hover:text-foreground">
                Sign up
              </Link>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
