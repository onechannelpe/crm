import { extensionService } from "~/server/shared/context";

export function getExtensionApiRuntime() {
  return { extensionService };
}
