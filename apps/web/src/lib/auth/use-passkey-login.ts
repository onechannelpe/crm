import { useAction, useNavigate } from "@solidjs/router";
import { createMemo, createSignal, onMount } from "solid-js";

import { finishPasskeyLogin } from "~/actions/auth";
import { passkeyStartMutation } from "~/lib/mutations/auth";
import { trackAuthClientEventMutation } from "~/lib/mutations/auth-analytics";

import { passkeyFinishUiMessage, passkeyStartUiMessage } from "./login-ui";
import {
  createAuthenticationResponse,
  isPasskeyAuthenticationSupported,
} from "./passkey/authentication-client";
import type { PasskeyLoginFlowState } from "./passkey/service";

export type PasskeyLoginPhase = "idle" | "starting" | "device" | "verifying";
export type PasskeySupportStatus = "unknown" | "supported" | "unsupported";

function buildPasskeyStartFormData(
  input:
    | {
        mode: "identified";
        identifier: string;
      }
    | {
        mode: "discoverable";
      },
): FormData {
  const formData = new FormData();
  formData.set("mode", input.mode);
  if (input.mode === "identified") {
    formData.set("identifier", input.identifier);
  }
  return formData;
}

export function usePasskeyLogin() {
  const navigate = useNavigate();
  const beginPasskeyLogin = useAction(passkeyStartMutation);
  const trackAuthClientEvent = useAction(trackAuthClientEventMutation);

  const [phase, setPhase] = createSignal<PasskeyLoginPhase>("idle");
  const [error, setError] = createSignal<string>();
  const [activeFlow, setActiveFlow] = createSignal<PasskeyLoginFlowState>();
  const [supportStatus, setSupportStatus] =
    createSignal<PasskeySupportStatus>("unknown");

  const supported = createMemo(() => supportStatus() === "supported");
  const supportKnown = createMemo(() => supportStatus() !== "unknown");
  const busy = createMemo(() => phase() !== "idle");

  onMount(() => {
    setSupportStatus(
      isPasskeyAuthenticationSupported() ? "supported" : "unsupported",
    );
  });

  function resetError() {
    setError(undefined);
  }

  function clear() {
    setPhase("idle");
    setError(undefined);
    setActiveFlow(undefined);
  }

  async function markUnsupported() {
    setError("Este navegador no admite claves de acceso.");
    await trackAuthClientEvent({
      kind: "passkey_result",
      outcome: "failed",
      code: "unsupported",
    });
  }

  async function runFlow(flow: PasskeyLoginFlowState): Promise<boolean> {
    setActiveFlow(flow);
    setError(undefined);

    if (!supported()) {
      await markUnsupported();
      return false;
    }

    setPhase("device");
    try {
      const response = await createAuthenticationResponse(flow.requestOptions);
      setPhase("verifying");

      const result = await finishPasskeyLogin(flow.id, response);
      if (!result.ok) {
        setError(passkeyFinishUiMessage(result.code));
        if (result.code === "flow_expired") {
          setActiveFlow(undefined);
        }
        return false;
      }

      navigate(result.redirectTo);
      return true;
    } catch (caughtError: unknown) {
      if (caughtError instanceof DOMException) {
        if (
          caughtError.name === "NotAllowedError" ||
          caughtError.name === "AbortError"
        ) {
          await trackAuthClientEvent({
            kind: "passkey_result",
            outcome: "failed",
            code: "cancelled",
          });
          setError(
            "La verificación con clave de acceso se canceló. Intenta de nuevo.",
          );
          return false;
        }
      }

      await trackAuthClientEvent({
        kind: "passkey_result",
        outcome: "failed",
        code: "browser_error",
      });
      setError("No se pudo iniciar sesión con la clave de acceso.");
      return false;
    } finally {
      setPhase("idle");
    }
  }

  async function start(identifier: string): Promise<boolean> {
    const safeIdentifier = identifier.trim();
    if (!safeIdentifier || busy()) {
      return false;
    }

    resetError();
    setPhase("starting");

    try {
      const result = await beginPasskeyLogin(
        buildPasskeyStartFormData({
          mode: "identified",
          identifier: safeIdentifier,
        }),
      );
      if (!result.ok) {
        setError(passkeyStartUiMessage(result.code));
        return false;
      }

      return await runFlow(result.flow);
    } finally {
      if (phase() === "starting") {
        setPhase("idle");
      }
    }
  }

  async function startDiscoverable(): Promise<boolean> {
    if (busy()) {
      return false;
    }

    resetError();
    setPhase("starting");

    try {
      const result = await beginPasskeyLogin(
        buildPasskeyStartFormData({ mode: "discoverable" }),
      );
      if (!result.ok) {
        setError(passkeyStartUiMessage(result.code));
        return false;
      }

      return await runFlow(result.flow);
    } finally {
      if (phase() === "starting") {
        setPhase("idle");
      }
    }
  }

  async function retry(): Promise<boolean> {
    const flow = activeFlow();
    if (!flow || busy()) {
      return false;
    }

    return await runFlow(flow);
  }

  return {
    phase,
    error,
    supportStatus,
    supportKnown,
    supported,
    busy,
    activeFlow,
    start,
    startDiscoverable,
    retry,
    runFlow,
    resetError,
    clear,
  };
}
