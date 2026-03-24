import type { JSX, ParentProps } from "solid-js";
import { Show, children } from "solid-js";

import styles from "./page-header.module.css";

interface PageHeaderProps extends ParentProps {
  leading?: JSX.Element;
  title?: JSX.Element;
  icon?: JSX.Element;
  class?: string;
}

export function PageHeader(props: PageHeaderProps) {
  const leading = children(() => props.leading);
  const title = children(() => props.title);
  const icon = children(() => props.icon);
  const actions = children(() => props.children);

  return (
    <header class={`${styles.topBar} ${props.class ?? ""}`}>
      <div class={styles.left}>
        <Show when={leading()}>{leading()}</Show>

        <div class={styles.iconAndTitle}>
          <Show when={icon()}>
            <div class={styles.icon}>{icon()}</div>
          </Show>
          <Show when={title()}>
            <div class={styles.title} data-testid="top-bar-title">
              {title()}
            </div>
          </Show>
        </div>
      </div>

      <div class={styles.actions} data-click-outside-id="page-action-container">
        {actions()}
      </div>
    </header>
  );
}
