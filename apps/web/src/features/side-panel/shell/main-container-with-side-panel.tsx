import { type JSX, type ParentProps, Suspense } from "solid-js";

import { Loading } from "~/components/feedback/loading/screen";
import { PageCardLayout } from "~/components/ui/layout/page-card/page-card-layout";

import { Host } from "./host";

import styles from "./main-container-with-side-panel.module.css";

export function MainContainerWithSidePanel(
  props: ParentProps<{ header?: JSX.Element }>,
) {
  return (
    <div class={styles.panel}>
      <div class={styles.panelMain}>
        <PageCardLayout header={props.header}>
          <Suspense fallback={<Loading />}>{props.children}</Suspense>
        </PageCardLayout>
      </div>
      <Host />
    </div>
  );
}
