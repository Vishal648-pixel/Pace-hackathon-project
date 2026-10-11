import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  label: string;
  before: string;
  after: string;
  delta: number;
  /** How to word the delta, e.g. "₹500". */
  deltaText: string;
  /** true when a higher value is better (balance), false when lower is better (risk). */
  higherIsBetter: boolean;
}

export function DiffRow({ label, before, after, delta, deltaText, higherIsBetter }: Props) {
  const flat = Math.abs(delta) < 0.5;
  const good = flat ? null : delta > 0 === higherIsBetter;
  const Icon = flat ? Minus : delta > 0 ? ArrowUpRight : ArrowDownRight;
  const word = flat ? "No change" : `${delta > 0 ? "Up" : "Down"} ${deltaText}`;
  return (
    <tr className="border-b last:border-0">
      <th scope="row" className="py-2.5 pr-2 text-left text-sm font-medium">
        {label}
      </th>
      <td className="py-2.5 pr-2 text-right text-sm money text-muted-foreground">{before}</td>
      <td className="py-2.5 pr-2 text-right text-sm font-semibold money">{after}</td>
      <td className="py-2.5 text-right">
        <span
          key={`${after}`}
          className={cn(
            "inline-flex animate-pop items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium money",
            good === null && "bg-muted text-muted-foreground",
            good === true && "bg-safe/20 text-safe-text",
            good === false && "bg-risk/20 text-risk-text",
          )}
        >
          <Icon className="size-3.5" aria-hidden="true" />
          {word}
        </span>
      </td>
    </tr>
  );
}
