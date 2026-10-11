import { Link, useNavigate } from "@tanstack/react-router";
import {
  Activity,
  Bell,
  FileText,
  FlaskConical,
  Home,
  LineChart,
  ListChecks,
  Plane,
  RotateCcw,
  Search,
} from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { formatINR, isCommitmentRemaining, isSubscriptionRemaining } from "@/engine";
import { usePace } from "@/state/PaceProvider";
import { ThemeToggle } from "./ThemeToggle";
import { EventDialog } from "./EventDialog";
import { MonthCompleteDialog } from "./MonthCompleteDialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const NAV = [
  { to: "/", label: "Home", icon: Home },
  { to: "/simulate", label: "Simulate", icon: FlaskConical },
  { to: "/plan", label: "Plan", icon: ListChecks },
  { to: "/activity", label: "Activity", icon: Activity },
  { to: "/insights", label: "Insights", icon: LineChart },
  { to: "/report", label: "Report", icon: FileText },
] as const;

function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2 rounded-lg" aria-label="Pace home">
      <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">
        <Plane className="size-5 -rotate-45" aria-hidden="true" />
      </span>
      <span className="font-display text-2xl font-bold">pace</span>
    </Link>
  );
}

function Sidebar() {
  const { resetMonth } = usePace();
  const navigate = useNavigate();
  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col bg-nav p-5 text-nav-foreground lg:flex">
      <Logo />
      <p className="mt-2 text-sm text-nav-muted">Make your money move.</p>
      <nav aria-label="Main" className="mt-8">
        <ul className="grid gap-1">
          {NAV.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <Link
                to={to}
                activeOptions={{ exact: to === "/" }}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-nav-muted transition-colors hover:bg-nav-active hover:text-nav-foreground data-[status=active]:bg-nav-active data-[status=active]:text-nav-foreground"
              >
                <Icon className="size-4" aria-hidden="true" />
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className="mt-auto grid gap-1">
        <ThemeToggle className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-nav-muted hover:bg-nav-active hover:text-nav-foreground" />
        <AlertDialog>
          <AlertDialogTrigger className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-nav-muted hover:bg-nav-active hover:text-nav-foreground">
            <RotateCcw className="size-4" aria-hidden="true" /> Reset month
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reset this month?</AlertDialogTitle>
              <AlertDialogDescription>
                All transactions, scenarios and progress will be cleared and you'll start again from
                onboarding.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep going</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  resetMonth();
                  void navigate({ to: "/onboarding" });
                  toast("Month reset. Fresh start.");
                }}
              >
                Reset month
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </aside>
  );
}

function BottomTabs() {
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-nav pb-[env(safe-area-inset-bottom)] text-nav-foreground lg:hidden"
    >
      <ul className="grid grid-cols-5">
        {NAV.slice(0, 5).map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <Link
              to={to}
              activeOptions={{ exact: to === "/" }}
              className="flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium text-nav-muted data-[status=active]:text-primary"
            >
              <Icon className="size-5" aria-hidden="true" />
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function TopBar() {
  const { state } = usePace();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const d = state.profile.day;
  const soon = [
    ...state.commitments
      .filter((c) => isCommitmentRemaining(c, d) && c.dueDay <= d + 3)
      .map((c) => ({
        id: c.id,
        label: c.label,
        amount: c.amount,
        day: c.dueDay,
        late: c.status === "late",
      })),
    ...state.subscriptions
      .filter((s) => isSubscriptionRemaining(s, d) && s.renewDay <= d + 3)
      .map((s) => ({ id: s.id, label: s.label, amount: s.amount, day: s.renewDay, late: false })),
  ].sort((a, b) => a.day - b.day);
  const initials = (state.profile.name || "You")
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    void navigate({ to: "/activity", search: { q: q.trim().slice(0, 60) } });
  };

  return (
    <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-border bg-background/90 px-4 py-3 backdrop-blur sm:gap-3 lg:px-8">
      <div className="lg:hidden">
        <Logo />
      </div>
      <form
        role="search"
        onSubmit={onSearch}
        className="relative ml-auto hidden max-w-sm flex-1 sm:block lg:ml-0"
      >
        <label htmlFor="global-search" className="sr-only">
          Search transactions
        </label>
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <input
          id="global-search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          maxLength={60}
          placeholder="Search transactions"
          className="h-10 w-full rounded-full border border-input bg-card pl-9 pr-3 text-sm placeholder:text-muted-foreground"
        />
      </form>
      <div className="ml-auto flex items-center gap-2 sm:ml-0 lg:ml-auto">
        <span className="hidden whitespace-nowrap rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-semibold text-lilac-text md:inline-block">
          Gen Z Budget: ₹10,000 / 30 Days
        </span>
        <span
          className="rounded-full bg-primary px-3 py-1 text-sm font-semibold text-primary-foreground money"
          aria-label={`Day ${d} of 30`}
        >
          Day {d}/30
        </span>
        <Popover>
          <PopoverTrigger
            className="relative grid size-10 place-items-center rounded-full hover:bg-accent"
            aria-label={`Notifications, ${soon.length} upcoming`}
          >
            <Bell className="size-5" aria-hidden="true" />
            {soon.length > 0 && (
              <span
                className="absolute right-2 top-2 size-2 rounded-full bg-risk"
                aria-hidden="true"
              />
            )}
          </PopoverTrigger>
          <PopoverContent align="end" className="w-72 rounded-2xl">
            <h2 className="mb-2 text-sm font-semibold">Due in the next 3 days</h2>
            {soon.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing due soon. Nice and quiet.</p>
            ) : (
              <ul className="grid gap-2">
                {soon.map((s) => (
                  <li key={s.id} className="flex justify-between text-sm">
                    <span>
                      {s.label}
                      {s.late ? " (late)" : ""} · day {s.day}
                    </span>
                    <span className="money font-medium">{formatINR(s.amount)}</span>
                  </li>
                ))}
              </ul>
            )}
          </PopoverContent>
        </Popover>
        <Popover>
          <PopoverTrigger
            className="grid size-10 place-items-center rounded-full bg-secondary text-sm font-semibold hover:ring-2 hover:ring-primary"
            aria-label={`Account menu for ${state.profile.name || "you"}`}
          >
            {initials}
          </PopoverTrigger>
          <PopoverContent align="end" className="w-64 rounded-2xl">
            <p className="text-sm font-semibold">{state.profile.name || "You"}</p>
            <p className="text-xs text-muted-foreground">Your month is saved on this device.</p>
          </PopoverContent>
        </Popover>
      </div>
    </header>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh">
      <a
        href="#main"
        className="sr-only z-50 rounded bg-primary px-3 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
      >
        Skip to content
      </a>
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main
          id="main"
          className="mx-auto w-full max-w-6xl flex-1 px-4 pb-24 pt-5 lg:px-8 lg:pb-10"
        >
          {children}
        </main>
      </div>
      <BottomTabs />
      <EventDialog />
      <MonthCompleteDialog />
    </div>
  );
}
