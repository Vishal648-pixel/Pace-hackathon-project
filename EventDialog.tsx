import { Zap } from "lucide-react";
import { toast } from "sonner";
import { computeMetrics, formatINR, resolveEvent } from "@/engine";
import { usePace } from "@/state/PaceProvider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function EventDialog() {
  const { state, metrics, resolve } = usePace();
  const ev = state.pendingEvent;
  if (!ev) return null;
  const gift = ev.cost < 0;

  return (
    <Dialog open onOpenChange={() => undefined}>
      <DialogContent
        className="max-w-lg rounded-2xl [&>button:last-child]:hidden"
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-lilac-text">
            <Zap className="size-3.5" aria-hidden="true" /> Day {ev.day} surprise
          </p>
          <DialogTitle className="text-2xl">{ev.title}</DialogTitle>
          <DialogDescription>
            {gift
              ? `You received ${formatINR(-ev.cost)}. Where should it go?`
              : `This costs ${formatINR(ev.cost)}. Pick how to handle it.`}
            {!gift && ev.cost > state.balance && " It's more than your current balance."}
          </DialogDescription>
        </DialogHeader>
        <ul className="grid gap-3">
          {ev.responses.map((r) => {
            const after = computeMetrics(resolveEvent(state, r.id));
            return (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => {
                    resolve(r.id);
                    toast.success(`${r.label}. Done.`);
                  }}
                  className="w-full rounded-xl border bg-card p-3 text-left transition-colors hover:border-primary hover:bg-accent"
                >
                  <span className="block font-semibold">{r.label}</span>
                  <span className="block text-sm text-muted-foreground">{r.description}</span>
                  <span className="mt-2 grid grid-cols-3 gap-2 text-xs money">
                    <span>
                      Balance
                      <br />
                      <strong>
                        {formatINR(metrics.balance)} → {formatINR(after.balance)}
                      </strong>
                    </span>
                    <span>
                      Allowance
                      <br />
                      <strong>
                        {formatINR(metrics.dailyAllowance)} → {formatINR(after.dailyAllowance)}
                      </strong>
                    </span>
                    <span>
                      Risk
                      <br />
                      <strong>
                        {metrics.risk.score} → {after.risk.score}
                      </strong>
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
