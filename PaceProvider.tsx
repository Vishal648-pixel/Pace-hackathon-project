import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  addManualTransaction,
  advanceDay,
  applyScenario,
  computeMetrics,
  deleteTransaction,
  freshSeed,
  moveToGoal,
  recordDecision,
  resolveEvent,
  describeScenario,
  uid,
  type Category,
  type Metrics,
  type PaceState,
  type Scenario,
} from "@/engine";
import { paceReducer } from "./reducer";
import { clearState, loadState, saveState } from "./storage";

interface PaceApi {
  state: PaceState;
  metrics: Metrics;
  hydrated: boolean;
  start: (next: PaceState) => void;
  advance: () => string[];
  resolve: (responseId: "pay" | "goal" | "borrow") => void;
  addTransaction: (input: {
    amount: number;
    category: Category;
    type: "need" | "want";
    label?: string;
  }) => void;
  removeTransaction: (id: string) => void;
  commitScenario: (sc: Scenario) => string[];
  saveScenario: (sc: Scenario) => boolean;
  removeSavedScenario: (id: string) => void;
  moveMoneyToGoal: (goalId: string, amount: number) => { moved: number; reached: boolean };
  update: (fn: (s: PaceState) => PaceState) => void;
  undo: () => void;
  resetMonth: () => void;
}

// Keep a single context instance across hot reloads so provider and consumers always match.
const globalKey = "__paceContext__" as const;
const g = globalThis as unknown as Record<
  typeof globalKey,
  React.Context<PaceApi | null> | undefined
>;
const PaceContext: React.Context<PaceApi | null> =
  g[globalKey] ?? (g[globalKey] = createContext<PaceApi | null>(null));

export function PaceProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(paceReducer, undefined, freshSeed);
  const [hydrated, setHydrated] = useState(false);
  const ref = useRef(state);
  ref.current = state;

  useEffect(() => {
    const loaded = loadState();
    if (loaded) dispatch({ type: "hydrate", state: loaded });
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) saveState(state);
  }, [state, hydrated]);

  const replace = useCallback(
    (next: PaceState, undoable = true) => dispatch({ type: "replace", next, undoable }),
    [],
  );

  const api = useMemo<Omit<PaceApi, "state" | "metrics" | "hydrated">>(
    () => ({
      start: (next) => replace({ ...next, started: true }, false),
      advance: () => {
        const r = advanceDay(ref.current);
        replace(r.state);
        return r.notes;
      },
      resolve: (id) => replace(resolveEvent(ref.current, id)),
      addTransaction: (input) => {
        const s = ref.current;
        const next = addManualTransaction(s, input);
        replace(
          input.type === "want" && input.amount >= 500
            ? recordDecision(s, next, `Bought ${input.label || input.category}`)
            : next,
        );
      },
      removeTransaction: (id) => replace(deleteTransaction(ref.current, id)),
      commitScenario: (sc) => {
        const s = ref.current;
        const { state: after, notes } = applyScenario(s, sc);
        replace(recordDecision(s, after, describeScenario(sc, s)));
        return notes;
      },
      saveScenario: (sc) => {
        const s = ref.current;
        if (s.savedScenarios.length >= 3) return false;
        replace(
          {
            ...s,
            savedScenarios: [
              ...s.savedScenarios,
              { id: uid("sc"), name: describeScenario(sc, s), scenario: sc },
            ],
          },
          false,
        );
        return true;
      },
      removeSavedScenario: (id) => {
        const s = ref.current;
        replace({ ...s, savedScenarios: s.savedScenarios.filter((x) => x.id !== id) }, false);
      },
      moveMoneyToGoal: (goalId, amount) => {
        const r = moveToGoal(ref.current, goalId, amount);
        if (r.moved > 0) replace(r.state);
        return { moved: r.moved, reached: r.reached };
      },
      update: (fn) => replace(fn(ref.current)),
      undo: () => dispatch({ type: "undo" }),
      resetMonth: () => {
        clearState();
        dispatch({ type: "hydrate", state: freshSeed() });
      },
    }),
    [replace],
  );

  const metrics = useMemo(() => computeMetrics(state), [state]);
  const value = useMemo<PaceApi>(
    () => ({ ...api, state, metrics, hydrated }),
    [api, state, metrics, hydrated],
  );
  return <PaceContext.Provider value={value}>{children}</PaceContext.Provider>;
}

export function usePace(): PaceApi {
  const ctx = useContext(PaceContext);
  if (!ctx) throw new Error("usePace must be used inside PaceProvider");
  return ctx;
}
