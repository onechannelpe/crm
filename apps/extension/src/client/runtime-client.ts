import {
  isRuntimeResponse,
  type RuntimeMessage,
  type RuntimeResponse,
} from "@/src/domain/messages";
import type { ExecutiveStateSnapshot, ExtensionState } from "@/src/domain/model";

async function sendMessage(message: RuntimeMessage): Promise<RuntimeResponse> {
  try {
    const response = await browser.runtime.sendMessage(message);
    if (!isRuntimeResponse(response)) {
      return { ok: false, error: "received invalid runtime response" };
    }

    return response;
  } catch (error: unknown) {
    if (error instanceof Error) {
      return { ok: false, error: error.message };
    }

    return { ok: false, error: "runtime request failed" };
  }
}

export async function getState(): Promise<RuntimeResponse> {
  return sendMessage({ type: "state.get" });
}

export function startCall(): Promise<RuntimeResponse> {
  return sendMessage({ type: "call.start" });
}

export function connectCall(): Promise<RuntimeResponse> {
  return sendMessage({ type: "call.connected" });
}

export function endCall(): Promise<RuntimeResponse> {
  return sendMessage({ type: "call.end" });
}

export function startRecording(tabId: number): Promise<RuntimeResponse> {
  if (!Number.isInteger(tabId) || tabId <= 0) {
    return Promise.resolve({ ok: false, error: "tab id must be a positive integer" });
  }

  return sendMessage({ type: "recording.start", tabId });
}

export function stopRecording(): Promise<RuntimeResponse> {
  return sendMessage({ type: "recording.stop" });
}

export function flushQueue(): Promise<RuntimeResponse> {
  return sendMessage({ type: "sync.flush" });
}

export function configureSync(input: {
  apiBaseUrl: string;
  sessionToken: string;
  refreshToken: string;
}): Promise<RuntimeResponse> {
  const baseUrl = input.apiBaseUrl.trim();
  const sessionToken = input.sessionToken.trim();
  const refreshToken = input.refreshToken.trim();

  if (baseUrl === "" || sessionToken === "" || refreshToken === "") {
    return Promise.resolve({ ok: false, error: "sync config is required" });
  }

  return sendMessage({
    type: "sync.configure",
    apiBaseUrl: baseUrl,
    sessionToken,
    refreshToken,
  });
}

export function isSuccessfulResponse(
  response: RuntimeResponse,
): response is {
  ok: true;
  state: ExtensionState;
  executiveState: ExecutiveStateSnapshot;
} {
  return response.ok;
}
