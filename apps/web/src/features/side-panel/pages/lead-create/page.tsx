import { createAsync, useAction } from "@solidjs/router";
import { createMemo, createSignal, onCleanup, onMount } from "solid-js";
import type { JSX } from "solid-js";
import { Dynamic } from "solid-js/web";

import { queryLeadBootstrapPreview } from "~/actions/pipeline/queries/leads";
import { createLeadMutation } from "~/features/pipeline/data/mutations";
import {
  addOptimisticLead,
  createOptimisticLeadRow,
} from "~/features/pipeline/data/optimistic-leads";
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
  razonSocial?: string | null;
  address?: string | null;
  engineStatus?: string;
  canCreate?: boolean;
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
  timeline: (props) => <TimelineTabContent {...props} />,
  tasks: (props) => (
    <TasksTabContent {...props} canCreate={!!props.canCreate} />
  ),
  notes: () => <HiddenTabContent title="Notes" />,
  files: () => <HiddenTabContent title="Files" />,
  emails: () => <HiddenTabContent title="Emails" />,
  calendar: () => <HiddenTabContent title="Calendar" />,
};

const hiddenTabsCount = 4;

export function LeadCreatePage() {
  const { navigateTo } = useSidePanel();
  const createLead = useAction(createLeadMutation);
  const [error, setError] = createSignal<string | null>(null);
  const { pageState, setActiveTab, setRuc } = useLeadCreatePageState();
  const validRuc = createMemo(() => {
    const value = pageState().draft.ruc.trim();
    return /^\d{11}$/.test(value) ? value : null;
  });
  const bootstrapPreview = createAsync(async () => {
    const value = validRuc();
    if (!value) {
      return null;
    }
    return queryLeadBootstrapPreview(value);
  });

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

    const rollbackOptimistic = addOptimisticLead(
      ["all", "review"],
      createOptimisticLeadRow({
        ruc: value,
        razonSocial: bootstrapPreview()?.razonSocial ?? null,
        address: bootstrapPreview()?.address ?? null,
      }),
    );

    try {
      const result = await createLead({
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
      rollbackOptimistic();
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
            razonSocial={bootstrapPreview()?.razonSocial ?? null}
            address={bootstrapPreview()?.address ?? null}
            engineStatus={
              validRuc()
                ? bootstrapPreview()
                  ? bootstrapPreview()?.engineStatus === "available"
                    ? "Datos encontrados"
                    : "Sin datos en Engine"
                  : "Buscando en Engine"
                : "Esperando RUC válido"
            }
            canCreate={validRuc() !== null}
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
