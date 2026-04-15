import { createAsync, revalidate } from "@solidjs/router";
import { createEffect, createSignal, onCleanup, Show } from "solid-js";
import type { JSX } from "solid-js";
import { Dynamic } from "solid-js/web";

import {
  leadDetailQuery,
  leadListQuery,
} from "~/features/pipeline/data/queries";
import type { LeadDetailView } from "~/server/pipeline/application/queries/views/lead-detail";

import { HiddenTabContent } from "../../components/hidden-tab";
import { PanelList } from "../../components/list";
import { TabStrip } from "../../components/tab-strip";
import { useSidePanelPageState } from "../../router/page-state";
import {
  HIDDEN_TAB_ITEMS,
  TAB_ITEMS,
  type ExtendedTabId,
  type TabId,
} from "./constants";
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
  (props: { data: LeadDetailView }) => JSX.Element
> = {
  home: HomeTab,
  timeline: (props) => <TimelineTab data={props.data} />,
  tasks: (props) => <TasksTab data={props.data} />,
  notes: (props) => <NotesTab data={props.data} />,
  files: () => <FilesTab />,
  emails: () => <HiddenTabContent title="Emails" />,
  calendar: () => <HiddenTabContent title="Calendar" />,
};

export function LeadDetailPage() {
  const [activeTab, setActiveTab] = createSignal<ExtendedTabId>("home");
  const pageState = useSidePanelPageState("lead-detail");

  const data = createAsync(() => leadDetailQuery(pageState().leadId));

  // Poll detail while SUNAT enrichment is active, revalidate list when it completes.
  let prevSunatStatus: string | undefined;
  let pollStartedAt: number | undefined;
  createEffect(() => {
    const detail = data();
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

    const leadId = pageState().leadId;
    const id = setInterval(() => {
      void revalidate(leadDetailQuery.keyFor(leadId));
    }, POLL_INTERVAL_MS);

    onCleanup(() => clearInterval(id));
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
            when={data()}
            fallback={
              <div class={styles.hiddenTabContent}>Cargando detalle...</div>
            }
          >
            {(detail) => (
              <Dynamic
                component={TAB_COMPONENTS[activeTab()]}
                data={detail()}
              />
            )}
          </Show>
        </div>
      </PanelList>
    </div>
  );
}
