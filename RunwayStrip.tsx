import { Plane } from "lucide-react";
import { forecastSeries, formatINR, MONTH_DAYS, type MonthState } from "@/engine";

const W = 600;
const H = 140;
const PAD = 12;

export function RunwayStrip({ state }: { state: MonthState }) {
  const day = state.profile.day;
  const series = forecastSeries(state);
  const actual = state.balanceHistory
    .map((b, d) => ({ day: d, balance: b }))
    .filter(
      (p): p is { day: number; balance: number } => typeof p.balance === "number" && p.day < day,
    );
  // The forecast starts from today's current balance.
  const fc = [{ day: day - 1, balance: state.balance }, ...series];
  const all = [
    ...actual.map((p) => p.balance),
    ...fc.map((p) => p.balance),
    state.profile.bufferFloor,
  ];
  const maxY = Math.max(...all, 1);
  const minY = Math.min(0, ...all);
  const x = (d: number) => PAD + (d / MONTH_DAYS) * (W - 2 * PAD);
  const y = (b: number) => PAD + (1 - (b - minY) / (maxY - minY || 1)) * (H - 2 * PAD);
  const color = (b: number) =>
    b >= state.profile.bufferFloor ? "var(--safe)" : b >= 0 ? "var(--lilac)" : "var(--risk)";

  const actualPath = actual
    .map((p, i) => `${i === 0 ? "M" : "L"}${x(p.day).toFixed(1)},${y(p.balance).toFixed(1)}`)
    .join(" ");
  const markers = series.filter((p) => p.items.some((it) => it.amount < 0) && p.day >= day);
  const end = series[series.length - 1]?.balance ?? state.balance;
  const planeX = (x(day - 0.5) / W) * 100;
  const planeY = (y(state.balance) / H) * 100;
  const lowest = series.reduce(
    (m, p) => (p.balance < m.balance ? p : m),
    series[0] ?? { day, balance: state.balance, items: [] },
  );
  const summary = `Day ${day} of ${MONTH_DAYS}. Balance ${formatINR(state.balance)}. Projected day-30 balance ${formatINR(end)}. Lowest point ${formatINR(lowest.balance)} on day ${lowest.day}. ${markers.length} payments ahead.`;

  return (
    <figure className="relative">
      <div className="relative" role="img" aria-label={`30-day runway chart. ${summary}`}>
        <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" aria-hidden="true">
          <line
            x1={PAD}
            x2={W - PAD}
            y1={y(0)}
            y2={y(0)}
            stroke="currentColor"
            strokeOpacity={0.25}
          />
          <line
            x1={PAD}
            x2={W - PAD}
            y1={y(state.profile.bufferFloor)}
            y2={y(state.profile.bufferFloor)}
            stroke="currentColor"
            strokeOpacity={0.35}
            strokeDasharray="2 4"
          />
          {actualPath && (
            <path
              d={actualPath}
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              strokeLinejoin="round"
            />
          )}
          {fc.slice(1).map((p, i) => (
            <line
              key={p.day}
              x1={x(fc[i]?.day ?? p.day)}
              y1={y(fc[i]?.balance ?? p.balance)}
              x2={x(p.day)}
              y2={y(p.balance)}
              stroke={color(p.balance)}
              strokeWidth={2.5}
              strokeLinecap="round"
              className="flight-path"
            />
          ))}
          {markers.map((p) => (
            <g key={p.day}>
              <line
                x1={x(p.day)}
                x2={x(p.day)}
                y1={H - PAD - 8}
                y2={H - PAD}
                stroke="currentColor"
                strokeOpacity={0.7}
                strokeWidth={2}
              />
              <circle
                cx={x(p.day)}
                cy={y(p.balance)}
                r={3.5}
                fill={color(p.balance)}
                stroke="currentColor"
                strokeOpacity={0.4}
              />
            </g>
          ))}
        </svg>
        <span
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-card p-1.5 text-foreground shadow-lift transition-all duration-700 ease-out"
          style={{ left: `${planeX}%`, top: `${planeY}%` }}
          aria-hidden="true"
        >
          <Plane className="size-4" />
        </span>
      </div>
      <figcaption className="mt-2 flex justify-between text-xs opacity-80">
        <span>Day 1</span>
        <span className="money">Day 30 · {formatINR(end)}</span>
      </figcaption>
      <p className="sr-only">{summary}</p>
    </figure>
  );
}
