import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, Bookmark, Check, Columns3, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  compareScenario,
  formatINR,
  round,
  type Comparison,
  type GoalEta,
  type Scenario,
} from "@/engine";
import { usePace } from "@/state/PaceProvider";
import { Card } from "@/components/StatCard";
import { DiffRow } from "@/components/DiffRow";
import { VerdictChip } from "@/components/Chips";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/simulate")({
  head: () => ({
    meta: [
      { title: "Simulate — Pace" },
      {
        name: "description",
        content:
          "Try a purchase, cancel a subscription or delay a bill and see the before and after on your month.",
      },
      { property: "og:title", content: "Simulate a money decision — Pace" },
      {
        property: "og:description",
        content: "See what a decision does to your month before you make it.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Simulate,
});

type Kind = Scenario["kind"];
const KINDS: { kind: Kind; label: string; tag?: string }[] = [
  { kind: "purchase", label: "One-off purchase" },
  { kind: "addSubscription", label: "Add subscription" },
  { kind: "cancelSubscription", label: "Cancel subscription" },
  { kind: "skipCommitment", label: "Skip or delay a bill", tag: "Late fee warning" },
  { kind: "goalContribution", label: "Change goal contribution" },
  { kind: "extraIncome", label: "Extra income" },
  { kind: "habit", label: "Habit change" },
];

interface Form {
  label: string;
  amount: string;
  day: string;
  targetId: string;
  mode: "skip" | "delay";
  delayDays: string;
  timesPerWeek: string;
  habitMode: "add" | "cut";
}

const n = (v: string): number => {
  const x = Number(v);
  return Number.isFinite(x) ? x : Number.NaN;
};
const LABEL_RE = /^[\p{L}\p{N} .,'&/+()-]*$/u;

function Simulate() {
  const { state, commitScenario, saveScenario, removeSavedScenario } = usePace();
  const d = state.profile.day;
  const [kind, setKind] = useState<Kind>("purchase");
  const [f, setF] = useState<Form>({
    label: "Earbuds sale",
    amount: "500",
    day: String(d),
    targetId: "",
    mode: "delay",
    delayDays: "5",
    timesPerWeek: "3",
    habitMode: "add",
  });
  const [compare, setCompare] = useState(false);
  const set = (p: Partial<Form>) => setF((x) => ({ ...x, ...p }));

  const openSubs = state.subscriptions.filter((s) => s.active);
  const openBills = state.commitments.filter((c) => c.status === "pending" || c.status === "late");

  const { scenario, error } = useMemo((): { scenario: Scenario | null; error: string | null } => {
    const amount = n(f.amount);
    const day = n(f.day);
    if (!LABEL_RE.test(f.label) || f.label.length > 40)
      return { scenario: null, error: "Use a short name with letters and numbers." };
    const needAmount = [
      "purchase",
      "addSubscription",
      "goalContribution",
      "extraIncome",
      "habit",
    ].includes(kind);
    if (
      needAmount &&
      (!Number.isFinite(amount) ||
        amount < 0 ||
        amount > 10_000_000 ||
        (kind !== "goalContribution" && amount === 0))
    )
      return { scenario: null, error: "Enter an amount above ₹0." };
    if (
      ["purchase", "extraIncome"].includes(kind) &&
      (!Number.isInteger(day) || day < d || day > 30)
    )
      return { scenario: null, error: `Pick a day from ${d} to 30.` };
    switch (kind) {
      case "purchase":
        return { scenario: { kind, amount, day, label: f.label.trim() }, error: null };
      case "extraIncome":
        return { scenario: { kind, amount, day, label: f.label.trim() }, error: null };
      case "addSubscription": {
        if (!Number.isInteger(day) || day < 1 || day > 30)
          return { scenario: null, error: "Pick a renewal day from 1 to 30." };
        return { scenario: { kind, amount, renewDay: day, label: f.label.trim() }, error: null };
      }
      case "cancelSubscription": {
        const id = f.targetId || openSubs[0]?.id;
        return id
          ? { scenario: { kind, subscriptionId: id }, error: null }
          : { scenario: null, error: "No active subscriptions to cancel." };
      }
      case "skipCommitment": {
        const id = f.targetId || openBills[0]?.id;
        const dd = n(f.delayDays);
        if (!id) return { scenario: null, error: "No unpaid bills to skip or delay." };
        if (f.mode === "delay" && (!Number.isInteger(dd) || dd < 1 || dd > 29))
          return { scenario: null, error: "Delay by 1 to 29 days." };
        return { scenario: { kind, commitmentId: id, mode: f.mode, delayDays: dd }, error: null };
      }
      case "goalContribution": {
        const id = f.targetId || state.goals[0]?.id;
        return id
          ? { scenario: { kind, goalId: id, amount }, error: null }
          : { scenario: null, error: "Add a goal in Plan first." };
      }
      case "habit": {
        const t = n(f.timesPerWeek);
        if (!Number.isInteger(t) || t < 1 || t > 14)
          return { scenario: null, error: "Times a week must be 1 to 14." };
        return {
          scenario: {
            kind,
            label: f.label.trim(),
            timesPerWeek: t,
            cost: amount,
            mode: f.habitMode,
          },
          error: null,
        };
      }
    }
  }, [kind, f, d, openSubs, openBills, state.goals]);

  const cmp = useMemo(
    () => (scenario ? compareScenario(state, scenario) : null),
    [scenario, state],
  );

  const pickKind = (k: Kind) => {
    setKind(k);
    const defaults: Partial<Record<Kind, Partial<Form>>> = {
      purchase: { label: "Earbuds sale", amount: "500", day: String(d) },
      addSubscription: {
        label: "New streaming app",
        amount: "149",
        day: String(Math.min(30, d + 2)),
      },
      cancelSubscription: {
        targetId: openSubs.find((s) => s.label === "Netflix")?.id ?? openSubs[0]?.id ?? "",
      },
      skipCommitment: { targetId: openBills[0]?.id ?? "" },
      goalContribution: {
        targetId: state.goals[0]?.id ?? "",
        amount: String(state.goals[0]?.plannedThisMonth ?? 0),
      },
      extraIncome: { label: "Weekend gig", amount: "1000", day: String(Math.min(30, d + 3)) },
      habit: { label: "Cafe coffee", amount: "150", timesPerWeek: "3", habitMode: "add" },
    };
    set(defaults[k] ?? {});
  };

  const input = "h-11 w-full rounded-xl border border-input bg-background px-3 money";

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Simulate</h1>
          <p className="text-muted-foreground">
            Try it here first. Nothing changes until you commit.
          </p>
        </div>
        <Button
          variant="outline"
          className="rounded-full"
          onClick={() => setCompare((c) => !c)}
          aria-pressed={compare}
          disabled={state.savedScenarios.length === 0}
        >
          <Columns3 aria-hidden="true" />{" "}
          {compare ? "Back to builder" : `Compare saved (${state.savedScenarios.length}/3)`}
        </Button>
      </div>

      {compare ? (
        <CompareTray onRemove={removeSavedScenario} />
      ) : (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <Card title="Scenario">
            <fieldset>
              <legend className="sr-only">Scenario type</legend>
              <div className="grid gap-1.5">
                {KINDS.map((k) => (
                  <label
                    key={k.kind}
                    className={cn(
                      "flex cursor-pointer items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-sm has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring",
                      kind === k.kind ? "border-primary bg-accent font-semibold" : "hover:bg-muted",
                    )}
                  >
                    <input
                      type="radio"
                      name="kind"
                      className="sr-only"
                      checked={kind === k.kind}
                      onChange={() => pickKind(k.kind)}
                    />
                    {k.label}
                    {k.tag && (
                      <span className="rounded-full bg-risk/20 px-2 py-0.5 text-xs font-medium text-risk-text">
                        {k.tag}
                      </span>
                    )}
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="perforation my-5" />

            <form
              className="grid gap-3"
              onSubmit={(e) => e.preventDefault()}
              aria-describedby="sim-err"
            >
              {["purchase", "addSubscription", "extraIncome", "habit"].includes(kind) && (
                <Field id="sim-label" label="What is it?">
                  <input
                    id="sim-label"
                    className={input}
                    value={f.label}
                    maxLength={40}
                    onChange={(e) => set({ label: e.target.value })}
                  />
                </Field>
              )}
              {kind === "cancelSubscription" && (
                <Field id="sim-target" label="Subscription">
                  <select
                    id="sim-target"
                    className={input}
                    value={f.targetId}
                    onChange={(e) => set({ targetId: e.target.value })}
                  >
                    {openSubs.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label} · {formatINR(s.amount)}
                        {s.charged ? " (already renewed)" : ""}
                      </option>
                    ))}
                  </select>
                </Field>
              )}
              {kind === "skipCommitment" && (
                <>
                  <Field id="sim-bill" label="Bill">
                    <select
                      id="sim-bill"
                      className={input}
                      value={f.targetId}
                      onChange={(e) => set({ targetId: e.target.value })}
                    >
                      {openBills.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.label} · {formatINR(c.amount)} · day {c.dueDay}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field id="sim-mode" label="Action">
                    <select
                      id="sim-mode"
                      className={input}
                      value={f.mode}
                      onChange={(e) => set({ mode: e.target.value === "skip" ? "skip" : "delay" })}
                    >
                      <option value="delay">Delay (adds ₹100 late fee)</option>
                      <option value="skip">Skip this month</option>
                    </select>
                  </Field>
                  {f.mode === "delay" && (
                    <Field id="sim-delay" label="Delay by (days)">
                      <input
                        id="sim-delay"
                        className={input}
                        inputMode="numeric"
                        value={f.delayDays}
                        onChange={(e) =>
                          set({ delayDays: e.target.value.replace(/\D/g, "").slice(0, 2) })
                        }
                      />
                    </Field>
                  )}
                </>
              )}
              {kind === "goalContribution" && (
                <Field id="sim-goal" label="Goal">
                  <select
                    id="sim-goal"
                    className={input}
                    value={f.targetId}
                    onChange={(e) =>
                      set({
                        targetId: e.target.value,
                        amount: String(
                          state.goals.find((g) => g.id === e.target.value)?.plannedThisMonth ?? 0,
                        ),
                      })
                    }
                  >
                    {state.goals.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.label} · now {formatINR(g.plannedThisMonth)}
                      </option>
                    ))}
                  </select>
                </Field>
              )}
              {kind === "habit" && (
                <>
                  <Field id="sim-hmode" label="Change">
                    <select
                      id="sim-hmode"
                      className={input}
                      value={f.habitMode}
                      onChange={(e) => set({ habitMode: e.target.value === "cut" ? "cut" : "add" })}
                    >
                      <option value="add">Start doing this</option>
                      <option value="cut">Cut this out</option>
                    </select>
                  </Field>
                  <Field id="sim-times" label="Times a week">
                    <input
                      id="sim-times"
                      className={input}
                      inputMode="numeric"
                      value={f.timesPerWeek}
                      onChange={(e) =>
                        set({ timesPerWeek: e.target.value.replace(/\D/g, "").slice(0, 2) })
                      }
                    />
                  </Field>
                </>
              )}
              {kind !== "cancelSubscription" && kind !== "skipCommitment" && (
                <Field
                  id="sim-amount"
                  label={
                    kind === "habit"
                      ? "Cost each time (₹)"
                      : kind === "goalContribution"
                        ? "New monthly contribution (₹)"
                        : "Amount (₹)"
                  }
                >
                  <input
                    id="sim-amount"
                    className={input}
                    inputMode="numeric"
                    value={f.amount}
                    onChange={(e) => set({ amount: e.target.value.replace(/\D/g, "").slice(0, 8) })}
                  />
                </Field>
              )}
              {["purchase", "addSubscription", "extraIncome"].includes(kind) && (
                <Field id="sim-day" label={kind === "addSubscription" ? "Renews on day" : "On day"}>
                  <input
                    id="sim-day"
                    className={input}
                    inputMode="numeric"
                    value={f.day}
                    onChange={(e) => set({ day: e.target.value.replace(/\D/g, "").slice(0, 2) })}
                  />
                </Field>
              )}
              <p
                id="sim-err"
                role={error ? "alert" : undefined}
                className="min-h-5 text-sm text-destructive"
              >
                {error}
              </p>
            </form>
          </Card>

          <Card title="Before | After">
            {cmp && scenario ? (
              <Results
                cmp={cmp}
                goals={state.goals.map((g) => ({ id: g.id, label: g.label }))}
                onCommit={() => {
                  const notes = commitScenario(scenario);
                  toast.success("Committed. Your month is updated.");
                  notes.forEach((x) => toast(x));
                }}
                onDiscard={() => pickKind(kind)}
                onSave={() => {
                  if (saveScenario(scenario)) toast.success("Scenario saved for compare.");
                  else toast.error("You can save up to 3. Remove one in Compare first.");
                }}
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                Fill in the scenario to see what changes.
              </p>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {children}
    </div>
  );
}

const etaText = (e: GoalEta | undefined) => e?.text ?? "—";

function Results({
  cmp,
  goals,
  onCommit,
  onDiscard,
  onSave,
}: {
  cmp: Comparison;
  goals: { id: string; label: string }[];
  onCommit: () => void;
  onDiscard: () => void;
  onSave: () => void;
}) {
  const { before: b, after: a } = cmp;
  const mainGoal =
    goals.find((g) => cmp.etaBefore[g.id]?.rawDay !== cmp.etaAfter[g.id]?.rawDay) ?? goals[0];
  const etaDelta = mainGoal
    ? (cmp.etaAfter[mainGoal.id]?.rawDay ?? 99) - (cmp.etaBefore[mainGoal.id]?.rawDay ?? 99)
    : 0;
  return (
    <div className="grid gap-4" aria-live="polite">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px]">
          <caption className="sr-only">Before and after comparison</caption>
          <thead>
            <tr className="border-b text-xs text-muted-foreground">
              <th scope="col" className="pb-2 text-left font-medium">
                Metric
              </th>
              <th scope="col" className="pb-2 text-right font-medium">
                Before
              </th>
              <th scope="col" className="pb-2 text-right font-medium">
                After
              </th>
              <th scope="col" className="pb-2 text-right font-medium">
                Change
              </th>
            </tr>
          </thead>
          <tbody>
            <DiffRow
              label="Balance"
              before={formatINR(b.balance)}
              after={formatINR(a.balance)}
              delta={a.balance - b.balance}
              deltaText={formatINR(Math.abs(a.balance - b.balance))}
              higherIsBetter
            />
            <DiffRow
              label="Daily allowance"
              before={formatINR(b.dailyAllowance)}
              after={formatINR(a.dailyAllowance)}
              delta={a.dailyAllowance - b.dailyAllowance}
              deltaText={formatINR(Math.abs(a.dailyAllowance - b.dailyAllowance))}
              higherIsBetter
            />
            {mainGoal && (
              <DiffRow
                label={`${mainGoal.label} ETA`}
                before={etaText(cmp.etaBefore[mainGoal.id])}
                after={etaText(cmp.etaAfter[mainGoal.id])}
                delta={etaDelta}
                deltaText={`${Math.abs(etaDelta)} days`}
                higherIsBetter={false}
              />
            )}
            <DiffRow
              label="Day-30 forecast"
              before={formatINR(b.forecast)}
              after={formatINR(a.forecast)}
              delta={a.forecast - b.forecast}
              deltaText={formatINR(Math.abs(a.forecast - b.forecast))}
              higherIsBetter
            />
            <DiffRow
              label="Risk score"
              before={`${b.risk.score}/100`}
              after={`${a.risk.score}/100`}
              delta={a.risk.score - b.risk.score}
              deltaText={`${Math.abs(a.risk.score - b.risk.score)} pts`}
              higherIsBetter={false}
            />
            <DiffRow
              label="Health score"
              before={`${b.health.score}/100`}
              after={`${a.health.score}/100`}
              delta={a.health.score - b.health.score}
              deltaText={`${Math.abs(a.health.score - b.health.score)} pts`}
              higherIsBetter
            />
          </tbody>
        </table>
      </div>

      {(cmp.translators.length > 0 || cmp.notes.length > 0) && (
        <ul className="grid gap-1.5 text-sm">
          {[...cmp.notes, ...cmp.translators].map((t) => (
            <li key={t} className="rounded-lg bg-muted px-3 py-2">
              {t}
            </li>
          ))}
        </ul>
      )}
      {cmp.breach && (
        <p
          className="flex items-start gap-2 rounded-xl bg-risk/15 p-3 text-sm text-risk-text"
          role="alert"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" /> {cmp.breach}
        </p>
      )}
      <VerdictChip verdict={cmp.verdict} reason={cmp.verdictReason} />
      <div className="flex flex-wrap gap-2">
        <Button className="rounded-full" onClick={onCommit}>
          <Check aria-hidden="true" /> Commit
        </Button>
        <Button variant="outline" className="rounded-full" onClick={onDiscard}>
          <X aria-hidden="true" /> Discard
        </Button>
        <Button variant="ghost" className="rounded-full" onClick={onSave}>
          <Bookmark aria-hidden="true" /> Save scenario
        </Button>
      </div>
    </div>
  );
}

function CompareTray({ onRemove }: { onRemove: (id: string) => void }) {
  const { state } = usePace();
  const rows = state.savedScenarios.map((s) => ({ s, c: compareScenario(state, s.scenario) }));
  if (rows.length === 0)
    return (
      <Card>
        <p className="text-sm text-muted-foreground">Save a scenario to compare it here.</p>
      </Card>
    );
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {rows.map(({ s, c }) => (
        <section
          key={s.id}
          className="ticket rounded-2xl bg-card p-4 shadow-card"
          aria-label={s.name}
        >
          <div className="flex items-start justify-between gap-2">
            <h2 className="font-display text-lg font-semibold">{s.name}</h2>
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Remove ${s.name}`}
              onClick={() => onRemove(s.id)}
            >
              <Trash2 aria-hidden="true" />
            </Button>
          </div>
          <dl className="mt-3 grid gap-2 text-sm">
            {[
              ["Balance", formatINR(c.after.balance)],
              ["Daily allowance", formatINR(c.after.dailyAllowance)],
              [
                "Day-30 forecast",
                `${formatINR(c.after.forecast)} (${formatINR(round(c.after.forecast - c.before.forecast), { sign: true })})`,
              ],
              ["Risk", `${c.after.risk.score}/100`],
              ["Health", `${c.after.health.score}/100`],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-2">
                <dt className="text-muted-foreground">{k}</dt>
                <dd className="font-medium money">{v}</dd>
              </div>
            ))}
          </dl>
          <div className="perforation my-3" />
          <VerdictChip verdict={c.verdict} reason={c.verdictReason} />
        </section>
      ))}
    </div>
  );
}
