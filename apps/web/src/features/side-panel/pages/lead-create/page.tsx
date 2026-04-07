import { createSignal, onCleanup, onMount } from "solid-js";
import type { JSX } from "solid-js";
import { Dynamic } from "solid-js/web";

import { requestLeadCreation } from "~/actions/pipeline/commands/leads";
import { toAppError } from "~/lib/app-errors";

import { PanelList } from "../../components/list";
import { useSidePanel } from "../../state/use-side-panel";
import { createLeadDetailSidePanelPage } from "../../types/side-panel-page";
import type { ExtendedTabId } from "./components/constants";
import { Footer } from "./components/footer";
import { HomeTabContent } from "./components/home-tab-content";
import { Tabs } from "./components/tabs";
import { TasksTabContent } from "./components/tasks-tab-content";
import { TimelineTabContent } from "./components/timeline-tab-content";
import { useLeadCreatePageState } from "./state";

import styles from "./page.module.css";

type TabContentProps = {
  ruc?: string;
  onRucInput?: (value: string) => void;
  onSubmit?: () => void;
};

function HiddenTabContent(props: { title: string }) {
  return <div class={styles.hiddenTabContent}>{props.title}</div>;
}

const TAB_COMPONENTS: Record<
  ExtendedTabId,
  (props: TabContentProps) => JSX.Element
> = {
  home: HomeTabContent,
  timeline: () => <TimelineTabContent />,
  tasks: () => <TasksTabContent />,
  notes: () => <HiddenTabContent title="Notes" />,
  files: () => <HiddenTabContent title="Files" />,
  emails: () => <HiddenTabContent title="Emails" />,
  calendar: () => <HiddenTabContent title="Calendar" />,
};

const hiddenTabsCount = 4;

export function LeadCreatePage() {
  const { navigateTo } = useSidePanel();
  const [error, setError] = createSignal<string | null>(null);
  const { pageState, setActiveTab, setRuc } = useLeadCreatePageState();

  onMount(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const isCtrlOrMeta = event.ctrlKey || event.metaKey;

      if (!isCtrlOrMeta) return;

      if (event.key === "Enter") {
        event.preventDefault();
        void handleSubmit();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    onCleanup(() => window.removeEventListener("keydown", onKeyDown));
  });

  async function handleSubmit() {
    const value = pageState().draft.ruc.trim();

    if (!value) {
      setError("El RUC es obligatorio");
      return;
    }

    setError(null);

    try {
      const result = await requestLeadCreation({
        ruc: value,
      });

      navigateTo(
        createLeadDetailSidePanelPage({
          leadId: result.leadId,
          title: value,
          subtitle: `RUC ${value}`,
        }),
        { resetStack: true },
      );
    } catch (submitError) {
      setError(
        toAppError(submitError, "Error al registrar prospecto").publicMessage,
      );
    }
  }

  return (
    <div class={styles.pageShell}>
      <PanelList>
        <div class={styles.page}>
          <Tabs
            activeTab={pageState().draft.activeTab}
            hiddenTabsCount={hiddenTabsCount}
            onTabSelect={setActiveTab}
            onHiddenTabSelect={setActiveTab}
          />

          <Dynamic
            component={TAB_COMPONENTS[pageState().draft.activeTab]}
            ruc={pageState().draft.ruc}
            onRucInput={setRuc}
            onSubmit={() => void handleSubmit()}
          />

          {error() && <p class={styles.error}>{error()}</p>}
        </div>
      </PanelList>

      <Footer onOpen={() => void handleSubmit()} />
    </div>
  );
}
