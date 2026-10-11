import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Props {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  tone?: "default" | "safe" | "risk";
}

export function StatCard({ label, value, hint, icon, tone = "default" }: Props) {
  return (
    <div className="relative rounded-2xl bg-card p-4 shadow-card">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{label}</p>
        {icon && (
          <span aria-hidden="true" className="text-muted-foreground">
            {icon}
          </span>
        )}
      </div>
      <p
        className={cn(
          "mt-2 font-display text-2xl font-semibold money sm:text-[1.7rem]",
          tone === "safe" && "text-safe-text",
          tone === "risk" && "text-risk-text",
        )}
      >
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function Card({
  title,
  action,
  children,
  className,
  as: Tag = "section",
}: {
  title?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  as?: "section" | "div";
}) {
  return (
    <Tag className={cn("rounded-2xl bg-card p-4 shadow-card sm:p-5", className)}>
      {(title || action) && (
        <div className="mb-3 flex items-center justify-between gap-2">
          {title && <h2 className="text-lg font-semibold">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </Tag>
  );
}
