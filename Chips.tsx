import {
  ShieldAlert,
  ShieldCheck,
  Shield,
  HeartPulse,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from "lucide-react";
import type { HealthResult, RiskResult, Verdict } from "@/engine";
import { cn } from "@/lib/utils";

const base = "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium money";

export function RiskChip({ risk, className }: { risk: RiskResult; className?: string }) {
  const Icon = risk.label === "Low" ? ShieldCheck : risk.label === "Medium" ? Shield : ShieldAlert;
  const tone =
    risk.label === "Low"
      ? "bg-safe/20 text-safe-text"
      : risk.label === "Medium"
        ? "bg-primary/25 text-lilac-text"
        : "bg-risk/20 text-risk-text";
  return (
    <span className={cn(base, tone, className)}>
      <Icon className="size-4" aria-hidden="true" />
      Risk: {risk.label} {risk.score}/100
    </span>
  );
}

export function HealthChip({ health, className }: { health: HealthResult; className?: string }) {
  const tone =
    health.score >= 60
      ? "bg-safe/20 text-safe-text"
      : health.score >= 40
        ? "bg-primary/25 text-lilac-text"
        : "bg-risk/20 text-risk-text";
  return (
    <span className={cn(base, tone, className)}>
      <HeartPulse className="size-4" aria-hidden="true" />
      Health: {health.score}/100 {health.label}
    </span>
  );
}

export function VerdictChip({ verdict, reason }: { verdict: Verdict; reason: string }) {
  const Icon = verdict === "Safe" ? CheckCircle2 : verdict === "Tight" ? AlertTriangle : XCircle;
  const tone =
    verdict === "Safe"
      ? "bg-safe/20 text-safe-text"
      : verdict === "Tight"
        ? "bg-primary/25 text-lilac-text"
        : "bg-risk/20 text-risk-text";
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className={cn(base, tone, "text-base")}>
        <Icon className="size-4" aria-hidden="true" />
        {verdict}
      </span>
      <span className="text-sm text-muted-foreground">{reason}</span>
    </div>
  );
}
