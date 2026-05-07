import { createContext, useContext } from "solid-js";

import type {
  SnackBarInternalItem,
  SnackBarOptions,
} from "../states/snackBarInternalComponentState";

export interface SnackBarApi {
  snackBars: SnackBarInternalItem[];
  handleSnackBarClose: (id: string) => void;
  enqueueSuccessSnackBar: (args: {
    message: string;
    options?: Omit<SnackBarOptions, "id" | "message" | "variant">;
  }) => string;
  enqueueErrorSnackBar: (args: {
    apolloError?: unknown;
    message?: string;
    options?: Omit<SnackBarOptions, "id" | "message" | "variant">;
  }) => string;
  enqueueInfoSnackBar: (args: {
    message: string;
    options?: Omit<SnackBarOptions, "id" | "message" | "variant">;
  }) => string;
  enqueueWarningSnackBar: (args: {
    message: string;
    options?: Omit<SnackBarOptions, "id" | "message" | "variant">;
  }) => string;
}

export const SnackBarContext = createContext<SnackBarApi>();

export function useSnackBar(): SnackBarApi {
  const context = useContext(SnackBarContext);
  if (!context) {
    throw new Error("useSnackBar must be used within SnackBarProvider");
  }
  return context;
}
