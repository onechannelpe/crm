import { createContext, useContext } from "solid-js";

const DEFAULT_INSTANCE_ID = "default";

export const SnackBarComponentInstanceContext =
  createContext<string>(DEFAULT_INSTANCE_ID);

export function useSnackBarComponentInstanceId(): string {
  return useContext(SnackBarComponentInstanceContext) ?? DEFAULT_INSTANCE_ID;
}
