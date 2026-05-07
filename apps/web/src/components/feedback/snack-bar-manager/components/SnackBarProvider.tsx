import { createSignal, type JSX } from "solid-js";
import { Portal } from "solid-js/web";

import { AnimatePresence } from "~/components/ui/animation/animate-presence";
import { Animated } from "~/components/ui/animation/animated";

import { SnackBarComponentInstanceContext } from "../contexts/SnackBarComponentInstanceContext";
import { SnackBarContext } from "../hooks/useSnackBar";
import {
  type SnackBarOptions,
  enqueueWithDedupe,
  removeSnackBarById,
  type SnackBarInternalItem,
} from "../states/snackBarInternalComponentState";
import { buildErrorAction } from "../utils/buildErrorAction";
import { SnackBar } from "./SnackBar";

import styles from "./SnackBarProvider.module.css";

const DEFAULT_DURATION_MS = 5000;
const DEFAULT_MAX_QUEUE = 3;
const MOBILE_VIEWPORT = 768;
const SNACK_BAR_ROOT_Z_INDEX = 10002;

export function SnackBarProvider(props: {
  children: JSX.Element;
  instanceId?: string;
}) {
  const isMobile =
    typeof window !== "undefined"
      ? window.matchMedia(`(max-width: ${MOBILE_VIEWPORT}px)`).matches
      : false;
  const snackBarMotionVariants = {
    out: { opacity: 0, y: isMobile ? -40 : 40 },
    in: { opacity: 1, y: 0 },
  } as const;

  const [queue, setQueue] = createSignal<SnackBarInternalItem[]>([]);
  let snackBarCounter = 0;

  const handleSnackBarClose = (id: string) => {
    setQueue((currentQueue) => removeSnackBarById(currentQueue, id));
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
      buttonLabel: options?.buttonLabel,
      buttonOnClick: options?.buttonOnClick,
      buttonTo: options?.buttonTo,
      onCancel: options?.onCancel,
      icon: options?.icon,
      progress: options?.progress,
      role: options?.role,
      duration,
    };

    setQueue((currentQueue) =>
      enqueueWithDedupe(DEFAULT_MAX_QUEUE, currentQueue, item),
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
          snackBars: queue(),
          handleSnackBarClose,
          enqueueSuccessSnackBar,
          enqueueErrorSnackBar,
          enqueueInfoSnackBar,
          enqueueWarningSnackBar,
        }}
      >
        {props.children}
        <Portal>
          <div
            class={styles.container}
            style={{ "z-index": String(SNACK_BAR_ROOT_Z_INDEX) }}
          >
            <AnimatePresence each={queue()} getKey={(snackBar) => snackBar.id}>
              {(snackBar) => (
                <Animated
                  key={snackBar.id}
                  variants={snackBarMotionVariants}
                  initial="out"
                  animate="in"
                  exit="out"
                  transition={{ duration: 0.5 }}
                >
                  <SnackBar snackBar={snackBar} onClose={handleSnackBarClose} />
                </Animated>
              )}
            </AnimatePresence>
          </div>
        </Portal>
      </SnackBarContext.Provider>
    </SnackBarComponentInstanceContext.Provider>
  );
}
