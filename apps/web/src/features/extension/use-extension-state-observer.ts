import { createEffect } from "solid-js";
import type { Accessor } from "solid-js";

import type { ExecutiveStateSnapshot } from "./runtime";

interface UseExtensionStateObserverOptions {
  extensionState: Accessor<ExecutiveStateSnapshot | null>;
  extensionErrorMessage: Accessor<string | null>;
  onStateChange?: (state: ExecutiveStateSnapshot | null) => void;
  onErrorChange?: (error: string | null) => void;
  onReauthRequired?: () => void;
  onActiveAssignmentChange?: (assignmentId: number | null) => void;
  onSyncError?: () => void;
}

export function useExtensionStateObserver(
  options: UseExtensionStateObserverOptions,
): void {
  let prevState: ExecutiveStateSnapshot | null = null;
  let prevError: string | null = null;

  createEffect(() => {
    const currentState = options.extensionState?.();
    const currentError = options.extensionErrorMessage?.();

    if (currentState !== prevState) {
      options.onStateChange?.(currentState);

      if (
        currentState?.syncHealth === "reauth_required" &&
        prevState?.syncHealth !== "reauth_required"
      ) {
        options.onReauthRequired?.();
      }

      if (
        currentState?.syncHealth === "error" &&
        prevState?.syncHealth !== "error"
      ) {
        options.onSyncError?.();
      }

      if (currentState?.assignmentId !== prevState?.assignmentId) {
        options.onActiveAssignmentChange?.(currentState?.assignmentId ?? null);
      }

      prevState = currentState;
    }

    if (currentError !== prevError) {
      options.onErrorChange?.(currentError);
      prevError = currentError;
    }
  });
}
