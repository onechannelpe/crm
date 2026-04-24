import { useAction } from "@solidjs/router";
import { createMemo, createResource, Show } from "solid-js";
import type { JSX } from "solid-js";
import { Dynamic } from "solid-js/web";

import { queryLeadBootstrapPreview } from "~/actions/workflow/queries/records";
import { useAuthenticatedSession } from "~/components/providers/authenticated-session-provider";
import { createLeadMutation } from "~/features/workflow/data/mutations";

import { HiddenTabContent } from "../../components/hidden-tab";
import { PanelList } from "../../components/list";
import { TabStrip } from "../../components/tab-strip";
import { useScopedHotkey } from "../../core/hotkeys/create-scoped-hotkey";
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
import { createCreateLeadController } from "./controller";
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
  files: FilesTab,
  emails: () => <HiddenTabContent title="Correos" />,
  calendar: () => <HiddenTabContent title="Calendario" />,
};

export function CreateLeadPage() {
  const { currentUser } = useAuthenticatedSession();
  const { navigateTo } = useSidePanel();
  const createLead = useAction(createLeadMutation);

  const { draftRuc, activeTab, setActiveTab } = useCreateLeadPageState();
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

  const { error, submitting, submit } = createCreateLeadController({
    draftRuc,
    validRuc,
    currentUser,
    latestBootstrapPreview,
    createLead,
    onLeadCreated: ({ leadId, ruc }) => {
      navigateTo(
        createLeadRecordDetailSidePanelPage({
          leadId,
          title: latestBootstrapPreview()?.razonSocial ?? "",
          subtitle: `RUC ${ruc}`,
        }),
        { resetStack: true },
      );
    },
    setActiveTab,
  });

  const engineStatus = createMemo(() => {
    const value = validRuc();
    const preview = latestBootstrapPreview();

    if (!value) {
      return "";
    }

    if (bootstrapPreview.loading && preview === null) {
      return "Buscando...";
    }

    return preview?.engineStatus === "available"
      ? "Datos encontrados"
      : "Sin datos";
  });

  const createTabProps = createMemo<CreateTabContentProps>(() => ({
    mode: "create",
    ruc: draftRuc(),
    razonSocial: latestBootstrapPreview()?.razonSocial ?? null,
    address: latestBootstrapPreview()?.address ?? null,
    engineStatus: engineStatus(),
    canCreate: validRuc() !== null,
    submitting: submitting(),
    onSubmit: () => void submit(),
  }));
  useScopedHotkey("Mod+Enter", () => void submit(), { allowInInputs: true });

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

      <Footer onOpen={() => void submit()} disabled={submitting()} />
    </div>
  );
}
