import { useContext } from "solid-js";

import { SnackBarContext } from "./snack-bar-provider";
import type { SnackBarCallOptions, SnackBarPatch } from "./types";

export function useSnackBar() {
  const ctx = useContext(SnackBarContext);
  if (!ctx) {
    throw new Error("useSnackBar must be used within SnackBarProvider");
  }

  return {
    enqueueSuccessSnackBar: (message: string, options?: SnackBarCallOptions) =>
      ctx.enqueue({ variant: "success", message, ...options }),

    enqueueInfoSnackBar: (message: string, options?: SnackBarCallOptions) =>
      ctx.enqueue({ variant: "info", message, ...options }),

    enqueueWarningSnackBar: (message: string, options?: SnackBarCallOptions) =>
      ctx.enqueue({ variant: "warning", message, ...options }),

    enqueueErrorSnackBar: (message: string, options?: SnackBarCallOptions) =>
      ctx.enqueue({ variant: "error", message, ...options }),

    updateSnackBar: (id: string, patch: SnackBarPatch) => ctx.update(id, patch),

    dismissSnackBar: (id: string) => ctx.dismiss(id),
  };
}
