import { createContext, useContext } from "solid-js";

import type {
  SnackBarInternalItem,
  SnackBarOptions,
  SnackBarVariant,
} from "../states/snackBarInternalComponentState";

export interface SnackBarApi {
  snackBars: SnackBarInternalItem[];
  enqueueSnackBar: (
    variant: SnackBarVariant,
    options: SnackBarOptions,
  ) => string;
  enqueueSuccessSnackBar: (options: SnackBarOptions) => string;
  enqueueErrorSnackBar: (options: SnackBarOptions) => string;
  enqueueInfoSnackBar: (options: SnackBarOptions) => string;
  enqueueWarningSnackBar: (options: SnackBarOptions) => string;
  dismissSnackBar: (id: string) => void;
  updateSnackBar: (
    id: string,
    patch: Partial<SnackBarOptions> & {
      variant?: SnackBarVariant;
      remaining?: number;
    },
  ) => void;
  pauseSnackBar: (id: string) => void;
  resumeSnackBar: (id: string) => void;
}

export const SnackBarContext = createContext<SnackBarApi>();

export function useSnackBar(): SnackBarApi {
  const context = useContext(SnackBarContext);
  if (!context) {
    throw new Error("useSnackBar must be used within SnackBarProvider");
  }
  return context;
}
