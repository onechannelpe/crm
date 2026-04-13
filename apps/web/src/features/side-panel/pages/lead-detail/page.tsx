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
import { useSidePanelPageState } from "../../router/page-state";
import type { ExtendedTabId } from "./components/constants";
import { HomeTabContent } from "./components/home-tab-content";
import { Tabs } from "./components/tabs";
import { TasksTabContent } from "./components/tasks-tab-content";
import { TimelineTabContent } from "./components/timeline-tab-content";

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

const hiddenTabsCount = 4;

export function LeadDetailPage() {
  const [activeTab, setActiveTab] = createSignal<ExtendedTabId>("home");
  const pageState = useSidePanelPageState("lead-detail");

  const data = createAsync(() => leadDetailQuery(pageState().leadId));

  // Poll detail while SUNAT enrichment is active, revalidate list when it completes.
  let prevSunatStatus: string | undefined;
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
    }
    prevSunatStatus = status;

    if (status !== "queued" && status !== "running") return;

    const leadId = pageState().leadId;
    let elapsed = 0;

    const id = setInterval(() => {
      elapsed += POLL_INTERVAL_MS;
      if (elapsed >= POLL_TIMEOUT_MS) {
        clearInterval(id);
        return;
      }
      void revalidate(leadDetailQuery.keyFor(leadId));
    }, POLL_INTERVAL_MS);

    onCleanup(() => clearInterval(id));
  });

  return (
    <div class={styles.pageShell}>
      <PanelList>
        <div class={styles.page}>
          <Tabs
            activeTab={activeTab()}
            hiddenTabsCount={hiddenTabsCount}
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
