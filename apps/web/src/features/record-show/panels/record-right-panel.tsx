import { Show, createMemo, createSignal } from "solid-js";

import type { LeadDetailView } from "~/contracts/workflow/views";
import type { RecordTabId } from "~/features/record-show/model/record-tab-id";
import { RecordTabs } from "~/features/record-show/tabs/record-tabs";
import {
  nextActionCta,
  type NextActionTarget,
} from "~/features/record-show/workflow/next-action";
import { SidePanelFooter } from "~/features/side-panel/components/panel-footer";
import { HotkeyBoundary } from "~/features/side-panel/core/hotkeys/hotkey-boundary";
import { useSidePanel } from "~/features/side-panel/state/use-side-panel";
import { createLeadActionSidePanelPage } from "~/features/side-panel/types/side-panel-page";

import styles from "./record-right-panel.module.css";

type RecordRightPanelProps = {
  data: LeadDetailView;
};

export function RecordRightPanel(props: RecordRightPanelProps) {
  const [activeTab, setActiveTab] = createSignal<RecordTabId>("datos");
  const { openPanel } = useSidePanel();

  const cta = createMemo(() => nextActionCta(props.data));

  function runCtaTarget(target: NextActionTarget) {
    if (target.kind === "tab") {
      setActiveTab(target.tabId);
      return;
    }

    openPanel(
      createLeadActionSidePanelPage({
        leadId: props.data.lead.id,
        action: target.action,
        title: props.data.lead.legalName ?? props.data.lead.ruc,
        subtitle: cta()?.label ?? "",
      }),
    );
  }

  return (
    <HotkeyBoundary class={styles.panel}>
      <div class={styles.scroll}>
        <RecordTabs
          context={{ kind: "lead", data: props.data }}
          activeTab={activeTab()}
          onTabSelect={setActiveTab}
        />
      </div>
      <Show when={cta()}>
        {(current) => (
          <SidePanelFooter
            primary={{
              label: current().label,
              shortcut: "⏎",
              onClick: () => runCtaTarget(current().target),
            }}
          />
        )}
      </Show>
    </HotkeyBoundary>
  );
}
