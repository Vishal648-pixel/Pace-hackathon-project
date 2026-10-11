import { Delete } from "lucide-react";
import { SPEND_CATEGORIES, type SpendCategory } from "@/engine";
import { CATEGORY_META } from "@/lib/categories";
import { cn } from "@/lib/utils";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "00", "0", "back"] as const;

export function Keypad({
  value,
  onChange,
  max = 9_999_999,
}: {
  value: string;
  onChange: (v: string) => void;
  max?: number;
}) {
  const press = (k: (typeof KEYS)[number]) => {
    if (k === "back") return onChange(value.slice(0, -1));
    const next = (value + k).replace(/^0+/, "");
    if (Number(next) <= max) onChange(next);
  };
  return (
    <div className="grid grid-cols-3 gap-2" role="group" aria-label="Amount keypad">
      {KEYS.map((k) => (
        <button
          key={k}
          type="button"
          onClick={() => press(k)}
          aria-label={k === "back" ? "Backspace" : k}
          className="min-h-12 rounded-xl bg-muted font-display text-xl font-semibold transition-colors hover:bg-accent active:scale-[0.98]"
        >
          {k === "back" ? <Delete className="mx-auto size-5" aria-hidden="true" /> : k}
        </button>
      ))}
    </div>
  );
}

export function CategoryChips({
  value,
  onChange,
}: {
  value: SpendCategory;
  onChange: (c: SpendCategory) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium">Category</legend>
      <div className="flex flex-wrap gap-2">
        {SPEND_CATEGORIES.map((c) => (
          <label
            key={c}
            className={cn(
              "inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring",
              value === c
                ? "border-primary bg-primary text-primary-foreground"
                : "bg-card hover:bg-accent",
            )}
          >
            <input
              type="radio"
              name="category"
              value={c}
              checked={value === c}
              onChange={() => onChange(c)}
              className="sr-only"
            />
            <span aria-hidden="true">{CATEGORY_META[c].emoji}</span>
            {CATEGORY_META[c].label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium">{label}</legend>
      <div className="inline-flex rounded-full bg-muted p-1">
        {options.map((o) => (
          <label
            key={o.value}
            className={cn(
              "cursor-pointer rounded-full px-4 py-1.5 text-sm font-medium transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring",
              value === o.value ? "bg-card shadow-card" : "text-muted-foreground",
            )}
          >
            <input
              type="radio"
              name={label}
              value={o.value}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
              className="sr-only"
            />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
