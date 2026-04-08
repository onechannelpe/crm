import { createAsync } from "@solidjs/router";
import { createSignal, onCleanup, onMount, Show } from "solid-js";
import type { JSX } from "solid-js";
import { Dynamic } from "solid-js/web";

import { requestSaleApproval } from "~/actions/pipeline/commands/quotations";
import { queryLeadDetail } from "~/actions/pipeline/queries/leads";
import { toAppError } from "~/lib/app-errors";
import type { LeadDetailView } from "~/server/pipeline/application/queries/views/lead-detail";

import { PanelList } from "../../components/list";
import { useSidePanelPageState } from "../../router/page-state";
import type { ExtendedTabId } from "./components/constants";
import { HomeTabContent } from "./components/home-tab-content";
import { Tabs } from "./components/tabs";
import { TasksTabContent } from "./components/tasks-tab-content";
import { TimelineTabContent } from "./components/timeline-tab-content";

import styles from "./page.module.css";

function HiddenTabContent(props: { title: string }) {
  return <div class={styles.hiddenTabContent}>{props.title}</div>;
}

const TAB_COMPONENTS: Record<
  ExtendedTabId,
  (props: {
    data: LeadDetailView;
    approving?: boolean;
    onApproveForSale?: () => void;
  }) => JSX.Element
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
  const [refreshTick, setRefreshTick] = createSignal(0);
  const [error, setError] = createSignal<string | null>(null);
  const [approving, setApproving] = createSignal(false);

  const pageState = useSidePanelPageState("lead-detail");

  const data = createAsync(() => {
    refreshTick();
    return queryLeadDetail(pageState().leadId);
  });

  onMount(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const isCtrlOrMeta = event.ctrlKey || event.metaKey;

      if (!isCtrlOrMeta || event.key !== "Enter") return;
      if (!data()?.availableActions.includes("approve-for-sale")) return;

      event.preventDefault();
      void handleApproveForSale();
    };

    window.addEventListener("keydown", onKeyDown);
    onCleanup(() => window.removeEventListener("keydown", onKeyDown));
  });

  async function handleApproveForSale() {
    if (!data()?.availableActions.includes("approve-for-sale")) {
      return;
    }

    setError(null);
    setApproving(true);

    try {
      await requestSaleApproval(pageState().leadId);
      setRefreshTick((value) => value + 1);
    } catch (submitError) {
      setError(toAppError(submitError, "Error al aprobar").publicMessage);
    } finally {
      setApproving(false);
    }
  }

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
                approving={approving()}
                onApproveForSale={() => void handleApproveForSale()}
              />
            )}
          </Show>

          <Show when={error()}>
            {(message) => <p class={styles.hiddenTabContent}>{message()}</p>}
          </Show>
        </div>
      </PanelList>
    </div>
  );
}
