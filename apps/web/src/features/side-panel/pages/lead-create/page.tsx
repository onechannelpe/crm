import { useAction } from "@solidjs/router";
import {
  createEffect,
  createMemo,
  createResource,
  createSignal,
  on,
  onCleanup,
  onMount,
} from "solid-js";
import type { JSX } from "solid-js";
import { Dynamic } from "solid-js/web";

import { queryLeadBootstrapPreview } from "~/actions/pipeline/queries/leads";
import { useAuthenticatedSession } from "~/components/providers/authenticated-session-provider";
import { createLeadMutation } from "~/features/pipeline/data/mutations";
import {
  addOptimisticLead,
  createOptimisticLeadRow,
} from "~/features/pipeline/data/optimistic-leads";
import { toAppError } from "~/lib/app-errors";
import { shortName } from "~/lib/users/display-name";

import { HiddenTabContent } from "../../components/hidden-tab";
import { PanelList } from "../../components/list";
import { TabStrip } from "../../components/tab-strip";
import { useSidePanel } from "../../state/use-side-panel";
import { createLeadDetailSidePanelPage } from "../../types/side-panel-page";
import {
  HIDDEN_TAB_ITEMS,
  TAB_ITEMS,
  type ExtendedTabId,
  type TabId,
} from "./constants";
import { FilesTab } from "./tabs/files";
import { Footer } from "./footer";
import { HomeTab } from "./tabs/home";
import { NotesTab } from "./tabs/notes";
import { useLeadCreatePageState } from "./state";
import { TasksTab } from "./tabs/tasks";
import { TimelineTab } from "./tabs/timeline";

import styles from "./page.module.css";

type TabContentProps = {
  ruc?: string;
  razonSocial?: string | null;
  address?: string | null;
  engineStatus?: string;
  canCreate: boolean;
  onSubmit?: () => void;
};

const TAB_COMPONENTS: Record<
  ExtendedTabId,
  (props: TabContentProps) => JSX.Element
> = {
  home: HomeTab,
  timeline: TimelineTab,
  tasks: TasksTab,
  notes: () => <NotesTab />,
  files: () => <FilesTab />,
  emails: () => <HiddenTabContent title="Emails" />,
  calendar: () => <HiddenTabContent title="Calendar" />,
};

export function LeadCreatePage() {
  const { currentUser } = useAuthenticatedSession();
  const { navigateTo } = useSidePanel();
  const createLead = useAction(createLeadMutation);
  const [error, setError] = createSignal<string | null>(null);
  const { pageState, setActiveTab } = useLeadCreatePageState();

  createEffect(
    on(
      () => pageState().draft.ruc,
      () => setError(null),
      { defer: true },
    ),
  );
  const validRuc = createMemo(() => {
    const value = pageState().draft.ruc.trim();
    return /^\d{11}$/.test(value) ? value : null;
  });
  const [bootstrapPreview] = createResource(validRuc, async (ruc) => {
    if (!ruc) {
      return null;
    }
    return queryLeadBootstrapPreview(ruc);
  });
  const latestBootstrapPreview = createMemo(
    () => bootstrapPreview.latest ?? null,
  );
  const engineStatus = createMemo(() => {
    const value = validRuc();
    const preview = latestBootstrapPreview();

    if (!value) {
      return "";
    }

    if (bootstrapPreview.loading && preview === null) {
      return "Buscando en Engine";
    }

    return preview?.engineStatus === "available"
      ? "Datos encontrados"
      : "Sin datos en Engine";
  });
  const tabProps = createMemo<TabContentProps>(() => {
    const preview = latestBootstrapPreview();

    return {
      ruc: pageState().draft.ruc,
      razonSocial: preview?.razonSocial ?? null,
      address: preview?.address ?? null,
      engineStatus: engineStatus(),
      canCreate: validRuc() !== null,
      onSubmit: () => void handleSubmit(),
    };
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
    const value = validRuc();

    if (!value) {
      setError("El RUC debe tener 11 dígitos.");
      setActiveTab("home");
      return;
    }

    setError(null);

    const rollbackOptimistic = addOptimisticLead(
      ["mine", "review", "all"],
      createOptimisticLeadRow({
        ruc: value,
        razonSocial: latestBootstrapPreview()?.razonSocial ?? null,
        address: latestBootstrapPreview()?.address ?? null,
        executiveId: currentUser().id,
        executiveName: shortName(currentUser()),
      }),
    );

    try {
      const result = await createLead({
        ruc: value,
      });

      navigateTo(
        createLeadDetailSidePanelPage({
          leadId: result.leadId,
          title: latestBootstrapPreview()?.razonSocial ?? "",
          subtitle: `RUC ${value}`,
        }),
        { resetStack: true },
      );
    } catch (submitError) {
      rollbackOptimistic();
      const appError = toAppError(submitError, "Error al registrar prospecto");
      if (
        appError.code === "validation" &&
        appError.publicMessage.includes("RUC")
      ) {
        setError(appError.publicMessage);
        setActiveTab("home");
        return;
      }

      setError(appError.publicMessage);
    }
  }

  return (
    <div class={styles.pageShell}>
      <PanelList>
        <div class={styles.page}>
          <TabStrip<ExtendedTabId, TabId>
            tabs={TAB_ITEMS}
            hiddenTabs={HIDDEN_TAB_ITEMS}
            activeTab={pageState().draft.activeTab}
            onTabSelect={setActiveTab}
            onHiddenTabSelect={setActiveTab}
          />

          <Dynamic
            component={TAB_COMPONENTS[pageState().draft.activeTab]}
            {...tabProps()}
          />

          {error() && <p class={styles.error}>{error()}</p>}
        </div>
      </PanelList>

      <Footer onOpen={() => void handleSubmit()} />
    </div>
  );
}
