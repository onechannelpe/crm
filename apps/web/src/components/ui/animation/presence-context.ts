import { createContext } from "solid-js";

export interface PresenceContextValue {
  id: string;
  isPresent: () => boolean;
  initial?: false | string | string[];
  custom?: any;
  onExitComplete?: (childId: string) => void;
  register: (childId: string) => () => void;
}

export const PresenceContext = createContext<PresenceContextValue | null>(null);
