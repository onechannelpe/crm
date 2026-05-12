import { createEffect } from "solid-js";
import type { Accessor } from "solid-js";

import type { ExecutiveStateSnapshot } from "./runtime";

interface UseExtensionStateObserverOptions {
  extensionState: Accessor<ExecutiveStateSnapshot | null>;
  extensionError: Accessor<string | null>;
  onStateChange?: (state: ExecutiveStateSnapshot | null) => void;
  onErrorChange?: (error: string | null) => void;
  onReauthRequired?: () => void;
  onActiveAssignmentChange?: (assignmentId: number | null) => void;
  onSyncError?: () => void;
}

export function useExtensionStateObserver(
  options: UseExtensionStateObserverOptions,
): void {
  // Track previous state to detect changes
  let prevState: ExecutiveStateSnapshot | null = null;
  let prevError: string | null = null;

  createEffect(() => {
    const currentState = options.extensionState?.();
    const currentError = options.extensionError?.();

    // Notify on state change
    if (currentState !== prevState) {
      options.onStateChange?.(currentState);

      // Check if reauth is required
      if (
        currentState?.syncHealth === "reauth_required" &&
        prevState?.syncHealth !== "reauth_required"
      ) {
        options.onReauthRequired?.();
      }

      // Check if sync health went to error
      if (
        currentState?.syncHealth === "error" &&
        prevState?.syncHealth !== "error"
      ) {
        options.onSyncError?.();
      }

      // Check if active assignment changed
      if (currentState?.assignmentId !== prevState?.assignmentId) {
        options.onActiveAssignmentChange?.(currentState?.assignmentId ?? null);
      }

      prevState = currentState;
    }

    // Notify on error change
    if (currentError !== prevError) {
      options.onErrorChange?.(currentError);
      prevError = currentError;
    }
  });
}
