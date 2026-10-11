import type { MonthState, Metrics } from "./types";
import { dailyAllowance, safeToSpend } from "./safeToSpend";
import { blendedBurn, forecastDay30 } from "./forecast";
import { riskScore } from "./risk";
import { healthScore } from "./health";
import { daysLeft } from "./util";

export function computeMetrics(state: MonthState): Metrics {
  const forecast = forecastDay30(state);
  const opening = state.profile.openingBalance;
  return {
    balance: state.balance,
    safeToSpend: safeToSpend(state),
    dailyAllowance: dailyAllowance(state),
    daysLeft: daysLeft(state.profile.day),
    forecast,
    forecastChangePct: opening > 0 ? ((forecast - opening) / opening) * 100 : 0,
    burn: blendedBurn(state),
    risk: riskScore(state),
    health: healthScore(state),
  };
}
