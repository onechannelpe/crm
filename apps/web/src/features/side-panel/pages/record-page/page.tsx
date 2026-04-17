import { createAsync, revalidate } from "@solidjs/router";
import { createEffect, onCleanup, Show } from "solid-js";
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
  emails: () => <HiddenTabContent title="Emails" />,
  calendar: () => <HiddenTabContent title="Calendar" />,
};

export function RecordPage() {
  const { leadId, activeTab, setActiveTab } = useLeadRecordPageState();

  const detailData = createAsync(async () => {
    return leadDetailQuery(leadId());
  });

  let prevSunatStatus: string | undefined;
  let pollStartedAt: number | undefined;

  createEffect(() => {
    const detail = detailData();
    if (!detail) return;

    const status = detail.sourceStatus.sunat.status;

    if (
      (prevSunatStatus === "queued" || prevSunatStatus === "running") &&
      status !== "queued" &&
      status !== "running"
    ) {
      void revalidate(leadListQuery.key);
      pollStartedAt = undefined;
    }
    prevSunatStatus = status;

    if (status !== "queued" && status !== "running") return;

    if (pollStartedAt === undefined) {
      pollStartedAt = Date.now();
    }
    if (Date.now() - pollStartedAt >= POLL_TIMEOUT_MS) {
      pollStartedAt = undefined;
      return;
    }

    const intervalId = setInterval(() => {
      void revalidate(leadDetailQuery.keyFor(leadId()));
    }, POLL_INTERVAL_MS);

    onCleanup(() => clearInterval(intervalId));
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
