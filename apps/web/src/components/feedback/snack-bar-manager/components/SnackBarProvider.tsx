import { type JSX } from "solid-js";
import { createStore } from "solid-js/store";
import { Portal } from "solid-js/web";

import { AnimatePresence } from "~/components/ui/animation/animate-presence";
import { DS_Z_INDEX } from "~/components/ui/theme/design-system";

import { SnackBarComponentInstanceContext } from "../contexts/SnackBarComponentInstanceContext";
import { SnackBarContext } from "../hooks/useSnackBar";
import {
  type SnackBarOptions,
  enqueueWithDedupe,
  removeSnackBarById,
  type SnackBarInternalState,
} from "../states/snackBarInternalComponentState";
import { buildErrorAction } from "../utils/buildErrorAction";
import { SnackBar } from "./SnackBar";

import styles from "./SnackBarProvider.module.css";

const DEFAULT_DURATION_MS = 5000;
const DEFAULT_MAX_QUEUE = 3;

export function SnackBarProvider(props: {
  children: JSX.Element;
  instanceId?: string;
}) {
  const [state, setState] = createStore<SnackBarInternalState>({
    maxQueue: DEFAULT_MAX_QUEUE,
    queue: [],
  });
  let snackBarCounter = 0;

  const handleSnackBarClose = (id: string) => {
    setState("queue", (queue) => removeSnackBarById(queue, id));
  };

  const enqueueSnackBar = (
    message: string,
    variant: SnackBarOptions["variant"],
    options?: Omit<SnackBarOptions, "id" | "message" | "variant">,
  ): string => {
    snackBarCounter += 1;
    const duration = options?.duration ?? DEFAULT_DURATION_MS;
    const id = `snack-bar-${Date.now()}-${snackBarCounter}`;

    const item = {
      id,
      variant,
      message,
      detailedMessage: options?.detailedMessage,
      dedupeKey: options?.dedupeKey,
      actionText: options?.actionText,
      actionOnClick: options?.actionOnClick,
      actionTo: options?.actionTo,
      onCancel: options?.onCancel,
      icon: options?.icon,
      progress: options?.progress,
      role: options?.role,
      duration,
    };

    setState("queue", (queue) =>
      enqueueWithDedupe(state.maxQueue, queue, item),
    );
    return id;
  };

  const enqueueSuccessSnackBar = ({
    message,
    options,
  }: {
    message: string;
    options?: Omit<SnackBarOptions, "id" | "message" | "variant">;
  }): string => enqueueSnackBar(message, "success", options);

  const enqueueErrorSnackBar = ({
    apolloError,
    message,
    options,
  }: {
    apolloError?: unknown;
    message?: string;
    options?: Omit<SnackBarOptions, "id" | "message" | "variant">;
  }): string => {
    if (
      typeof apolloError === "object" &&
      apolloError !== null &&
      "name" in apolloError &&
      (apolloError as { name?: string }).name === "AbortError"
    ) {
      return "";
    }
    const errorAction = buildErrorAction({ apolloError });
    return enqueueSnackBar(
      message ?? "An error occurred.",
      "error",
      errorAction ? { ...options, ...errorAction } : options,
    );
  };

  const enqueueInfoSnackBar = ({
    message,
    options,
  }: {
    message: string;
    options?: Omit<SnackBarOptions, "id" | "message" | "variant">;
  }): string => enqueueSnackBar(message, "info", options);

  const enqueueWarningSnackBar = ({
    message,
    options,
  }: {
    message: string;
    options?: Omit<SnackBarOptions, "id" | "message" | "variant">;
  }): string => enqueueSnackBar(message, "warning", options);

  return (
    <SnackBarComponentInstanceContext.Provider
      value={props.instanceId ?? "default"}
    >
      <SnackBarContext.Provider
        value={{
          snackBars: state.queue,
          handleSnackBarClose,
          enqueueSuccessSnackBar,
          enqueueErrorSnackBar,
          enqueueInfoSnackBar,
          enqueueWarningSnackBar,
        }}
      >
        {props.children}
        <Portal>
          <div class={styles.container} style={{ "z-index": DS_Z_INDEX.toast }}>
            <AnimatePresence>
              {state.queue.map((snackBar) => (
                <SnackBar snackBar={snackBar} onClose={handleSnackBarClose} />
              ))}
            </AnimatePresence>
          </div>
        </Portal>
      </SnackBarContext.Provider>
    </SnackBarComponentInstanceContext.Provider>
  );
}
