import type { NodeGroup } from "motion-dom";
import { type Accessor, createContext, useContext } from "solid-js";

import type { MotionState } from "../state/motion-state";

export const MotionContext = createContext<MotionState | undefined>(undefined);
export const useParentMotionState = () => useContext(MotionContext);

export interface LayoutGroupState {
  id?: string;
  group?: NodeGroup;
  forceRender?: VoidFunction;
  key?: Accessor<number>;
}

export const LayoutGroupContext = createContext<LayoutGroupState>({});
export const useLayoutGroupContext = () => useContext(LayoutGroupContext);
