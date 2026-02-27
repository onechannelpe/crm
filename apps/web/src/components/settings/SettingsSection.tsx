import { type JSX, type ParentProps } from "solid-js";

import styles from "../../routes/(app)/settings/settings-page.module.css";

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
          {props.description && (
            <p class={styles.sectionDescription}>{props.description}</p>
          )}
        </div>
        {props.actions && (
          <div class={styles.sectionActions}>{props.actions}</div>
        )}
      </div>
      <div class={styles.sectionContent}>{props.children}</div>
    </section>
  );
}
