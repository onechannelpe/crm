import type { ParentProps } from "solid-js";

import { ScrollWrapper } from "~/components/ui/utilities/scroll-wrapper";

import styles from "./settings-page-container.module.css";

export function SettingsPageContainer(props: ParentProps) {
  return (
    <ScrollWrapper>
      <div class={styles.container}>{props.children}</div>
    </ScrollWrapper>
  );
}
