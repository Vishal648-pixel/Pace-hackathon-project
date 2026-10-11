import { createFileRoute, Link } from "@tanstack/react-router";
import { FileText } from "lucide-react";
import {
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { forecastSeries, formatINR, MONTH_DAYS, type Category } from "@/engine";
import { usePace } from "@/state/PaceProvider";
import { Card } from "@/components/StatCard";
import { HealthRing } from "@/components/HealthRing";
import { RiskChip } from "@/components/Chips";
import { Progress } from "@/components/ui/progress";
import { CATEGORY_META } from "@/lib/categories";

export const Route = createFileRoute("/insights")({
  head: () => ({
    meta: [
      { title: "Insights — Pace" },
      {
        name: "description",
        content: "Health score, spending by category, risk drivers and your 30-day balance chart.",
      },
      { property: "og:title", content: "Insights — Pace" },
      { property: "og:description", content: "Health, spending and risk at a glance." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Insights,
});

function Insights() {
  const { state, metrics } = usePace();
  const byCat = new Map<Category, number>();
  for (const t of state.transactions)
    if (t.amount < 0 && t.source !== "goal")
      byCat.set(t.category, (byCat.get(t.category) ?? 0) - t.amount);
  const pie = [...byCat.entries()].map(([k, v]) => ({
    key: k,
    name: CATEGORY_META[k].label,
    value: v,
    color: CATEGORY_META[k].color,
  }));

  const fc = forecastSeries(state);
  const line = Array.from({ length: MONTH_DAYS + 1 }, (_, d) => {
    const actual =
      d < state.profile.day
        ? state.balanceHistory[d]
        : d === state.profile.day - 1
          ? state.balance
          : undefined;
    const f = d === state.profile.day - 1 ? state.balance : fc.find((p) => p.day === d)?.balance;
    return {
      day: d,
      actual: typeof actual === "number" ? Math.round(actual) : null,
      forecast: typeof f === "number" ? Math.round(f) : null,
    };
  });

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Insights</h1>
          <p className="text-muted-foreground">What's working, and what to tune.</p>
        </div>
        <Link
          to="/report"
          className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        >
          <FileText className="size-4" aria-hidden="true" />{" "}
          {state.monthFinished ? "View report" : "Preview report"}
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Financial health">
          <div className="flex flex-wrap items-center gap-5">
            <HealthRing score={metrics.health.score} label={metrics.health.label} />
            <ul className="grid min-w-48 flex-1 gap-2">
              {metrics.health.components.map((c) => (
                <li key={c.key}>
                  <div className="flex justify-between text-sm">
                    <span>{c.label}</span>
                    <span className="money font-medium">
                      {c.earned}/{c.max}
                    </span>
                  </div>
                  <Progress
                    value={(c.earned / c.max) * 100}
                    className="h-1.5"
                    aria-label={`${c.label} ${c.earned} of ${c.max}`}
                  />
                </li>
              ))}
            </ul>
          </div>
          {metrics.health.suggestions.length > 0 && (
            <ul className="mt-4 grid gap-1.5 text-sm">
              {metrics.health.suggestions.map((s) => (
                <li key={s} className="rounded-lg bg-muted px-3 py-2">
                  {s}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Spending by category">
          {pie.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No spending yet. Advance a day or add a transaction to see the split.
            </p>
          ) : (
            <div className="grid items-center gap-4 sm:grid-cols-2">
              <div
                className="h-52"
                role="img"
                aria-label={`Donut chart of spending: ${pie.map((p) => `${p.name} ${formatINR(p.value)}`).join(", ")}`}
              >
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={pie}
                      dataKey="value"
                      nameKey="name"
                      innerRadius="60%"
                      outerRadius="95%"
                      stroke="var(--card)"
                      strokeWidth={2}
                      isAnimationActive={false}
                    >
                      {pie.map((p) => (
                        <Cell key={p.key} fill={p.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => formatINR(v)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <table className="text-sm">
                <caption className="sr-only">Spending by category</caption>
                <tbody>
                  {pie.map((p) => (
                    <tr key={p.key}>
                      <th scope="row" className="py-1 text-left font-normal">
                        <span
                          className="mr-2 inline-block size-3 rounded-full align-middle"
                          style={{ background: p.color }}
                          aria-hidden="true"
                        />
                        {p.name}
                      </th>
                      <td className="py-1 text-right money font-medium">{formatINR(p.value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card title="Risk drivers" action={<RiskChip risk={metrics.risk} />}>
          <ol className="grid gap-2 text-sm">
            {metrics.risk.reasons.map((r, i) => (
              <li key={r} className="flex gap-3 rounded-lg bg-muted px-3 py-2">
                <span className="font-display font-bold text-lilac-text">{i + 1}</span>
                {r}
              </li>
            ))}
          </ol>
        </Card>

        <Card title="Surprises so far">
          {state.eventLog.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No surprises yet. When one lands, you'll choose how to handle it.
            </p>
          ) : (
            <ul className="grid gap-2 text-sm">
              {state.eventLog.map((e) => (
                <li key={e.eventId} className="flex justify-between rounded-lg bg-muted px-3 py-2">
                  <span>
                    Day {e.day} · {e.title}{" "}
                    <span className="text-muted-foreground">
                      (
                      {e.responseId === "pay"
                        ? "paid"
                        : e.responseId === "goal"
                          ? "from goal"
                          : "borrowed"}
                      )
                    </span>
                  </span>
                  <span className="money font-medium">{formatINR(-e.cost, { sign: true })}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="30-day balance" className="lg:col-span-2">
          <div
            className="h-64"
            role="img"
            aria-label="Line chart of actual balance so far and dashed forecast to day 30"
          >
            <ResponsiveContainer>
              <LineChart data={line} margin={{ left: 8, right: 8, top: 8 }}>
                <XAxis dataKey="day" tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} />
                <YAxis
                  tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                  tickFormatter={(v: number) => `₹${Math.round(v / 1000)}k`}
                  width={48}
                />
                <Tooltip
                  formatter={(v: number) => formatINR(v)}
                  labelFormatter={(d) => `Day ${String(d)}`}
                />
                <Line
                  type="monotone"
                  dataKey="actual"
                  name="Actual"
                  stroke="var(--foreground)"
                  strokeWidth={2.5}
                  dot={false}
                  connectNulls
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="forecast"
                  name="Forecast"
                  stroke="var(--lilac)"
                  strokeWidth={2.5}
                  strokeDasharray="6 6"
                  dot={false}
                  connectNulls
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <table className="sr-only">
            <caption>Balance by day</caption>
            <thead>
              <tr>
                <th scope="col">Day</th>
                <th scope="col">Actual</th>
                <th scope="col">Forecast</th>
              </tr>
            </thead>
            <tbody>
              {line.map((r) => (
                <tr key={r.day}>
                  <td>{r.day}</td>
                  <td>{r.actual ?? "—"}</td>
                  <td>{r.forecast ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}
