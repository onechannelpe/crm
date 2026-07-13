import { Show, type JSX, type ParentProps } from "solid-js";

import styles from "./settings-section.module.css";

interface SettingsSectionProps extends ParentProps {
  title: string;
  description?: string;
  actions?: JSX.Element;
}

export function SettingsSection(props: SettingsSectionProps) {
  return (
    <section class={styles.block}>
      <div class={styles.sectionHeader}>
        <div class={styles.sectionInfo}>
          <h2 class={styles.title}>{props.title}</h2>
          <Show when={props.description}>
            {(description) => (
              <p class={styles.sectionDescription}>{description()}</p>
            )}
          </Show>
        </div>
        <div
          class={styles.sectionActions}
          data-empty={props.actions ? undefined : "true"}
        >
          {props.actions ?? null}
        </div>
      </div>
      <div class={styles.sectionContent}>{props.children}</div>
    </section>
  );
}
