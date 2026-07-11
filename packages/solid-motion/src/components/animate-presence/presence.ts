import { createContext, useContext } from "solid-js";

import type { MotionState } from "../../state";

export interface PresenceContext {
  initial?: boolean;
  custom?: any;
  presenceId?: string;
  onMotionExitComplete?: (container: HTMLElement, state: MotionState) => void;
}

export const AnimatePresenceContext = createContext<PresenceContext>({});
export const usePresenceContext = () => useContext(AnimatePresenceContext);
