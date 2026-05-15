import { useAction } from "@solidjs/router";
import { createMemo, createResource, Show } from "solid-js";
import { Dynamic } from "solid-js/web";

import { queryLeadBootstrapPreview } from "~/actions/workflow/queries/records";
import { useAuthenticatedSession } from "~/components/providers/authenticated-session-provider";
import { createLeadMutation } from "~/features/workflow/data/mutations";

import { PanelList } from "../../components/list";
import { TabStrip } from "../../components/tab-strip";
import { useScopedHotkey } from "../../core/hotkeys/create-scoped-hotkey";
import { useSidePanel } from "../../state/use-side-panel";
import { createLeadRecordDetailSidePanelPage } from "../../types/side-panel-page";
import { Footer } from "../record-page/footer";
import type { CreateTabContentProps } from "../record-page/tabs/content-props";
import {
  CREATE_LEAD_TABS_BY_ID,
  CREATE_LEAD_TABS,
} from "../record-page/tabs/tab-registry";
import { createCreateLeadController } from "./controller";
import { useCreateLeadPageState } from "./state";

import styles from "../record-page/page.module.css";

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
          <TabStrip
            tabs={CREATE_LEAD_TABS}
            activeTab={activeTab()}
            onTabSelect={setActiveTab}
          />

          <Dynamic
            component={CREATE_LEAD_TABS_BY_ID[activeTab()].component}
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
