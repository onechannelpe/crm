import type { JSX } from "solid-js";
import { Match, Switch } from "solid-js";

import { WidgetShell } from "./widget-shell";

import styles from "./widget-renderer.module.css";

// Wraps a widget's content with its status states so every surface renders
// loading/empty/error/forbidden the same way. `ready` (the default) shows the
// children.
export type WidgetStatus =
  | "ready"
  | "loading"
  | "empty"
  | "error"
  | "forbidden";

export function WidgetRenderer(props: {
  title: string;
  subtitle?: string;
  action?: JSX.Element;
  status?: WidgetStatus;
  emptyLabel?: string;
  children: JSX.Element;
}) {
  const status = () => props.status ?? "ready";

  return (
    <WidgetShell
      title={props.title}
      subtitle={props.subtitle}
      action={props.action}
    >
      <Switch fallback={props.children}>
        <Match when={status() === "loading"}>
          <p class={styles.state}>Cargando…</p>
        </Match>
        <Match when={status() === "empty"}>
          <p class={styles.state}>{props.emptyLabel ?? "Aún no hay datos."}</p>
        </Match>
        <Match when={status() === "error"}>
          <p class={styles.stateError}>No se pudo cargar el widget.</p>
        </Match>
        <Match when={status() === "forbidden"}>
          <p class={styles.state}>Sin acceso a este widget.</p>
        </Match>
      </Switch>
    </WidgetShell>
  );
}
