import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Plane, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { z } from "zod";
import {
  buildState,
  formatINR,
  PERSONAS,
  safeToSpend,
  dailyAllowance,
  type Persona,
  type PersonaTemplate,
} from "@/engine";
import { usePace } from "@/state/PaceProvider";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import studentImg from "@/assets/persona-student.jpg";
import internImg from "@/assets/persona-intern.jpg";
import freelancerImg from "@/assets/persona-freelancer.jpg";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Get started — Pace" },
      {
        name: "description",
        content: "Pick a persona, review your month and start Day 1 of your money simulator.",
      },
      { property: "og:title", content: "Get started — Pace" },
      { property: "og:description", content: "Pick a persona, review your month and start Day 1." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Onboarding,
});

const IMAGES: Record<Persona, string> = {
  student: studentImg,
  intern: internImg,
  freelancer: freelancerImg,
};

const labelSchema = z
  .string()
  .trim()
  .min(1, "Add a name")
  .max(40, "Keep it under 40 characters")
  .regex(/^[\p{L}\p{N} .,'&/+()-]+$/u, "Use letters, numbers and simple punctuation");
const amountSchema = z
  .number({ invalid_type_error: "Enter a number" })
  .int("Whole rupees only")
  .positive("Must be more than ₹0")
  .max(10_000_000, "That's too large");
const daySchema = z
  .number({ invalid_type_error: "Enter a day" })
  .int()
  .min(1, "Day 1–30")
  .max(30, "Day 1–30");
const nameSchema = z
  .string()
  .trim()
  .min(1, "Tell us what to call you")
  .max(30, "Keep it under 30 characters")
  .regex(/^[\p{L} .'-]+$/u, "Letters and spaces only");

type Row = {
  id: string;
  label: string;
  amount: number;
  day: number;
  extra?: number;
  enabled?: boolean;
};
type Section = "incomes" | "commitments" | "subscriptions" | "goals";

function toRows(t: PersonaTemplate): Record<Section, Row[]> {
  return {
    incomes: t.incomes.map((i) => ({
      id: i.id,
      label: i.label,
      amount: i.amount,
      day: i.day,
      enabled: i.enabled,
    })),
    commitments: t.commitments.map((c) => ({
      id: c.id,
      label: c.label,
      amount: c.amount,
      day: c.dueDay,
    })),
    subscriptions: t.subscriptions.map((s) => ({
      id: s.id,
      label: s.label,
      amount: s.amount,
      day: s.renewDay,
    })),
    goals: t.goals.map((g) => ({
      id: g.id,
      label: g.label,
      amount: g.target,
      day: g.contributionDay,
      extra: g.plannedThisMonth,
    })),
  };
}

function rowErrors(
  r: Row,
  isGoal: boolean,
): Partial<Record<"label" | "amount" | "day" | "extra", string>> {
  const e: Partial<Record<"label" | "amount" | "day" | "extra", string>> = {};
  const l = labelSchema.safeParse(r.label);
  if (!l.success) e.label = l.error.issues[0]?.message ?? "Invalid";
  const a = amountSchema.safeParse(r.amount);
  if (!a.success) e.amount = a.error.issues[0]?.message ?? "Invalid";
  const d = daySchema.safeParse(r.day);
  if (!d.success) e.day = d.error.issues[0]?.message ?? "Invalid";
  if (isGoal) {
    const x = z.number().int().min(0, "Can't be negative").safeParse(r.extra);
    if (!x.success) e.extra = x.error.issues[0]?.message ?? "Enter a number";
    else if ((r.extra ?? 0) > r.amount) e.extra = "More than the target";
  }
  return e;
}

const toNum = (v: string): number => (v.trim() === "" ? Number.NaN : Number(v));

function Onboarding() {
  const { start, state } = usePace();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [persona, setPersona] = useState<Persona>(state.profile.persona);
  const [rows, setRows] = useState(() => toRows(PERSONAS[state.profile.persona]));
  const [name, setName] = useState(state.profile.name);
  const [touched, setTouched] = useState(false);

  const pick = (p: Persona) => {
    setPersona(p);
    setRows(toRows(PERSONAS[p]));
  };

  const allErrors = (Object.keys(rows) as Section[]).some((s) =>
    rows[s].some((r) => Object.keys(rowErrors(r, s === "goals")).length > 0),
  );
  const nameResult = nameSchema.safeParse(name);

  const template: PersonaTemplate = {
    ...PERSONAS[persona],
    incomes: rows.incomes.map((r) => ({
      id: r.id,
      label: r.label.trim(),
      amount: r.amount,
      day: r.day,
      enabled: r.enabled ?? true,
    })),
    commitments: rows.commitments.map((r) => ({
      id: r.id,
      label: r.label.trim(),
      amount: r.amount,
      dueDay: r.day,
    })),
    subscriptions: rows.subscriptions.map((r) => ({
      id: r.id,
      label: r.label.trim(),
      amount: r.amount,
      renewDay: r.day,
      active: true,
    })),
    goals: rows.goals.map((r) => ({
      id: r.id,
      label: r.label.trim(),
      target: r.amount,
      saved: PERSONAS[persona].goals.find((g) => g.id === r.id)?.saved ?? 0,
      plannedThisMonth: r.extra ?? 0,
      deadlineDay: 30,
      contributionDay: r.day,
    })),
  };
  const preview = allErrors
    ? null
    : buildState(template, name.trim(), Math.floor(Math.random() * 2 ** 31));

  const begin = () => {
    setTouched(true);
    if (!nameResult.success || !preview) return;
    start(preview);
    void navigate({ to: "/" });
  };

  return (
    <main className="min-h-dvh bg-sky px-4 py-8 text-nav-foreground sm:py-12">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-2 font-display text-2xl font-bold">
            <Plane className="size-6 -rotate-45" aria-hidden="true" /> pace
          </p>
          <div className="flex items-center gap-4">
            <p className="text-sm money" aria-live="polite">
              Step {step + 1} of 4
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-3xl bg-card p-5 text-card-foreground shadow-lift sm:p-8">
          {step === 0 && (
            <section aria-labelledby="welcome" className="text-center">
              <img
                src={studentImg}
                alt=""
                width={912}
                height={736}
                className="mx-auto aspect-[912/736] w-full max-w-md rounded-2xl object-cover"
              />
              <p className="mt-6 text-xs font-semibold uppercase tracking-widest text-lilac-text">
                1/3 · Welcome aboard
              </p>
              <h1 id="welcome" className="mt-2 text-4xl font-bold sm:text-5xl">
                Build better money habits
              </h1>
              <p className="mx-auto mt-3 max-w-md text-muted-foreground">
                See what a decision does to your month before you make it. Thirty days, no real
                money, all the lessons.
              </p>
              <Button size="lg" className="mt-6 rounded-full" onClick={() => setStep(1)}>
                Let's go <ArrowRight aria-hidden="true" />
              </Button>
            </section>
          )}

          {step === 1 && (
            <section aria-labelledby="persona">
              <h1 id="persona" className="text-3xl font-bold">
                Who's flying this month?
              </h1>
              <p className="mt-1 text-muted-foreground">
                Pick a starting point. You can edit everything next.
              </p>
              <fieldset className="mt-5 grid gap-3 sm:grid-cols-3">
                <legend className="sr-only">Persona</legend>
                {(Object.keys(PERSONAS) as Persona[]).map((p) => (
                  <label
                    key={p}
                    className={`cursor-pointer overflow-hidden rounded-2xl border-2 bg-card transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring ${persona === p ? "border-primary" : "border-transparent hover:border-border"}`}
                  >
                    <input
                      type="radio"
                      name="persona"
                      value={p}
                      checked={persona === p}
                      onChange={() => pick(p)}
                      className="sr-only"
                    />
                    <img
                      src={IMAGES[p]}
                      alt=""
                      width={912}
                      height={736}
                      loading="lazy"
                      className="aspect-[912/736] w-full object-cover"
                    />
                    <span className="block p-3">
                      <span className="block font-display text-lg font-semibold">
                        {PERSONAS[p].title}
                      </span>
                      <span className="block text-sm text-muted-foreground">
                        {PERSONAS[p].blurb}
                      </span>
                    </span>
                  </label>
                ))}
              </fieldset>
            </section>
          )}

          {step === 2 && (
            <section aria-labelledby="review">
              <h1 id="review" className="text-3xl font-bold">
                Review your month
              </h1>
              <p className="mt-1 text-muted-foreground">
                Starting balance {formatINR(PERSONAS[persona].openingBalance)}. Edit anything that
                doesn't look like you.
              </p>
              <div className="mt-5 grid gap-6">
                <RowEditor
                  title="Income"
                  section="incomes"
                  rows={rows.incomes}
                  setRows={setRows}
                  dayLabel="Arrives on day"
                  toggle
                />
                <RowEditor
                  title="Bills and commitments"
                  section="commitments"
                  rows={rows.commitments}
                  setRows={setRows}
                  dayLabel="Due day"
                />
                <RowEditor
                  title="Subscriptions"
                  section="subscriptions"
                  rows={rows.subscriptions}
                  setRows={setRows}
                  dayLabel="Renews day"
                />
                <RowEditor
                  title="Goals"
                  section="goals"
                  rows={rows.goals}
                  setRows={setRows}
                  dayLabel="Save on day"
                  amountLabel="Target"
                  extraLabel="This month"
                />
              </div>
            </section>
          )}

          {step === 3 && (
            <section aria-labelledby="confirm">
              <h1 id="confirm" className="text-3xl font-bold">
                Ready for Day 1?
              </h1>
              <div className="mt-5 grid gap-1.5">
                <label htmlFor="name" className="text-sm font-medium">
                  What should we call you?
                </label>
                <input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onBlur={() => setTouched(true)}
                  maxLength={30}
                  autoComplete="given-name"
                  aria-invalid={touched && !nameResult.success}
                  aria-describedby="name-err"
                  className="h-11 rounded-xl border border-input bg-background px-3"
                />
                <p
                  id="name-err"
                  className="min-h-5 text-sm text-destructive"
                  role={touched && !nameResult.success ? "alert" : undefined}
                >
                  {touched && !nameResult.success ? nameResult.error.issues[0]?.message : ""}
                </p>
              </div>
              {preview && (
                <div className="ticket mt-4 rounded-2xl bg-sky p-5 text-nav-foreground">
                  <p className="text-xs uppercase tracking-widest opacity-80">
                    Boarding pass · {PERSONAS[persona].title}
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs opacity-80">Safe to spend</p>
                      <p className="font-display text-3xl font-bold money">
                        {formatINR(safeToSpend(preview))}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs opacity-80">Per day</p>
                      <p className="font-display text-3xl font-bold money">
                        {formatINR(dailyAllowance(preview))}
                      </p>
                    </div>
                  </div>
                  <div className="perforation my-4 opacity-60" />
                  <p className="text-sm">
                    Day 1 → Day 30 · buffer {formatINR(preview.profile.bufferFloor)}
                  </p>
                </div>
              )}
            </section>
          )}

          {step > 0 && (
            <div className="mt-8 flex items-center justify-between gap-3">
              <Button variant="ghost" onClick={() => setStep(step - 1)}>
                <ArrowLeft aria-hidden="true" /> Back
              </Button>
              {step < 3 ? (
                <Button
                  className="rounded-full"
                  onClick={() => setStep(step + 1)}
                  disabled={step === 2 && allErrors}
                >
                  {step === 2 && allErrors ? "Fix the errors above" : "Continue"}{" "}
                  <ArrowRight aria-hidden="true" />
                </Button>
              ) : (
                <Button size="lg" className="rounded-full" onClick={begin}>
                  Start Day 1 <Plane aria-hidden="true" />
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

interface EditorProps {
  title: string;
  section: Section;
  rows: Row[];
  setRows: React.Dispatch<React.SetStateAction<Record<Section, Row[]>>>;
  dayLabel: string;
  amountLabel?: string;
  extraLabel?: string;
  toggle?: boolean;
}

function RowEditor({
  title,
  section,
  rows,
  setRows,
  dayLabel,
  amountLabel = "Amount",
  extraLabel,
  toggle,
}: EditorProps) {
  const patch = (id: string, p: Partial<Row>) =>
    setRows((all) => ({
      ...all,
      [section]: all[section].map((r) => (r.id === id ? { ...r, ...p } : r)),
    }));
  const remove = (id: string) =>
    setRows((all) => ({ ...all, [section]: all[section].filter((r) => r.id !== id) }));
  const add = () =>
    setRows((all) => ({
      ...all,
      [section]: [
        ...all[section],
        {
          id: `${section}_${all[section].length}_${Date.now()}`,
          label: "",
          amount: 0,
          day: 15,
          extra: extraLabel ? 0 : undefined,
          enabled: toggle ? true : undefined,
        },
      ],
    }));
  const input =
    "h-10 w-full rounded-lg border border-input bg-background px-2.5 text-sm money aria-[invalid=true]:border-destructive";

  return (
    <fieldset>
      <legend className="font-display text-lg font-semibold">{title}</legend>
      {rows.length === 0 && (
        <p className="mt-1 text-sm text-muted-foreground">
          Nothing here yet. Add one if it applies to you.
        </p>
      )}
      <ul className="mt-2 grid gap-3">
        {rows.map((r) => {
          const err = rowErrors(r, section === "goals");
          const pid = `${section}-${r.id}`;
          return (
            <li
              key={r.id}
              className="grid grid-cols-2 gap-2 rounded-xl bg-muted p-3 sm:grid-cols-[1.6fr_1fr_0.8fr_auto] sm:items-start"
            >
              <div className="col-span-2 sm:col-span-1">
                <label htmlFor={`${pid}-l`} className="text-xs text-muted-foreground">
                  Name
                </label>
                <input
                  id={`${pid}-l`}
                  className={input}
                  value={r.label}
                  maxLength={40}
                  aria-invalid={!!err.label}
                  aria-describedby={`${pid}-le`}
                  onChange={(e) => patch(r.id, { label: e.target.value })}
                />
                <p id={`${pid}-le`} className="text-xs text-destructive">
                  {err.label}
                </p>
              </div>
              <div>
                <label htmlFor={`${pid}-a`} className="text-xs text-muted-foreground">
                  {amountLabel} (₹)
                </label>
                <input
                  id={`${pid}-a`}
                  className={input}
                  inputMode="numeric"
                  value={Number.isNaN(r.amount) ? "" : String(r.amount)}
                  aria-invalid={!!err.amount}
                  aria-describedby={`${pid}-ae`}
                  onChange={(e) =>
                    patch(r.id, { amount: toNum(e.target.value.replace(/[^\d-]/g, "")) })
                  }
                />
                <p id={`${pid}-ae`} className="text-xs text-destructive">
                  {err.amount}
                </p>
              </div>
              <div>
                <label htmlFor={`${pid}-d`} className="text-xs text-muted-foreground">
                  {dayLabel}
                </label>
                <input
                  id={`${pid}-d`}
                  className={input}
                  inputMode="numeric"
                  value={Number.isNaN(r.day) ? "" : String(r.day)}
                  aria-invalid={!!err.day}
                  aria-describedby={`${pid}-de`}
                  onChange={(e) => patch(r.id, { day: toNum(e.target.value.replace(/\D/g, "")) })}
                />
                <p id={`${pid}-de`} className="text-xs text-destructive">
                  {err.day}
                </p>
              </div>
              <div className="col-span-2 flex items-end justify-end gap-2 sm:col-span-1 sm:pt-5">
                {toggle && (
                  <label className="flex items-center gap-2 text-xs">
                    <Switch
                      checked={r.enabled ?? true}
                      onCheckedChange={(v) => patch(r.id, { enabled: v })}
                      aria-label={`Include ${r.label || "income"}`}
                    />
                    Include
                  </label>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => remove(r.id)}
                  aria-label={`Remove ${r.label || "row"}`}
                >
                  <Trash2 aria-hidden="true" />
                </Button>
              </div>
              {extraLabel && (
                <div className="col-span-2 sm:col-span-4">
                  <label htmlFor={`${pid}-x`} className="text-xs text-muted-foreground">
                    {extraLabel} (₹)
                  </label>
                  <input
                    id={`${pid}-x`}
                    className={`${input} sm:max-w-40`}
                    inputMode="numeric"
                    value={r.extra === undefined || Number.isNaN(r.extra) ? "" : String(r.extra)}
                    aria-invalid={!!err.extra}
                    aria-describedby={`${pid}-xe`}
                    onChange={(e) =>
                      patch(r.id, { extra: toNum(e.target.value.replace(/[^\d-]/g, "")) })
                    }
                  />
                  <p id={`${pid}-xe`} className="text-xs text-destructive">
                    {err.extra}
                  </p>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <Button variant="outline" size="sm" className="mt-2 rounded-full" onClick={add}>
        <Plus aria-hidden="true" /> Add {title.toLowerCase().replace(/s$/, "")}
      </Button>
    </fieldset>
  );
}
