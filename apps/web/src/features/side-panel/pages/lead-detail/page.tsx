import { createAsync, revalidate } from "@solidjs/router";
import { createEffect, createSignal, onCleanup, Show } from "solid-js";
import type { JSX } from "solid-js";
import { Dynamic } from "solid-js/web";

import {
  leadDetailQuery,
  leadListQuery,
} from "~/features/pipeline/data/queries";
import type { LeadDetailView } from "~/server/pipeline/application/queries/views/lead-detail";

import { PanelList } from "../../components/list";
import { TabStrip } from "../../components/tab-strip";
import { useSidePanelPageState } from "../../router/page-state";
import {
  HIDDEN_TAB_ITEMS,
  TAB_ITEMS,
  type ExtendedTabId,
  type TabId,
} from "./constants";
import { HomeTabContent } from "./home-tab-content";
import { TasksTabContent } from "./tasks-tab-content";
import { TimelineTabContent } from "./timeline-tab-content";

import styles from "./page.module.css";

const POLL_INTERVAL_MS = 3_500;
const POLL_TIMEOUT_MS = 60_000;

function HiddenTabContent(props: { title: string }) {
  return <div class={styles.hiddenTabContent}>{props.title}</div>;
}

const TAB_COMPONENTS: Record<
  ExtendedTabId,
  (props: { data: LeadDetailView }) => JSX.Element
> = {
  home: HomeTabContent,
  timeline: (props) => <TimelineTabContent data={props.data} />,
  tasks: (props) => <TasksTabContent data={props.data} />,
  notes: () => <HiddenTabContent title="Notes" />,
  files: () => <HiddenTabContent title="Files" />,
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
