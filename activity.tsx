import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Plus, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { formatINR, type SpendCategory, type Transaction } from "@/engine";
import { usePace } from "@/state/PaceProvider";
import { Card } from "@/components/StatCard";
import { CategoryChips, Keypad, Segmented } from "@/components/Keypad";
import { Button } from "@/components/ui/button";
import { CATEGORY_META } from "@/lib/categories";
import { cn } from "@/lib/utils";

const searchSchema = z.object({ q: z.string().max(60).optional().catch(undefined) });

export const Route = createFileRoute("/activity")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Activity — Pace" },
      {
        name: "description",
        content: "Log spending with a keypad and browse your history by day.",
      },
      { property: "og:title", content: "Activity — Pace" },
      { property: "og:description", content: "Log spending and browse your history by day." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Activity,
});

function Activity() {
  const { state, metrics, addTransaction, removeTransaction, undo } = usePace();
  const { q = "" } = Route.useSearch();
  const navigate = useNavigate({ from: "/activity" });
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<SpendCategory>("food");
  const [type, setType] = useState<"need" | "want">("need");
  const [note, setNote] = useState("");
  const d = state.profile.day;

  const groups = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = state.transactions.filter(
      (t) =>
        !needle ||
        t.label.toLowerCase().includes(needle) ||
        CATEGORY_META[t.category].label.toLowerCase().includes(needle),
    );
    const m = new Map<number, Transaction[]>();
    for (const t of list) m.set(t.day, [...(m.get(t.day) ?? []), t]);
    return [...m.entries()].sort((a, b) => b[0] - a[0]);
  }, [state.transactions, q]);

  const num = Number(amount);
  const valid = amount !== "" && Number.isFinite(num) && num > 0;
  const noteOk = /^[\p{L}\p{N} .,'&/+()-]*$/u.test(note);

  const submit = () => {
    if (!valid || !noteOk) return;
    addTransaction({
      amount: num,
      category,
      type,
      label: note.trim() || CATEGORY_META[category].label,
    });
    toast.success(`Added ${formatINR(num)} · ${CATEGORY_META[category].label}`, {
      action: { label: "Undo", onClick: undo },
    });
    setAmount("");
    setNote("");
  };

  const dayName = (day: number) =>
    day === d ? "Today" : day === d - 1 ? "Yesterday" : `Day ${day}`;

  return (
    <div className="grid gap-5">
      <div>
        <h1 className="text-3xl font-bold">Activity</h1>
        <p className="text-muted-foreground">Log it while you remember it.</p>
      </div>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <Card title="Add a transaction">
          <form
            className="grid gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <div className="rounded-2xl bg-sky p-4 text-center text-nav-foreground">
              <label htmlFor="amt" className="text-xs uppercase tracking-widest opacity-80">
                Amount
              </label>
              <input
                id="amt"
                inputMode="numeric"
                value={amount === "" ? "" : `₹${Number(amount).toLocaleString("en-IN")}`}
                placeholder="₹0"
                onChange={(e) =>
                  setAmount(e.target.value.replace(/\D/g, "").replace(/^0+/, "").slice(0, 7))
                }
                className="block w-full bg-transparent text-center font-display text-5xl font-bold money text-nav-foreground placeholder:text-nav-muted focus-visible:outline-none"
                aria-describedby="amt-hint"
              />
              <p id="amt-hint" className="text-xs opacity-80 money">
                Today's allowance {formatINR(metrics.dailyAllowance)}
              </p>
            </div>
            <Keypad value={amount} onChange={setAmount} max={9_999_999} />
            <CategoryChips value={category} onChange={setCategory} />
            <Segmented
              label="Need or want?"
              value={type}
              onChange={setType}
              options={[
                { value: "need", label: "Need" },
                { value: "want", label: "Want" },
              ]}
            />
            <div className="grid gap-1">
              <label htmlFor="note" className="text-sm font-medium">
                Note (optional)
              </label>
              <input
                id="note"
                value={note}
                maxLength={40}
                onChange={(e) => setNote(e.target.value)}
                aria-invalid={!noteOk}
                aria-describedby="note-e"
                className="h-11 rounded-xl border border-input bg-background px-3"
              />
              <p id="note-e" className="text-xs text-destructive">
                {noteOk ? "" : "Use letters, numbers and simple punctuation."}
              </p>
            </div>
            <Button type="submit" size="lg" className="rounded-full" disabled={!valid || !noteOk}>
              <Plus aria-hidden="true" /> Add transaction
            </Button>
          </form>
        </Card>

        <Card title="History">
          <div className="relative mb-4">
            <label htmlFor="hist-search" className="sr-only">
              Search history
            </label>
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              id="hist-search"
              type="search"
              value={q}
              maxLength={60}
              onChange={(e) =>
                void navigate({ search: { q: e.target.value || undefined }, replace: true })
              }
              placeholder="Search by name or category"
              className="h-11 w-full rounded-full border border-input bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground"
            />
          </div>
          {groups.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {q
                ? `Nothing matches "${q}".`
                : "No transactions yet. Add your first one to start tracking."}
            </p>
          ) : (
            <div className="grid gap-4">
              {groups.map(([day, txs]) => (
                <section key={day} aria-labelledby={`day-${day}`}>
                  <h3
                    id={`day-${day}`}
                    className="mb-2 text-sm font-semibold text-muted-foreground"
                  >
                    {dayName(day)}
                  </h3>
                  <ul className="grid gap-1.5">
                    {txs.map((t) => (
                      <li
                        key={t.id}
                        className="flex items-center gap-3 rounded-xl bg-muted px-3 py-2"
                      >
                        <span className="text-xl" aria-hidden="true">
                          {CATEGORY_META[t.category].emoji}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{t.label}</p>
                          <p className="text-xs text-muted-foreground">
                            {CATEGORY_META[t.category].label}
                            {t.source === "manual" ? ` · ${t.type}` : ""}
                          </p>
                        </div>
                        <span
                          className={cn(
                            "text-sm font-semibold money",
                            t.amount > 0 && "text-safe-text",
                          )}
                        >
                          {formatINR(t.amount, { sign: true })}
                        </span>
                        {t.source === "manual" ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Delete ${t.label} ${formatINR(t.amount)}`}
                            onClick={() => {
                              removeTransaction(t.id);
                              toast("Transaction deleted.", {
                                action: { label: "Undo", onClick: undo },
                              });
                            }}
                          >
                            <Trash2 aria-hidden="true" />
                          </Button>
                        ) : (
                          <span className="size-9" aria-hidden="true" />
                        )}
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
