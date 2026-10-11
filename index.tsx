import { createFileRoute, Link } from "@tanstack/react-router";
import {
  CalendarClock,
  Flame,
  Plane,
  PiggyBank,
  TrendingDown,
  TrendingUp,
  Wallet,
  CalendarDays,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { formatINR, isCommitmentRemaining, isSubscriptionRemaining, round } from "@/engine";
import { usePace } from "@/state/PaceProvider";
import { CountUp } from "@/components/CountUp";
import { Card, StatCard } from "@/components/StatCard";
import { HealthChip, RiskChip } from "@/components/Chips";
import { RunwayStrip } from "@/components/RunwayStrip";
import { QuickWhatIf } from "@/components/QuickWhatIf";
import { Button } from "@/components/ui/button";
import { CATEGORY_META, QUICK_ADD } from "@/lib/categories";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Home — Pace" },
      {
        name: "description",
        content:
          "Your 30-day money runway: balance, safe-to-spend, daily allowance and day-30 forecast.",
      },
      { property: "og:title", content: "Pace — Make your money move" },
      {
        property: "og:description",
        content: "See what a decision does to your month before you make it.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

function greeting(): string {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

function Home() {
  const { state, metrics, advance, addTransaction, undo } = usePace();
  const d = state.profile.day;
  const nextBills = [
    ...state.commitments
      .filter((c) => isCommitmentRemaining(c, d))
      .map((c) => ({
        id: c.id,
        label: c.label,
        amount: c.amount,
        day: c.dueDay,
        late: c.status === "late",
      })),
    ...state.subscriptions
      .filter((s) => isSubscriptionRemaining(s, d))
      .map((s) => ({ id: s.id, label: s.label, amount: s.amount, day: s.renewDay, late: false })),
  ]
    .sort((a, b) => a.day - b.day)
    .slice(0, 3);
  const budget = state.profile.baselineDaily * 30;
  const stsPct = budget > 0 ? round((metrics.safeToSpend / budget) * 100) : 0;

  let todayMsg: string;
  if (state.balance <= 0)
    todayMsg =
      "Your balance is at zero or below. Pause wants, and check Simulate to delay a bill or dip into a goal.";
  else if (metrics.safeToSpend < 0)
    todayMsg = `You're ${formatINR(-metrics.safeToSpend)} into your safety buffer. A no-spend day or two gets you back.`;
  else
    todayMsg = `Your safe-to-spend is ${stsPct}% of your budget. That's ${formatINR(metrics.dailyAllowance)} a day for ${metrics.daysLeft} days.`;

  const onAdvance = () => {
    const notes = advance();
    if (notes.length === 0) toast.success(`Welcome to day ${Math.min(30, d + 1)}.`);
    notes.forEach((n) => toast(n));
  };

  const fcUp = metrics.forecastChangePct >= 0;

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold sm:text-4xl">
            {greeting()}, {state.profile.name || "there"} 👋
          </h1>
          <p className="text-muted-foreground">Small steps. Big goals.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <RiskChip risk={metrics.risk} />
          <HealthChip health={metrics.health} />
        </div>
      </div>

      {state.monthFinished && (
        <Link
          to="/report"
          className="flex items-center justify-between rounded-2xl bg-primary p-4 font-semibold text-primary-foreground"
        >
          <span className="flex items-center gap-2">
            <FileText className="size-5" aria-hidden="true" /> Month complete. Your Runway Report is
            ready.
          </span>
          <span aria-hidden="true">→</span>
        </Link>
      )}

      <section
        aria-labelledby="runway-title"
        className="ticket rounded-3xl bg-sky p-5 text-nav-foreground shadow-lift sm:p-6"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-widest opacity-80">Your runway</p>
            <h2 id="runway-title" className="font-display text-2xl font-bold">
              Day {d} of 30 · {metrics.daysLeft} {metrics.daysLeft === 1 ? "day" : "days"} to go
            </h2>
          </div>
          <Button
            size="lg"
            className="rounded-full"
            onClick={onAdvance}
            disabled={!!state.pendingEvent || state.monthFinished}
          >
            <Plane aria-hidden="true" />{" "}
            {state.monthFinished ? "Month finished" : d === 30 ? "Finish month" : "Advance day"}
          </Button>
        </div>
        <div className="mt-4">
          <RunwayStrip state={state} />
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-live="polite">
        <StatCard
          label="Current balance"
          icon={<Wallet className="size-4" />}
          value={<CountUp value={metrics.balance} />}
          tone={metrics.balance < 0 ? "risk" : "default"}
        />
        <StatCard
          label="Safe to spend"
          icon={<PiggyBank className="size-4" />}
          value={<CountUp value={metrics.safeToSpend} />}
          tone={metrics.safeToSpend < 0 ? "risk" : "safe"}
          hint="After bills, goals and buffer"
        />
        <StatCard
          label="Daily allowance"
          icon={<CalendarDays className="size-4" />}
          value={<CountUp value={metrics.dailyAllowance} />}
          hint={`For ${metrics.daysLeft} days`}
        />
        <StatCard
          label="Day-30 forecast"
          icon={fcUp ? <TrendingUp className="size-4" /> : <TrendingDown className="size-4" />}
          value={<CountUp value={metrics.forecast} />}
          tone={metrics.forecast < 0 ? "risk" : "default"}
          hint={`${fcUp ? "Up" : "Down"} ${Math.abs(round(metrics.forecastChangePct))}% vs opening`}
        />
      </div>

      <QuickWhatIf />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card
          title="Next bills"
          action={
            <Link
              to="/plan"
              className="text-sm font-medium text-lilac-text underline-offset-4 hover:underline"
            >
              See plan
            </Link>
          }
        >
          {nextBills.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No bills left this month. Enjoy the clear skies.
            </p>
          ) : (
            <ul className="grid gap-2">
              {nextBills.map((b) => (
                <li
                  key={b.id}
                  className="flex items-center justify-between gap-2 rounded-xl bg-muted px-3 py-2"
                >
                  <span className="flex items-center gap-2 text-sm">
                    <CalendarClock className="size-4 text-muted-foreground" aria-hidden="true" />
                    {b.label}
                    <span
                      className={
                        b.late
                          ? "text-xs font-medium text-risk-text"
                          : "text-xs text-muted-foreground"
                      }
                    >
                      {b.late ? "Late" : `Day ${b.day}`}
                    </span>
                  </span>
                  <span className="text-sm font-semibold money">{formatINR(b.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Today">
          <p className="text-sm">{todayMsg}</p>
          <div className="mt-4 flex items-center gap-3 rounded-xl bg-muted p-3">
            <Flame className="size-6 text-risk-text" aria-hidden="true" />
            <div>
              <p className="font-display text-xl font-bold money">
                {state.streak} {state.streak === 1 ? "day" : "days"}
              </p>
              <p className="text-xs text-muted-foreground">No-spend streak (no wants)</p>
            </div>
          </div>
        </Card>

        <Card title="Quick add">
          <ul className="grid grid-cols-3 gap-2">
            {QUICK_ADD.map((q) => (
              <li key={q.category}>
                <button
                  type="button"
                  className="flex w-full flex-col items-center gap-1 rounded-xl bg-muted px-2 py-3 text-xs transition-colors hover:bg-accent"
                  aria-label={`Add ${CATEGORY_META[q.category].label} ${formatINR(q.amount)} as a ${q.type}`}
                  onClick={() => {
                    addTransaction({
                      amount: q.amount,
                      category: q.category,
                      type: q.type,
                      label: CATEGORY_META[q.category].label,
                    });
                    toast.success(
                      `Added ${CATEGORY_META[q.category].label} ${formatINR(q.amount)}`,
                      { action: { label: "Undo", onClick: undo } },
                    );
                  }}
                >
                  <span className="text-xl" aria-hidden="true">
                    {CATEGORY_META[q.category].emoji}
                  </span>
                  <span className="font-medium">{CATEGORY_META[q.category].label}</span>
                  <span className="money text-muted-foreground">{formatINR(q.amount)}</span>
                </button>
              </li>
            ))}
          </ul>
          <Link
            to="/activity"
            className="mt-3 inline-block text-sm font-medium text-lilac-text underline-offset-4 hover:underline"
          >
            Custom amount
          </Link>
        </Card>
      </div>
    </div>
  );
}
