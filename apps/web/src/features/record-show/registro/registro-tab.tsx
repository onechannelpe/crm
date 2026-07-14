import { Show } from "solid-js";

import type { RecordContext } from "~/features/record-show/model/record-context";
import { CreateFieldsSection } from "~/features/record-show/sections/fields";
import { WidgetStack } from "~/features/widgets/widget-layout";

import styles from "~/features/record-show/tabs/home.module.css";

export function RegistroTab(props: { context: RecordContext }) {
  return (
    <Show when={props.context.kind === "draft" && props.context}>
      {(draft) => (
        <div class={styles.homeContent}>
          <WidgetStack>
            <CreateFieldsSection commercialScope={draft().commercialScope} />
          </WidgetStack>
        </div>
      )}
    </Show>
  );
}
