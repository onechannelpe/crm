import { useAction } from "@solidjs/router";
import {
  createEffect,
  createMemo,
  createResource,
  createSignal,
  on,
  onCleanup,
  onMount,
  Show,
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
import { asLeadId } from "~/server/pipeline/domain/lead-record";

import { HiddenTabContent } from "../../components/hidden-tab";
import { PanelList } from "../../components/list";
import { TabStrip } from "../../components/tab-strip";
import { useSidePanel } from "../../state/use-side-panel";
import { createLeadRecordDetailSidePanelPage } from "../../types/side-panel-page";
import {
  HIDDEN_TAB_ITEMS,
  TAB_ITEMS,
  type ExtendedTabId,
  type TabId,
} from "../record-page/constants";
import { Footer } from "../record-page/footer";
import type {
  CreateTabContentProps,
  TabContentProps,
} from "../record-page/tabs/content-props";
import { FilesTab } from "../record-page/tabs/files";
import { HomeTab } from "../record-page/tabs/home";
import { NotesTab } from "../record-page/tabs/notes";
import { TasksTab } from "../record-page/tabs/tasks";
import { TimelineTab } from "../record-page/tabs/timeline";
import { useCreateLeadPageState } from "./state";

import styles from "../record-page/page.module.css";

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

export function CreateLeadPage() {
  const { currentUser } = useAuthenticatedSession();
  const { navigateTo } = useSidePanel();
  const createLead = useAction(createLeadMutation);
  const [error, setError] = createSignal<string | null>(null);

  const { draftRuc, activeTab, setActiveTab } = useCreateLeadPageState();

  createEffect(on(draftRuc, () => setError(null), { defer: true }));

  const validRuc = createMemo(() => {
    const value = draftRuc().trim();
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

  const createTabProps = createMemo<CreateTabContentProps>(() => ({
    mode: "create",
    ruc: draftRuc(),
    razonSocial: latestBootstrapPreview()?.razonSocial ?? null,
    address: latestBootstrapPreview()?.address ?? null,
    engineStatus: engineStatus(),
    canCreate: validRuc() !== null,
    onSubmit: () => void handleSubmit(),
  }));

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
        createLeadRecordDetailSidePanelPage({
          leadId: asLeadId(result.leadId),
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
            activeTab={activeTab()}
            onTabSelect={setActiveTab}
            onHiddenTabSelect={setActiveTab}
          />

          <Dynamic
            component={TAB_COMPONENTS[activeTab()]}
            {...createTabProps()}
          />

          <Show when={error()}>
            {(message) => <p class={styles.error}>{message()}</p>}
          </Show>
        </div>
      </PanelList>

      <Footer onOpen={() => void handleSubmit()} />
    </div>
  );
}
