import { type ParentProps, Suspense } from "solid-js";

import { Loading } from "~/components/feedback/loading/screen";

import { Host } from "./host";

import styles from "./main-container-with-side-panel.module.css";

export function MainContainerWithSidePanel(props: ParentProps) {
  return (
    <div class={styles.panel}>
      <div class={styles.panelMain}>
        <Suspense fallback={<Loading />}>{props.children}</Suspense>
      </div>
      <Host />
    </div>
  );
}
