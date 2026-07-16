import type {
  BridgeResponse,
  ExecutivePresenceStatus,
  ExecutiveStateSnapshot,
  SyncHealth,
} from "@crm/contracts/extension";
import { isBridgeResponse } from "@crm/contracts/extension";

import { isPlainRecord } from "~/lib/type-guards";

export type { ExecutivePresenceStatus, ExecutiveStateSnapshot, SyncHealth };

interface AssignmentHandoffMessage {
  type: "assignment.handoff";
  token: string;
}

export type ExtensionRuntimeResponse = BridgeResponse;

interface ChromeRuntimeApi {
  lastError?: { message?: string };
  sendMessage: (
    extensionId: string,
    message: AssignmentHandoffMessage,
    callback: (response?: unknown) => void,
  ) => void;
}

export function isRuntimeResponse(
  value: unknown,
): value is ExtensionRuntimeResponse {
  return isBridgeResponse(value);
}

function isChromeRuntimeApi(value: unknown): value is ChromeRuntimeApi {
  return isPlainRecord(value) && typeof value.sendMessage === "function";
}

function getChromeRuntime(): ChromeRuntimeApi | null {
  const chromeValue = Reflect.get(globalThis, "chrome");
  if (!isPlainRecord(chromeValue)) {
    return null;
  }

  const runtimeValue = Reflect.get(chromeValue, "runtime");
  if (!isChromeRuntimeApi(runtimeValue)) {
    return null;
  }

  return runtimeValue;
}

export function getExtensionId(): string | null {
  const value = import.meta.env.VITE_CRM_EXTENSION_ID;
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

function bridgeUnavailable(message: string): ExtensionRuntimeResponse {
  return { ok: false, error: message };
}

async function sendMessage(
  message: AssignmentHandoffMessage,
): Promise<ExtensionRuntimeResponse> {
  const extensionId = getExtensionId();
  if (!extensionId) {
    return bridgeUnavailable("La extensión no está configurada.");
  }

  const runtime = getChromeRuntime();
  if (!runtime) {
    return bridgeUnavailable(
      "La extensión no está disponible en este navegador.",
    );
  }

  return new Promise((resolve) => {
    runtime.sendMessage(extensionId, message, (response?: unknown) => {
      const runtimeError = runtime.lastError?.message;
      if (runtimeError) {
        resolve(bridgeUnavailable(runtimeError));
        return;
      }

      if (!isRuntimeResponse(response)) {
        resolve(
          bridgeUnavailable("La extensión devolvió una respuesta no válida."),
        );
        return;
      }

      resolve(response);
    });
  });
}

export function focusExtensionWindow(): void {
  const chrome = Reflect.get(globalThis, "chrome");
  if (typeof chrome !== "object" || chrome === null) return;
  const runtime = Reflect.get(chrome, "runtime");
  if (typeof runtime !== "object" || runtime === null) return;
  const send: unknown = Reflect.get(runtime, "sendMessage");
  if (typeof send === "function") send.call(runtime, { action: "focusWindow" });
}

export async function handoffLeadToExtension(input: {
  token: string;
}): Promise<ExtensionRuntimeResponse> {
  const token = input.token.trim();
  if (token === "") {
    return bridgeUnavailable("Missing extension handoff token.");
  }

  return sendMessage({
    type: "assignment.handoff",
    token,
  });
}
