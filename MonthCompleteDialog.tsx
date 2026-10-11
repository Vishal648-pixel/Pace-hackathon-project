import { useNavigate } from "@tanstack/react-router";
import { PartyPopper } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { GRADE_BLURB, formatINR, gradeMonth } from "@/engine";
import { usePace } from "@/state/PaceProvider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/** Celebrates the moment the month finishes, then sends the user to the report. */
export function MonthCompleteDialog() {
  const { state, metrics } = usePace();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const prev = useRef(state.monthFinished);

  useEffect(() => {
    if (!prev.current && state.monthFinished) setOpen(true);
    prev.current = state.monthFinished;
  }, [state.monthFinished]);

  const grade = gradeMonth(metrics.health.score, metrics.balance);
  const goReport = () => {
    setOpen(false);
    void navigate({ to: "/report" });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="rounded-3xl text-center sm:max-w-sm">
        <DialogHeader className="items-center sm:text-center">
          <PartyPopper className="size-10 text-primary" aria-hidden="true" />
          <DialogTitle className="font-display text-2xl">You made it to day 30!</DialogTitle>
          <DialogDescription>{GRADE_BLURB[grade]}</DialogDescription>
        </DialogHeader>
        <div className="mx-auto grid size-28 place-items-center rounded-full bg-primary text-primary-foreground shadow-lift motion-safe:animate-in motion-safe:zoom-in-50">
          <span className="font-display text-6xl font-bold" aria-label={`Final grade ${grade}`}>
            {grade}
          </span>
        </div>
        <p className="text-sm text-muted-foreground money">
          Closing balance {formatINR(metrics.balance)} · Health {metrics.health.score}/100
        </p>
        <DialogFooter className="sm:justify-center">
          <Button size="lg" className="rounded-full" onClick={goReport} autoFocus>
            See my Runway Report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
