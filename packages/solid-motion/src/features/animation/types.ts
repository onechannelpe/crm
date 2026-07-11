import type { Options } from "../../types";

export interface AnimateUpdatesOptions {
  controlActiveState?: Partial<Record<string, boolean>>;
  controlDelay?: number;
  directAnimate?: Options["animate"];
  directTransition?: Options["transition"];
  isExit?: boolean;
}

export type AnimateUpdates = (
  options?: AnimateUpdatesOptions,
) => Promise<any> | (() => Promise<any>);
