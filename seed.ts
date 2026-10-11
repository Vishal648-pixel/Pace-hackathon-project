import type { Commitment, Goal, Income, PaceState, Persona, Subscription } from "./types";
import { safeToSpend } from "./safeToSpend";
import { daysLeft } from "./util";

export interface PersonaTemplate {
  persona: Persona;
  title: string;
  blurb: string;
  openingBalance: number;
  incomes: Omit<Income, "received">[];
  commitments: Omit<Commitment, "status">[];
  subscriptions: Omit<Subscription, "charged">[];
  goals: Omit<Goal, "contributed">[];
}

export const PERSONAS: Record<Persona, PersonaTemplate> = {
  student: {
    persona: "student",
    title: "Hostel student",
    blurb: "Pocket money, shared rent and a tight weekly rhythm.",
    openingBalance: 10000,
    incomes: [{ id: "inc_gig", day: 15, amount: 1500, label: "Freelance gig", enabled: false }],
    commitments: [
      { id: "c_transport", label: "Transport pass", amount: 600, dueDay: 3 },
      { id: "c_phone", label: "Phone recharge", amount: 299, dueDay: 5 },
      { id: "c_rent", label: "PG/rent share", amount: 2500, dueDay: 10 },
      { id: "c_friend", label: "Repay friend", amount: 500, dueDay: 20 },
    ],
    subscriptions: [
      { id: "s_gym", label: "Gym", amount: 500, renewDay: 1, active: true },
      { id: "s_spotify", label: "Spotify", amount: 119, renewDay: 7, active: true },
      { id: "s_netflix", label: "Netflix", amount: 199, renewDay: 12, active: true },
      { id: "s_youtube", label: "YouTube Premium", amount: 149, renewDay: 14, active: true },
    ],
    goals: [
      {
        id: "g_emergency",
        label: "Emergency fund",
        target: 3000,
        saved: 0,
        plannedThisMonth: 700,
        deadlineDay: 30,
        contributionDay: 25,
      },
      {
        id: "g_earbuds",
        label: "Earbuds",
        target: 2000,
        saved: 0,
        plannedThisMonth: 800,
        deadlineDay: 30,
        contributionDay: 28,
      },
    ],
  },
  intern: {
    persona: "intern",
    title: "Intern",
    blurb: "A stipend mid-month, a commute and a flatshare.",
    openingBalance: 10000,
    incomes: [
      { id: "inc_stipend", day: 15, amount: 8000, label: "Internship stipend", enabled: true },
    ],
    commitments: [
      { id: "c_metro", label: "Metro card top-up", amount: 900, dueDay: 2 },
      { id: "c_phone", label: "Phone recharge", amount: 349, dueDay: 6 },
      { id: "c_rent", label: "Flat rent share", amount: 6000, dueDay: 5 },
      { id: "c_wifi", label: "Wi-Fi share", amount: 400, dueDay: 18 },
    ],
    subscriptions: [
      { id: "s_spotify", label: "Spotify", amount: 119, renewDay: 7, active: true },
      { id: "s_prime", label: "Prime Video", amount: 299, renewDay: 11, active: true },
      { id: "s_cloud", label: "Cloud storage", amount: 130, renewDay: 20, active: true },
    ],
    goals: [
      {
        id: "g_emergency",
        label: "Emergency fund",
        target: 5000,
        saved: 500,
        plannedThisMonth: 1500,
        deadlineDay: 30,
        contributionDay: 25,
      },
      {
        id: "g_laptop",
        label: "Laptop upgrade",
        target: 20000,
        saved: 2000,
        plannedThisMonth: 1500,
        deadlineDay: 30,
        contributionDay: 28,
      },
    ],
  },
  freelancer: {
    persona: "freelancer",
    title: "Freelancer",
    blurb: "Lumpy client payments and tools you pay for yourself.",
    openingBalance: 10000,
    incomes: [
      { id: "inc_client_a", day: 9, amount: 6000, label: "Client A invoice", enabled: true },
      { id: "inc_client_b", day: 24, amount: 3500, label: "Client B invoice", enabled: true },
    ],
    commitments: [
      { id: "c_rent", label: "Room rent", amount: 4500, dueDay: 4 },
      { id: "c_phone", label: "Phone + data", amount: 399, dueDay: 8 },
      { id: "c_cowork", label: "Co-working day pass", amount: 1200, dueDay: 15 },
    ],
    subscriptions: [
      { id: "s_figma", label: "Design tool", amount: 1000, renewDay: 3, active: true },
      { id: "s_spotify", label: "Spotify", amount: 119, renewDay: 7, active: true },
      { id: "s_domain", label: "Portfolio hosting", amount: 250, renewDay: 16, active: true },
    ],
    goals: [
      {
        id: "g_tax",
        label: "Tax pot",
        target: 6000,
        saved: 1000,
        plannedThisMonth: 1500,
        deadlineDay: 30,
        contributionDay: 26,
      },
      {
        id: "g_camera",
        label: "Camera",
        target: 15000,
        saved: 0,
        plannedThisMonth: 1000,
        deadlineDay: 30,
        contributionDay: 28,
      },
    ],
  },
};

export function buildState(
  template: PersonaTemplate,
  name: string,
  seed: number,
  bufferFloor = 1000,
): PaceState {
  const state: PaceState = {
    version: 1,
    started: false,
    profile: {
      persona: template.persona,
      seed,
      day: 1,
      openingBalance: template.openingBalance,
      bufferFloor,
      name,
      baselineDaily: 0,
    },
    balance: template.openingBalance,
    incomes: template.incomes.map((i) => ({ ...i, received: false })),
    commitments: template.commitments.map((c) => ({ ...c, status: "pending" as const })),
    subscriptions: template.subscriptions.map((s) => ({ ...s, charged: false })),
    goals: template.goals.map((g) => ({ ...g, contributed: false })),
    transactions: [],
    eventLog: [],
    pendingEvent: null,
    balanceHistory: [template.openingBalance],
    streak: 0,
    monthFinished: false,
    decisions: [],
    savedScenarios: [],
    undoStack: [],
  };
  return withBaseline(state);
}

/** Locks in the opening daily allowance used as the burn fallback. */
function withBaseline<T extends PaceState>(state: T): T {
  const sts = safeToSpend(state);
  return {
    ...state,
    profile: { ...state.profile, baselineDaily: Math.max(0, sts / daysLeft(state.profile.day)) },
  };
}

const DEFAULT_SEED = 20261011;

export function freshSeed(): PaceState {
  return buildState(PERSONAS.student, "", DEFAULT_SEED);
}
