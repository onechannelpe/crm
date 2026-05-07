import { For, onCleanup, onMount, type JSX } from "solid-js";
import { createStore } from "solid-js/store";
import { Portal } from "solid-js/web";

import { DS_Z_INDEX } from "~/components/ui/theme/design-system";

import { SnackBarComponentInstanceContext } from "../contexts/SnackBarComponentInstanceContext";
import { SnackBarContext } from "../hooks/useSnackBar";
import {
  enqueueWithDedupe,
  removeSnackBarById,
  setSnackBarPaused,
  tickSnackBarTimers,
  type SnackBarInternalItem,
  type SnackBarInternalState,
  type SnackBarOptions,
  type SnackBarVariant,
} from "../states/snackBarInternalComponentState";
import { SnackBar } from "./SnackBar";

import styles from "./SnackBarProvider.module.css";

const DEFAULT_DURATION_MS = 5000;
const TICK_MS = 100;

export function SnackBarProvider(props: { children: JSX.Element }) {
  const [state, setState] = createStore<SnackBarInternalState>({ queue: [] });
  let snackBarCounter = 0;

  const enqueueSnackBar = (
    variant: SnackBarVariant,
    options: SnackBarOptions,
  ): string => {
    snackBarCounter += 1;
    const duration = options.duration ?? DEFAULT_DURATION_MS;
    const id = `snack-bar-${Date.now()}-${snackBarCounter}`;

    const item: SnackBarInternalItem = {
      id,
      variant,
      message: options.message,
      details: options.details,
      dedupeKey: options.dedupeKey,
      action: options.action,
      duration,
      remaining: duration,
      paused: false,
      createdAt: Date.now(),
    };

    setState("queue", (queue) => enqueueWithDedupe(queue, item));
    return id;
  };

  const enqueueSuccessSnackBar = (options: SnackBarOptions): string =>
    enqueueSnackBar("success", options);

  const enqueueErrorSnackBar = (options: SnackBarOptions): string =>
    enqueueSnackBar("error", options);

  const enqueueInfoSnackBar = (options: SnackBarOptions): string =>
    enqueueSnackBar("info", options);

  const enqueueWarningSnackBar = (options: SnackBarOptions): string =>
    enqueueSnackBar("warning", options);

  const dismissSnackBar = (id: string) => {
    setState("queue", (queue) => removeSnackBarById(queue, id));
  };

  const updateSnackBar = (
    id: string,
    patch: Partial<SnackBarOptions> & {
      variant?: SnackBarVariant;
      remaining?: number;
    },
  ) => {
    setState(
      "queue",
      (item) => item.id === id,
      (item) => {
        const duration = patch.duration ?? item.duration;
        const remaining =
          patch.duration !== undefined ? duration : item.remaining;
        return {
          ...item,
          variant: patch.variant ?? item.variant,
          ...patch,
          duration,
          remaining,
        };
      },
    );
  };

  const pauseSnackBar = (id: string) => {
    setState("queue", (queue) => setSnackBarPaused(queue, id, true));
  };

  const resumeSnackBar = (id: string) => {
    setState("queue", (queue) => setSnackBarPaused(queue, id, false));
  };

  onMount(() => {
    const interval = setInterval(() => {
      setState("queue", (queue) => tickSnackBarTimers(queue, TICK_MS));
    }, TICK_MS);

    onCleanup(() => clearInterval(interval));
  });

  return (
    <SnackBarComponentInstanceContext.Provider value="default">
      <SnackBarContext.Provider
        value={{
          snackBars: state.queue,
          enqueueSnackBar,
          enqueueSuccessSnackBar,
          enqueueErrorSnackBar,
          enqueueInfoSnackBar,
          enqueueWarningSnackBar,
          dismissSnackBar,
          updateSnackBar,
          pauseSnackBar,
          resumeSnackBar,
        }}
      >
        {props.children}
        <Portal>
          <div class={styles.container} style={{ "z-index": DS_Z_INDEX.toast }}>
            <For each={state.queue}>
              {(snackBar) => (
                <SnackBar
                  snackBar={snackBar}
                  onDismiss={dismissSnackBar}
                  onPause={pauseSnackBar}
                  onResume={resumeSnackBar}
                />
              )}
            </For>
          </div>
        </Portal>
      </SnackBarContext.Provider>
    </SnackBarComponentInstanceContext.Provider>
  );
}
