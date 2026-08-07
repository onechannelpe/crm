import { createSignal, onCleanup } from "solid-js";
import type { Accessor } from "solid-js";

import { isPlainRecord } from "~/shared/type-guards";

import { getExtensionId, isRuntimeResponse } from "./runtime";
import type { ExecutiveStateSnapshot } from "./runtime";

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
  if (!isPlainRecord(chromeValue)) {
    return null;
  }
  const runtimeValue = Reflect.get(chromeValue, "runtime");
  if (!isChromeRuntimeConnectApi(runtimeValue)) {
    return null;
  }
  return runtimeValue;
}

export interface ExtensionPortConnection {
  state: Accessor<ExecutiveStateSnapshot | null>;
  errorMessage: Accessor<string | null>;
  isAvailable: Accessor<boolean>;
}

export function createExtensionPortConnection(): ExtensionPortConnection {
  const [state, setState] = createSignal<ExecutiveStateSnapshot | null>(null);
  const [errorMessage, setErrorMessage] = createSignal<string | null>(null);
  const [isAvailable, setIsAvailable] = createSignal(false);
  let hasReceivedState = false;

  const extensionId = getExtensionId();
  if (!extensionId) {
    return { state, errorMessage, isAvailable };
  }

  const runtime = getChromeRuntimeConnectApi();
  if (!runtime) {
    return { state, errorMessage, isAvailable };
  }

  setIsAvailable(true);
  let port: ChromePort;
  try {
    port = runtime.connect(extensionId, { name: "web" });
  } catch {
    setIsAvailable(false);
    return { state, errorMessage, isAvailable };
  }

  port.onMessage.addListener((message: unknown) => {
    if (!isRuntimeResponse(message)) {
      return;
    }
    if (message.ok) {
      hasReceivedState = true;
      setState(message.executiveState);
      setErrorMessage(null);
    } else {
      setState(message.executiveState ?? null);
      setErrorMessage(message.error);
    }
  });

  port.onDisconnect.addListener(() => {
    setState(null);
    if (!hasReceivedState) {
      setErrorMessage(null);
      return;
    }

    setErrorMessage(runtime.lastError?.message ?? "Extension disconnected.");
  });

  onCleanup(() => port.disconnect());

  return { state, errorMessage, isAvailable };
}
