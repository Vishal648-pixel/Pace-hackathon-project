import { createFileRoute } from "@tanstack/react-router";
import { Pencil, Plus, Target, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { z } from "zod";
import {
  formatINR,
  goalEta,
  isCommitmentRemaining,
  uid,
  type Commitment,
  type CommitmentStatus,
} from "@/engine";
import { usePace } from "@/state/PaceProvider";
import { Card } from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/plan")({
  head: () => ({
    meta: [
      { title: "Plan — Pace" },
      {
        name: "description",
        content: "Manage commitments, subscriptions and savings goals for your month.",
      },
      { property: "og:title", content: "Plan your month — Pace" },
      { property: "og:description", content: "Commitments, subscriptions and goals in one place." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Plan,
});

const STATUS_TONE: Record<CommitmentStatus, string> = {
  pending: "bg-primary/25 text-lilac-text",
  paid: "bg-safe/20 text-safe-text",
  late: "bg-risk/20 text-risk-text",
  skipped: "bg-muted text-muted-foreground",
};

const commitmentSchema = z.object({
  label: z
    .string()
    .trim()
    .min(1, "Add a name")
    .max(40, "Keep it under 40 characters")
    .regex(/^[\p{L}\p{N} .,'&/+()-]+$/u, "Use letters, numbers and simple punctuation"),
  amount: z
    .number({ invalid_type_error: "Enter an amount" })
    .int("Whole rupees only")
    .positive("Must be more than ₹0")
    .max(10_000_000, "That's too large"),
  dueDay: z
    .number({ invalid_type_error: "Enter a day" })
    .int()
    .min(1, "Day 1–30")
    .max(30, "Day 1–30"),
});

function Plan() {
  return (
    <div className="grid gap-5">
      <div>
        <h1 className="text-3xl font-bold">Plan</h1>
        <p className="text-muted-foreground">
          Everything your month has already promised to someone.
        </p>
      </div>
      <Tabs defaultValue="commitments">
        <TabsList className="rounded-full">
          <TabsTrigger value="commitments" className="rounded-full">
            Commitments
          </TabsTrigger>
          <TabsTrigger value="subscriptions" className="rounded-full">
            Subscriptions
          </TabsTrigger>
          <TabsTrigger value="goals" className="rounded-full">
            Goals
          </TabsTrigger>
        </TabsList>
        <TabsContent value="commitments" className="mt-4">
          <Commitments />
        </TabsContent>
        <TabsContent value="subscriptions" className="mt-4">
          <Subscriptions />
        </TabsContent>
        <TabsContent value="goals" className="mt-4">
          <Goals />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Commitments() {
  const { state, update } = usePace();
  const [editing, setEditing] = useState<Commitment | "new" | null>(null);
  const d = state.profile.day;
  const upcoming = state.commitments
    .filter((c) => isCommitmentRemaining(c, d))
    .sort((a, b) => a.dueDay - b.dueDay)
    .slice(0, 4);

  return (
    <div className="grid gap-4 lg:grid-cols-[2fr_1fr] [&>*]:min-w-0">
      <Card
        title="Commitments"
        action={
          <Button size="sm" className="rounded-full" onClick={() => setEditing("new")}>
            <Plus aria-hidden="true" /> Add commitment
          </Button>
        }
      >
        {state.commitments.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No commitments yet. Add rent, a recharge or money you owe a friend.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <caption className="sr-only">Your commitments</caption>
              <thead>
                <tr className="border-b text-xs text-muted-foreground">
                  <th scope="col" className="pb-2 text-left font-medium">
                    Label
                  </th>
                  <th scope="col" className="pb-2 text-right font-medium">
                    Amount
                  </th>
                  <th scope="col" className="pb-2 text-right font-medium">
                    Due
                  </th>
                  <th scope="col" className="pb-2 text-left pl-4 font-medium">
                    Status
                  </th>
                  <th scope="col" className="pb-2">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {state.commitments.map((c) => (
                  <tr key={c.id} className="border-b last:border-0">
                    <td className="py-2">{c.label}</td>
                    <td className="py-2 text-right money">{formatINR(c.amount)}</td>
                    <td className="py-2 text-right money">Day {c.dueDay}</td>
                    <td className="py-2 pl-4">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                          STATUS_TONE[c.status],
                        )}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="py-1 text-right whitespace-nowrap">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Edit ${c.label}`}
                        onClick={() => setEditing(c)}
                        disabled={c.status === "paid"}
                      >
                        <Pencil aria-hidden="true" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Delete ${c.label}`}
                        onClick={() => {
                          update((s) => ({
                            ...s,
                            commitments: s.commitments.filter((x) => x.id !== c.id),
                          }));
                          toast(`${c.label} removed.`);
                        }}
                      >
                        <Trash2 aria-hidden="true" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <Card title="Next upcoming">
        {upcoming.length === 0 ? (
          <p className="text-sm text-muted-foreground">All clear for the rest of the month.</p>
        ) : (
          <ol className="grid gap-2">
            {upcoming.map((c) => (
              <li key={c.id} className="flex justify-between rounded-xl bg-muted px-3 py-2 text-sm">
                <span>
                  {c.label}{" "}
                  <span className="text-muted-foreground">
                    · {c.status === "late" ? "late" : `day ${c.dueDay}`}
                  </span>
                </span>
                <span className="font-semibold money">{formatINR(c.amount)}</span>
              </li>
            ))}
          </ol>
        )}
      </Card>
      <CommitmentDialog
        value={editing}
        minDay={d}
        onClose={() => setEditing(null)}
        onSave={(v) => {
          update((s) =>
            editing === "new"
              ? { ...s, commitments: [...s.commitments, { id: uid("c"), status: "pending", ...v }] }
              : {
                  ...s,
                  commitments: s.commitments.map((c) =>
                    editing && c.id === editing.id
                      ? { ...c, ...v, status: c.status === "late" ? "late" : "pending" }
                      : c,
                  ),
                },
          );
          toast.success(editing === "new" ? "Commitment added." : "Commitment updated.");
          setEditing(null);
        }}
      />
    </div>
  );
}

function CommitmentDialog({
  value,
  minDay,
  onClose,
  onSave,
}: {
  value: Commitment | "new" | null;
  minDay: number;
  onClose: () => void;
  onSave: (v: { label: string; amount: number; dueDay: number }) => void;
}) {
  const init = value && value !== "new" ? value : null;
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [day, setDay] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [lastKey, setLastKey] = useState<string | null>(null);
  const key = value === null ? null : value === "new" ? "new" : value.id;
  if (key !== lastKey) {
    setLastKey(key);
    setLabel(init?.label ?? "");
    setAmount(init ? String(init.amount) : "");
    setDay(init ? String(init.dueDay) : String(minDay));
    setErrors({});
  }

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const r = commitmentSchema.safeParse({
      label,
      amount: amount === "" ? Number.NaN : Number(amount),
      dueDay: day === "" ? Number.NaN : Number(day),
    });
    if (!r.success) {
      const errs: Record<string, string> = {};
      for (const i of r.error.issues) errs[String(i.path[0])] ??= i.message;
      setErrors(errs);
      return;
    }
    onSave(r.data);
  };
  const input =
    "h-11 w-full rounded-xl border border-input bg-background px-3 money aria-[invalid=true]:border-destructive";

  return (
    <Dialog open={value !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="rounded-2xl">
        <DialogHeader>
          <DialogTitle>{value === "new" ? "Add commitment" : "Edit commitment"}</DialogTitle>
          <DialogDescription>Bills and promises you need to pay this month.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-3" noValidate>
          {(
            [
              ["label", "Name", label, setLabel, "text"],
              [
                "amount",
                "Amount (₹)",
                amount,
                (v: string) => setAmount(v.replace(/\D/g, "").slice(0, 8)),
                "numeric",
              ],
              [
                "dueDay",
                "Due day (1–30)",
                day,
                (v: string) => setDay(v.replace(/\D/g, "").slice(0, 2)),
                "numeric",
              ],
            ] as const
          ).map(([k, l, v, fn, mode]) => (
            <div key={k} className="grid gap-1">
              <label htmlFor={`cm-${k}`} className="text-sm font-medium">
                {l}
              </label>
              <input
                id={`cm-${k}`}
                className={input}
                value={v}
                inputMode={mode}
                maxLength={40}
                aria-invalid={!!errors[k]}
                aria-describedby={`cm-${k}-e`}
                onChange={(e) => fn(e.target.value)}
              />
              <p id={`cm-${k}-e`} className="text-xs text-destructive">
                {errors[k]}
              </p>
            </div>
          ))}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Subscriptions() {
  const { state, update } = usePace();
  const total = state.subscriptions.filter((s) => s.active).reduce((a, s) => a + s.amount, 0);
  return (
    <Card
      title="Subscriptions"
      action={
        <p className="text-sm text-muted-foreground money">
          {formatINR(total)}/mo · {formatINR(total * 12)}/yr
        </p>
      }
    >
      {state.subscriptions.length === 0 ? (
        <p className="text-sm text-muted-foreground">No subscriptions. Your wallet thanks you.</p>
      ) : (
        <ul className="grid gap-2">
          {state.subscriptions.map((s) => (
            <li
              key={s.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-muted px-3 py-3"
            >
              <div>
                <p className={cn("font-medium", !s.active && "text-muted-foreground line-through")}>
                  {s.label}
                </p>
                <p className="text-xs text-muted-foreground money">
                  {formatINR(s.amount)}/mo · {formatINR(s.amount * 12)}/yr · renews day {s.renewDay}
                  {s.charged ? " · paid this month" : ""}
                </p>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <span>{s.active ? "Keep" : "Cancelled"}</span>
                <Switch
                  checked={s.active}
                  aria-label={`Keep ${s.label}`}
                  onCheckedChange={(v) => {
                    update((st) => ({
                      ...st,
                      subscriptions: st.subscriptions.map((x) =>
                        x.id === s.id ? { ...x, active: v } : x,
                      ),
                    }));
                    if (!v && s.charged)
                      toast(
                        `${s.label} cancelled. It already renewed this month, so this saves nothing until next month.`,
                      );
                    else
                      toast(
                        v
                          ? `${s.label} kept.`
                          : `${s.label} cancelled. You save ${formatINR(s.amount * 12)} a year.`,
                      );
                  }}
                />
              </label>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function Goals() {
  const { state, moveMoneyToGoal } = usePace();
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {state.goals.length === 0 && (
        <Card>
          <p className="text-sm text-muted-foreground">
            No goals yet. Restart onboarding to add one.
          </p>
        </Card>
      )}
      {state.goals.map((g) => {
        const pct = g.target > 0 ? Math.min(100, (g.saved / g.target) * 100) : 0;
        const eta = goalEta(state, g);
        const val = amounts[g.id] ?? "";
        const num = Number(val);
        const invalid = val !== "" && (!Number.isFinite(num) || num <= 0);
        return (
          <Card
            key={g.id}
            title={
              <span className="flex items-center gap-2">
                <Target className="size-5 text-lilac-text" aria-hidden="true" />
                {g.label}
              </span>
            }
          >
            <p className="font-display text-2xl font-bold money">
              {formatINR(g.saved)}{" "}
              <span className="text-base font-normal text-muted-foreground">
                of {formatINR(g.target)}
              </span>
            </p>
            <Progress
              value={pct}
              className="mt-2 h-2.5"
              aria-label={`${g.label} progress ${Math.round(pct)}%`}
            />
            <p className="mt-2 text-sm text-muted-foreground">
              Planned this month {formatINR(g.plannedThisMonth)} on day {g.contributionDay}
              {g.contributed ? " (done)" : ""} · ETA{" "}
              <strong className="text-foreground">{eta.text}</strong>
            </p>
            <form
              className="mt-3 flex flex-wrap items-start gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (!val || invalid) return;
                const r = moveMoneyToGoal(g.id, num);
                if (r.moved === 0)
                  toast.error(
                    g.saved >= g.target
                      ? "This goal is already reached."
                      : "Not enough balance to move money right now.",
                  );
                else {
                  toast.success(
                    r.reached
                      ? `${g.label} reached! 🎉`
                      : `Moved ${formatINR(r.moved)} to ${g.label}.`,
                  );
                  if (r.moved < num)
                    toast(`Capped at ${formatINR(r.moved)}, that's all it needed.`);
                }
                setAmounts((a) => ({ ...a, [g.id]: "" }));
              }}
            >
              <label htmlFor={`mv-${g.id}`} className="sr-only">
                Amount to move to {g.label}
              </label>
              <input
                id={`mv-${g.id}`}
                inputMode="numeric"
                placeholder="₹ amount"
                value={val}
                aria-invalid={invalid}
                onChange={(e) =>
                  setAmounts((a) => ({
                    ...a,
                    [g.id]: e.target.value.replace(/\D/g, "").slice(0, 7),
                  }))
                }
                className="h-10 w-32 rounded-xl border border-input bg-background px-3 money placeholder:text-muted-foreground"
              />
              <Button
                type="submit"
                variant="secondary"
                disabled={!val || invalid || g.saved >= g.target}
              >
                Move money to goal
              </Button>
            </form>
          </Card>
        );
      })}
    </div>
  );
}
