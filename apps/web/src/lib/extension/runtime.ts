export type ExtensionExecutivePresenceStatus =
  | "idle"
  | "ready"
  | "dialing"
  | "active"
  | "wrap_up";

export type ExtensionSyncHealth =
  | "ok"
  | "pending"
  | "error"
  | "reauth_required";

export interface ExtensionExecutiveState {
  presenceStatus: ExtensionExecutivePresenceStatus;
  syncHealth: ExtensionSyncHealth;
  assignmentId: number | null;
  contactId: number | null;
  phone: string | null;
  presenceUpdatedAt: number | null;
  syncUpdatedAt: number | null;
}

interface AssignmentHandoffMessage {
  type: "assignment.handoff";
  token: string;
}

interface ExtensionRuntimeSuccess {
  ok: true;
  executiveState: ExtensionExecutiveState;
}

interface ExtensionRuntimeFailure {
  ok: false;
  error: string;
  executiveState?: ExtensionExecutiveState;
}

export type ExtensionRuntimeResponse =
  | ExtensionRuntimeSuccess
  | ExtensionRuntimeFailure;

interface ChromeRuntimeApi {
  lastError?: { message?: string };
  sendMessage: (
    extensionId: string,
    message: AssignmentHandoffMessage,
    callback: (response?: unknown) => void,
  ) => void;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isExecutiveState(value: unknown): value is ExtensionExecutiveState {
  return (
    isObject(value) &&
    typeof value.presenceStatus === "string" &&
    typeof value.syncHealth === "string" &&
    (value.assignmentId === null || typeof value.assignmentId === "number") &&
    (value.contactId === null || typeof value.contactId === "number") &&
    (value.phone === null || typeof value.phone === "string") &&
    (value.presenceUpdatedAt === null ||
      typeof value.presenceUpdatedAt === "number") &&
    (value.syncUpdatedAt === null || typeof value.syncUpdatedAt === "number")
  );
}

export function isRuntimeResponse(
  value: unknown,
): value is ExtensionRuntimeResponse {
  if (!isObject(value) || typeof value.ok !== "boolean") {
    return false;
  }

  if (value.ok) {
    return isExecutiveState(value.executiveState);
  }

  return (
    typeof value.error === "string" &&
    (value.executiveState === undefined ||
      isExecutiveState(value.executiveState))
  );
}

function isChromeRuntimeApi(value: unknown): value is ChromeRuntimeApi {
  return isObject(value) && typeof value.sendMessage === "function";
}

function getChromeRuntime(): ChromeRuntimeApi | null {
  const chromeValue = Reflect.get(globalThis, "chrome");
  if (!isObject(chromeValue)) {
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

export function isExtensionBridgeConfigured(): boolean {
  return getExtensionId() !== null;
}

function bridgeUnavailable(message: string): ExtensionRuntimeFailure {
  return { ok: false, error: message };
}

async function sendMessage(
  message: AssignmentHandoffMessage,
): Promise<ExtensionRuntimeResponse> {
  const extensionId = getExtensionId();
  if (!extensionId) {
    return bridgeUnavailable("CRM extension ID is not configured.");
  }

  const runtime = getChromeRuntime();
  if (!runtime) {
    return bridgeUnavailable(
      "CRM extension runtime is unavailable in this browser.",
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
          bridgeUnavailable("CRM extension returned an invalid response."),
        );
        return;
      }

      resolve(response);
    });
  });
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
