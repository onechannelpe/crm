import { createContext, useContext } from "solid-js";

import type { MotionConfigState } from "./types";

export const defaultConfig: MotionConfigState = {
  reducedMotion: "never",
  transition: undefined,
  nonce: undefined,
};

export const MotionConfigContext =
  createContext<MotionConfigState>(defaultConfig);

export function useMotionConfig(): MotionConfigState {
  return useContext(MotionConfigContext);
}
