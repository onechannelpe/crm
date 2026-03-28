import { createSignal, onCleanup } from "solid-js";
import type { Accessor } from "solid-js";

import { isPlainRecord } from "~/lib/type-guards";

import { getExtensionId, isRuntimeResponse } from "./runtime";
import type { ExtensionExecutiveState } from "./runtime";

interface ChromePort {
  onMessage: { addListener(callback: (message: unknown) => void): void };
  onDisconnect: { addListener(callback: () => void): void };
  disconnect(): void;
}

interface ChromeRuntimeConnectApi {
  lastError?: { message?: string };
  connect(extensionId: string, connectInfo?: { name?: string }): ChromePort;
}

function isChromeRuntimeConnectApi(
  value: unknown,
): value is ChromeRuntimeConnectApi {
  return isPlainRecord(value) && typeof value.connect === "function";
}

function getChromeRuntimeConnectApi(): ChromeRuntimeConnectApi | null {
  const chromeValue = Reflect.get(globalThis, "chrome");
  if (!isPlainRecord(chromeValue)) return null;
  const runtimeValue = Reflect.get(chromeValue, "runtime");
  if (!isChromeRuntimeConnectApi(runtimeValue)) return null;
  return runtimeValue;
}

export interface ExtensionPortConnection {
  state: Accessor<ExtensionExecutiveState | null>;
  error: Accessor<string | null>;
}

export function createExtensionPortConnection(): ExtensionPortConnection {
  const [state, setState] = createSignal<ExtensionExecutiveState | null>(null);
  const [error, setError] = createSignal<string | null>(null);

  const extensionId = getExtensionId();
  if (!extensionId) {
    setError("Configura VITE_CRM_EXTENSION_ID para conectar la extensión.");
    return { state, error };
  }

  const runtime = getChromeRuntimeConnectApi();
  if (!runtime) {
    setError("CRM extension runtime is unavailable in this browser.");
    return { state, error };
  }

  const port = runtime.connect(extensionId, { name: "web" });

  port.onMessage.addListener((message: unknown) => {
    if (!isRuntimeResponse(message)) return;
    if (message.ok) {
      setState(message.executiveState);
      setError(null);
    } else {
      setState(message.executiveState ?? null);
      setError(message.error);
    }
  });

  port.onDisconnect.addListener(() => {
    setState(null);
    setError(runtime.lastError?.message ?? "Extension disconnected.");
  });

  onCleanup(() => port.disconnect());

  return { state, error };
}
