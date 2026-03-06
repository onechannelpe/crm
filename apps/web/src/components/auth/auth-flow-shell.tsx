import { For, Show, type JSX } from "solid-js";

import Building2 from "~/components/icons/building-2";

import styles from "./auth-flow-shell.module.css";

export interface AuthFlowProgressItem {
  label: string;
  description: string;
  state: "upcoming" | "current" | "complete";
}

interface AuthFlowShellProps {
  eyebrow?: string;
  title: string;
  description: string;
  railNote?: string;
  progress?: AuthFlowProgressItem[];
  contentEyebrow?: string;
  contentTitle?: string;
  contentDescription?: string;
  footer?: JSX.Element;
  footerNote?: JSX.Element;
  children: JSX.Element;
}

export function AuthFlowShell(props: AuthFlowShellProps) {
  return (
    <div class={styles.shell}>
      <section class={styles.surface}>
        <div class={styles.content}>
          <header class={styles.header}>
            <div class={styles.logo}>
              <Building2 size={28} />
            </div>
            <Show when={props.eyebrow}>
              {(eyebrow) => <p class={styles.eyebrow}>{eyebrow()}</p>}
            </Show>
            <h1 class={styles.title}>{props.title}</h1>
            <p class={styles.description}>{props.description}</p>
          </header>

          <Show when={(props.progress?.length ?? 0) > 0}>
            <div class={styles.progress}>
              <For each={props.progress ?? []}>
                {(item, index) => (
                  <div class={styles.progressItem}>
                    <div
                      classList={{
                        [styles.progressMarker]: true,
                        [styles.progressCurrent]: item.state === "current",
                        [styles.progressComplete]: item.state === "complete",
                      }}
                    >
                      {item.state === "complete" ? "✓" : index() + 1}
                    </div>
                    <div class={styles.progressCopy}>
                      <p class={styles.progressLabel}>{item.label}</p>
                      <p class={styles.progressDescription}>
                        {item.description}
                      </p>
                    </div>
                  </div>
                )}
              </For>
            </div>
          </Show>

          <Show when={props.railNote}>
            {(railNote) => <p class={styles.railNote}>{railNote()}</p>}
          </Show>

          <Show
            when={
              props.contentEyebrow ||
              props.contentTitle ||
              props.contentDescription
            }
          >
            <header class={styles.contentHeader}>
              <Show when={props.contentEyebrow}>
                {(value) => <p class={styles.contentEyebrow}>{value()}</p>}
              </Show>
              <Show when={props.contentTitle}>
                {(value) => <h2 class={styles.contentTitle}>{value()}</h2>}
              </Show>
              <Show when={props.contentDescription}>
                {(value) => <p class={styles.contentDescription}>{value()}</p>}
              </Show>
            </header>
          </Show>

          <div class={styles.body}>{props.children}</div>

          <Show when={props.footer}>
            <footer class={styles.footer}>{props.footer}</footer>
          </Show>

          <Show when={props.footerNote}>
            <div class={styles.footerNote}>{props.footerNote}</div>
          </Show>
        </div>
      </section>
    </div>
  );
}
