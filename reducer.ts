import type { MonthState, PaceState } from "@/engine";

export type PaceAction =
  | { type: "hydrate"; state: PaceState }
  | { type: "replace"; next: PaceState; undoable: boolean }
  | { type: "undo" };

const UNDO_LIMIT = 15;

function snapshot(s: PaceState): MonthState {
  const { savedScenarios, undoStack, started, version, ...month } = s;
  return month;
}

export function paceReducer(state: PaceState, action: PaceAction): PaceState {
  switch (action.type) {
    case "hydrate":
      return action.state;
    case "replace":
      if (!action.undoable) return action.next;
      return {
        ...action.next,
        undoStack: [snapshot(state), ...state.undoStack].slice(0, UNDO_LIMIT),
      };
    case "undo": {
      const [prev, ...rest] = state.undoStack;
      if (!prev) return state;
      return { ...state, ...prev, undoStack: rest };
    }
  }
}
