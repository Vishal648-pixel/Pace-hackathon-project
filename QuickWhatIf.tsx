import { useId, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { applyScenario, computeMetrics, formatINR, round } from "@/engine";
import { usePace } from "@/state/PaceProvider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const PRESETS = [
  { label: "Chai & snacks", amount: 150 },
  { label: "Dinner out", amount: 600 },
  { label: "Concert ticket", amount: 1500 },
  { label: "New sneakers", amount: 3500 },
];

/** Live "can I afford this?" slider: previews every metric before you spend. */
export function QuickWhatIf() {
  const { state, metrics, addTransaction, undo } = usePace();
  const id = useId();
  const [amount, setAmount] = useState(600);
  const [label, setLabel] = useState("Dinner out");

  const after = useMemo(() => {
    const { state: next } = applyScenario(state, {
      kind: "purchase",
      amount,
      day: state.profile.day,
      label,
    });
    return computeMetrics(next);
  }, [state, amount, label]);

  const rows = [
    { k: "Safe to spend", b: metrics.safeToSpend, a: after.safeToSpend, money: true, up: true },
    {
      k: "Daily allowance",
      b: metrics.dailyAllowance,
      a: after.dailyAllowance,
      money: true,
      up: true,
    },
    { k: "Health", b: metrics.health.score, a: after.health.score, money: false, up: true },
    { k: "Risk", b: metrics.risk.score, a: after.risk.score, money: false, up: false },
  ];
  const verdict =
    after.safeToSpend < 0
      ? {
          text: "This pushes you past safe-to-spend. Bills or goals would be at risk.",
          tone: "risk",
        }
      : after.risk.score - metrics.risk.score >= 10
        ? { text: "Affordable, but your risk jumps noticeably.", tone: "warn" }
        : { text: "Comfortably within your plan.", tone: "safe" };

  return (
    <section
      aria-labelledby={`${id}-h`}
      className="rounded-3xl border border-border bg-card p-4 shadow-lift sm:p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id={`${id}-h`} className="flex items-center gap-2 font-display text-lg font-semibold">
          <Sparkles className="size-5 text-lilac-text" aria-hidden="true" /> Can I afford it?
        </h2>
        <Link
          to="/simulate"
          className="text-sm font-medium text-lilac-text underline-offset-4 hover:underline"
        >
          More scenarios
        </Link>
      </div>

      <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Quick presets">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            type="button"
            aria-pressed={label === p.label && amount === p.amount}
            onClick={() => {
              setLabel(p.label);
              setAmount(p.amount);
            }}
            className="rounded-full border border-input px-3 py-1.5 text-sm transition-colors hover:bg-accent aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground"
          >
            {p.label} · <span className="money">{formatINR(p.amount)}</span>
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-[1fr_1.2fr] md:items-center">
        <div>
          <label htmlFor={`${id}-r`} className="flex items-baseline justify-between text-sm">
            <span className="text-muted-foreground">Amount</span>
            <span className="font-display text-2xl font-bold money">{formatINR(amount)}</span>
          </label>
          <input
            id={`${id}-r`}
            type="range"
            min={50}
            max={5000}
            step={50}
            value={amount}
            onChange={(e) => {
              setAmount(Number(e.target.value));
              setLabel("Something");
            }}
            className="mt-2 w-full accent-primary"
          />
          <p
            aria-live="polite"
            className={cn(
              "mt-2 rounded-xl px-3 py-2 text-sm",
              verdict.tone === "safe" && "bg-safe/15 text-safe-text",
              verdict.tone === "warn" && "bg-muted text-foreground",
              verdict.tone === "risk" && "bg-risk/15 text-risk-text",
            )}
          >
            {verdict.text}
          </p>
        </div>

        <dl className="grid grid-cols-2 gap-2">
          {rows.map((r) => {
            const d = r.a - r.b;
            const good = Math.abs(d) < 0.5 ? null : d > 0 === r.up;
            return (
              <div key={r.k} className="rounded-xl bg-muted p-3">
                <dt className="text-xs text-muted-foreground">{r.k}</dt>
                <dd className="mt-1 flex flex-wrap items-baseline gap-x-2">
                  <span className="font-semibold money">
                    {r.money ? formatINR(r.a) : round(r.a)}
                  </span>
                  <span
                    className={cn(
                      "text-xs money",
                      good === null && "text-muted-foreground",
                      good === true && "text-safe-text",
                      good === false && "text-risk-text",
                    )}
                  >
                    {Math.abs(d) < 0.5
                      ? "no change"
                      : `${d > 0 ? "+" : "−"}${r.money ? formatINR(Math.abs(d)) : round(Math.abs(d))}`}
                  </span>
                </dd>
              </div>
            );
          })}
        </dl>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          onClick={() => {
            addTransaction({ amount, category: "shopping", type: "want", label });
            toast.success(`Logged ${label} ${formatINR(amount)}`, {
              action: { label: "Undo", onClick: undo },
            });
          }}
        >
          Buy it
        </Button>
        <Button
          variant="outline"
          onClick={() => toast(`Nice. Skipping keeps ${formatINR(amount)} in your pocket.`)}
        >
          Skip it
        </Button>
      </div>
    </section>
  );
}
