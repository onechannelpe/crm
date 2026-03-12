import { Show } from "solid-js";
import type { Accessor } from "solid-js";

import type { ExtensionExecutiveState } from "~/lib/extension/runtime";

import styles from "./extension-status-indicator.module.css";

interface ExtensionStatusIndicatorProps {
  extensionState: Accessor<ExtensionExecutiveState | null>;
  extensionError: Accessor<string | null>;
  onOpen: () => void;
}

export function ExtensionStatusIndicator(props: ExtensionStatusIndicatorProps) {
  const getStatusColor = () => {
    const error = props.extensionError();
    if (error) return "error";

    const state = props.extensionState();
    if (!state) return "offline";

    if (state.syncHealth === "reauth_required") return "warning";
    if (state.syncHealth === "error") return "error";
    if (state.syncHealth === "pending") return "pending";

    return "ok";
  };

  const getStatusLabel = () => {
    const status = getStatusColor();
    switch (status) {
      case "error":
        return "Error";
      case "offline":
        return "Desconectado";
      case "warning":
        return "Requiere acción";
      case "pending":
        return "Sincronizando...";
      default:
        return "Conectado";
    }
  };

  return (
    <button
      class={styles.trigger}
      onClick={props.onOpen}
      aria-label={`Extension status: ${getStatusLabel()}`}
      title={getStatusLabel()}
    >
      <span class={`${styles.dot} ${styles[getStatusColor()]}`} />
      <Show when={props.extensionState()?.assignmentId}>
        <span class={styles.badge}>{props.extensionState()?.assignmentId}</span>
      </Show>
    </button>
  );
}
