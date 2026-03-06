import {
  isRuntimeResponse,
  type RuntimeMessage,
  type RuntimeResponse,
} from "@/src/domain/messages";
import type { ExtensionState } from "@/src/domain/model";

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

export async function startCall(input: {
  assignmentId: number;
  contactId: number;
  phone: string;
}): Promise<RuntimeResponse> {
  if (input.assignmentId <= 0 || input.contactId <= 0 || input.phone.trim() === "") {
    return { ok: false, error: "invalid call input" };
  }

  return sendMessage({
    type: "call.start",
    assignmentId: input.assignmentId,
    contactId: input.contactId,
    phone: input.phone,
  });
}

export function connectCall(): Promise<RuntimeResponse> {
  return sendMessage({ type: "call.connected" });
}

export function endCall(outcome: string, notes: string): Promise<RuntimeResponse> {
  if (outcome.trim() === "") {
    return Promise.resolve({ ok: false, error: "outcome is required" });
  }

  return sendMessage({ type: "call.end", outcome, notes });
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
  authToken: string;
}): Promise<RuntimeResponse> {
  const baseUrl = input.apiBaseUrl.trim();
  const token = input.authToken.trim();

  if (baseUrl === "" || token === "") {
    return Promise.resolve({ ok: false, error: "sync config is required" });
  }

  return sendMessage({
    type: "sync.configure",
    apiBaseUrl: baseUrl,
    authToken: token,
  });
}

export function isSuccessfulResponse(
  response: RuntimeResponse,
): response is { ok: true; state: ExtensionState } {
  return response.ok;
}
