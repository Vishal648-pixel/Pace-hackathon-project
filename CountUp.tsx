import { useEffect, useRef, useState } from "react";
import { formatINR } from "@/engine";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

interface Props {
  value: number;
  format?: (n: number) => string;
  className?: string;
}

/** Animates between values only when they change (i.e. after a user action). */
export function CountUp({ value, format = (n) => formatINR(n), className }: Props) {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(value);
  const from = useRef(value);

  useEffect(() => {
    if (reduced || from.current === value) {
      from.current = value;
      setShown(value);
      return;
    }
    const start = performance.now();
    const a = from.current;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / 500);
      const eased = 1 - (1 - p) ** 3;
      setShown(a + (value - a) * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
      else from.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      from.current = value;
    };
  }, [value, reduced]);

  return <span className={`money ${className ?? ""}`}>{format(shown)}</span>;
}
