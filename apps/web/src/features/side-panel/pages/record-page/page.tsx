import { createAsync, revalidate } from "@solidjs/router";
import { Show } from "solid-js";
import type { JSX } from "solid-js";
import { Dynamic } from "solid-js/web";

import {
  leadDetailQuery,
  leadListQuery,
} from "~/features/pipeline/data/queries";

import { HiddenTabContent } from "../../components/hidden-tab";
import { PanelList } from "../../components/list";
import { TabStrip } from "../../components/tab-strip";
import {
  HIDDEN_TAB_ITEMS,
  TAB_ITEMS,
  type ExtendedTabId,
  type TabId,
} from "./constants";
import { createRecordPageController } from "./controller";
import { useLeadRecordPageState } from "./state";
import type { TabContentProps } from "./tabs/content-props";
import { FilesTab } from "./tabs/files";
import { HomeTab } from "./tabs/home";
import { NotesTab } from "./tabs/notes";
import { TasksTab } from "./tabs/tasks";
import { TimelineTab } from "./tabs/timeline";

import styles from "./page.module.css";

const POLL_INTERVAL_MS = 3_500;
const POLL_TIMEOUT_MS = 60_000;

const TAB_COMPONENTS: Record<
  ExtendedTabId,
  (props: TabContentProps) => JSX.Element
> = {
  home: HomeTab,
  timeline: TimelineTab,
  tasks: TasksTab,
  notes: NotesTab,
  files: () => <FilesTab />,
  emails: () => <HiddenTabContent title="Correos" />,
  calendar: () => <HiddenTabContent title="Calendario" />,
};

export function RecordPage() {
  const { leadId, activeTab, setActiveTab } = useLeadRecordPageState();

  const detailData = createAsync(async () => {
    return leadDetailQuery(leadId());
  });
  createRecordPageController({
    leadId,
    detailData,
    pollIntervalMs: POLL_INTERVAL_MS,
    pollTimeoutMs: POLL_TIMEOUT_MS,
    revalidateLeadDetail: async (currentLeadId) => {
      await revalidate(leadDetailQuery.keyFor(currentLeadId));
    },
    revalidateLeadList: async () => {
      await revalidate(leadListQuery.key);
    },
  });

  return (
    <div class={styles.pageShell}>
      <PanelList>
        <div class={styles.page}>
          <TabStrip<ExtendedTabId, TabId>
            tabs={TAB_ITEMS}
            hiddenTabs={HIDDEN_TAB_ITEMS}
            activeTab={activeTab()}
            onTabSelect={setActiveTab}
            onHiddenTabSelect={setActiveTab}
          />

          <Show
            when={detailData()}
            fallback={
              <div class={styles.hiddenTabContent}>Cargando detalle...</div>
            }
          >
            {(detail) => (
              <Dynamic
                component={TAB_COMPONENTS[activeTab()]}
                mode="view"
                data={detail()}
              />
            )}
          </Show>
        </div>
      </PanelList>
    </div>
  );
}
