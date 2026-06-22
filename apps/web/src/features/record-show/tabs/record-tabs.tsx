import { Show, createEffect } from "solid-js";
import { Dynamic } from "solid-js/web";

import type { RecordContext } from "~/features/record-show/model/record-context";
import type { RecordTabId } from "~/features/record-show/model/record-tab-id";
import { recordTabsFor } from "~/features/record-show/tabs/record-tabs-registry";
import { TabStrip } from "~/features/side-panel/components/tab-strip";

import styles from "./record-tabs.module.css";

// The single record-tab renderer. Every surface (full page, side-panel view,
// side-panel draft) mounts this and differs only by the context it provides.
// The keyed pane re-mounts on tab change so each tab fades in and owns its scroll.
export function RecordTabs(props: {
  context: RecordContext;
  activeTab: RecordTabId;
  onTabSelect: (tabId: RecordTabId) => void;
}) {
  const tabs = () => recordTabsFor(props.context);
  const activeDefinition = () =>
    tabs().find((tab) => tab.id === props.activeTab) ?? tabs()[0];

  // The persisted active tab can become invisible after a stage change (a
  // stage-gated tab like Afiliación drops out of the visible set). The strip
  // and body both render activeDefinition() so they stay consistent within a
  // single render (no transient highlight flash, no SSR/hydration mismatch).
  // This effect only persists the reconciled id back to the parent store so the
  // stored value stops pointing at a tab that is no longer shown.
  createEffect(() => {
    const resolved = activeDefinition();
    if (resolved && resolved.id !== props.activeTab) {
      props.onTabSelect(resolved.id);
    }
  });

  return (
    <>
      <TabStrip
        tabs={tabs()}
        activeTab={activeDefinition()?.id ?? props.activeTab}
        onTabSelect={props.onTabSelect}
      />
      <Show when={activeDefinition()} keyed>
        {(definition) => (
          <div class={styles.pane}>
            <Dynamic
              component={definition.component}
              context={props.context}
              onNavigate={props.onTabSelect}
            />
          </div>
        )}
      </Show>
    </>
  );
}
