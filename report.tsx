import { createFileRoute, Link } from "@tanstack/react-router";
import { Download, Lock, Plane, ThumbsDown, ThumbsUp } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { buildReport, formatINR, gradeMonth } from "@/engine";
import { usePace } from "@/state/PaceProvider";
import { Card } from "@/components/StatCard";
import { HealthRing } from "@/components/HealthRing";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/report")({
  head: () => ({
    meta: [
      { title: "Runway Report — Pace" },
      {
        name: "description",
        content:
          "Your month in review: final health score, best and worst decisions, and what you could have saved.",
      },
      { property: "og:title", content: "Runway Report — Pace" },
      { property: "og:description", content: "Your month in review, ready to share." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Report,
});

function Report() {
  const { state, metrics } = usePace();
  const [preview, setPreview] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const r = buildReport(state);

  if (!state.monthFinished && !preview) {
    return (
      <Card className="mx-auto max-w-md text-center">
        <Lock className="mx-auto size-8 text-lilac-text" aria-hidden="true" />
        <h1 className="mt-3 text-2xl font-bold">Your report unlocks on day 30</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You're on day {state.profile.day}. Keep advancing, or take a peek now.
        </p>
        <div className="mt-5 flex justify-center gap-2">
          <Button className="rounded-full" onClick={() => setPreview(true)}>
            Preview report
          </Button>
          <Button variant="outline" className="rounded-full" asChild>
            <Link to="/">Back home</Link>
          </Button>
        </div>
      </Card>
    );
  }

  const download = async () => {
    if (!cardRef.current) return;
    try {
      const { toPng } = await import("html-to-image");
      const url = await toPng(cardRef.current, { pixelRatio: 2, cacheBust: true });
      const a = document.createElement("a");
      a.href = url;
      a.download = "pace-runway-report.png";
      a.click();
      toast.success("Report saved as an image.");
    } catch {
      toast.error("Couldn't create the image. Try again, or take a screenshot instead.");
    }
  };

  const dec = (label: string, d: typeof r.bestDecision, Icon: typeof ThumbsUp) => (
    <Card
      title={
        <span className="flex items-center gap-2">
          <Icon className="size-5" aria-hidden="true" />
          {label}
        </span>
      }
    >
      {d ? (
        <>
          <p className="font-medium">{d.label}</p>
          <p className="text-sm text-muted-foreground money">
            Day {d.day} · {formatINR(d.moneyImpact, { sign: true })} ·{" "}
            {d.healthImpact >= 0 ? "+" : ""}
            {d.healthImpact} health pts
          </p>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          Commit a scenario or handle a surprise to see this.
        </p>
      )}
    </Card>
  );

  return (
    <div className="grid gap-5">
      <div>
        <h1 className="text-3xl font-bold">Runway Report</h1>
        <p className="text-muted-foreground">
          {state.monthFinished
            ? "Month complete. Here's how you flew."
            : `Preview as of day ${state.profile.day}.`}
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Card title="Final health" className="flex flex-col items-center">
          <HealthRing score={metrics.health.score} label={metrics.health.label} />
          <p className="mt-2 rounded-full bg-primary px-3 py-1 text-sm font-bold text-primary-foreground">
            Grade {gradeMonth(metrics.health.score, metrics.balance)}
          </p>
        </Card>
        {dec("Best decision", r.bestDecision, ThumbsUp)}
        {dec("Worst decision", r.worstDecision, ThumbsDown)}
      </div>
      <Card>
        <p className="text-sm text-muted-foreground">You could have saved</p>
        <p className="font-display text-4xl font-bold text-safe-text money">
          {formatINR(r.couldHaveSaved)}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          By cancelling subscriptions ({formatINR(r.subscriptionsSpend)} spent) and halving wants (
          {formatINR(r.wantsSpend)} spent).
        </p>
      </Card>

      <div
        ref={cardRef}
        className="ticket mx-auto w-full max-w-lg rounded-3xl bg-sky p-6 text-nav-foreground shadow-lift"
      >
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-2 font-display text-xl font-bold">
            <Plane className="size-5 -rotate-45" aria-hidden="true" /> pace
          </p>
          <p className="text-xs uppercase tracking-widest opacity-80">Runway report</p>
        </div>
        <p className="mt-4 text-sm opacity-80">Passenger</p>
        <p className="font-display text-2xl font-bold">{state.profile.name || "You"}</p>
        <div className="mt-4 grid grid-cols-3 gap-3 money">
          <div>
            <p className="text-xs opacity-80">Health</p>
            <p className="font-display text-2xl font-bold">{metrics.health.score}</p>
          </div>
          <div>
            <p className="text-xs opacity-80">Landed with</p>
            <p className="font-display text-2xl font-bold">{formatINR(state.balance)}</p>
          </div>
          <div>
            <p className="text-xs opacity-80">Streak</p>
            <p className="font-display text-2xl font-bold">{r.noSpendStreak}d</p>
          </div>
        </div>
        <div className="perforation my-4 opacity-60" />
        <p className="text-sm">
          Day 1 → Day {state.profile.day} · {r.shocks} surprises handled · could save{" "}
          {formatINR(r.couldHaveSaved)}
        </p>
      </div>
      <div className="flex justify-center">
        <Button className="rounded-full" onClick={() => void download()}>
          <Download aria-hidden="true" /> Download as image
        </Button>
      </div>
    </div>
  );
}
