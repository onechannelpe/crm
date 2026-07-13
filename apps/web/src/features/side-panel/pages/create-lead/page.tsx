import { useAction } from "@solidjs/router";
import { createMemo, createResource, Show } from "solid-js";

import { queryLeadBootstrapPreview } from "~/actions/workflow/queries/records";
import { useAuthenticatedSession } from "~/components/providers/authenticated-session-provider";
import type { RecordContext } from "~/features/record-show/model/record-context";
import { RecordTabs } from "~/features/record-show/tabs/record-tabs";
import { createLeadMutation } from "~/features/workflow/data/command-mutations";

import { SidePanelPage } from "../../components/page";
import { SidePanelFooter } from "../../components/panel-footer";
import { useSidePanel } from "../../state/use-side-panel";
import { createLeadRecordDetailSidePanelPage } from "../../types/side-panel-page";
import { createCreateLeadController } from "./controller";
import { useCreateLeadPageState } from "./state";

import styles from "../record-page/page.module.css";

export function CreateLeadPage() {
  const { currentUser } = useAuthenticatedSession();
  const { navigateTo } = useSidePanel();
  const createLead = useAction(createLeadMutation);

  const { draftRuc, draftScope, activeTab, setScopeField, setActiveTab } =
    useCreateLeadPageState();

  const validRuc = createMemo(() => {
    const value = draftRuc().trim();

    return /^\d{11}$/.test(value) ? value : null;
  });

  const [bootstrapPreview] = createResource(validRuc, (ruc) =>
    queryLeadBootstrapPreview(ruc),
  );

  const latestBootstrapPreview = createMemo(
    () => bootstrapPreview.latest ?? null,
  );

  const previewLegalName = createMemo(
    () => latestBootstrapPreview()?.legalName ?? null,
  );

  const previewAddress = createMemo(
    () => latestBootstrapPreview()?.address ?? null,
  );

  const { errorMessage, submitting, submit } = createCreateLeadController({
    draftRuc,
    validRuc,
    previewName: previewLegalName,
    scope: draftScope,
    currentUser,
    createLead,
    onLeadCreated: ({ leadId, ruc }) => {
      navigateTo(
        createLeadRecordDetailSidePanelPage({
          leadId,
          title: previewLegalName() || `RUC ${ruc}`,
          subtitle: `RUC ${ruc}`,
        }),
        { resetStack: true },
      );
    },
    setActiveTab,
  });

  const engineStatus = createMemo(() => {
    const ruc = validRuc();
    const preview = latestBootstrapPreview();

    if (!ruc) {
      return "";
    }

    if (bootstrapPreview.loading && preview === null) {
      return "Buscando...";
    }

    return preview?.engineStatus === "available"
      ? "Datos encontrados"
      : "Sin datos";
  });

  const recordContext = createMemo<RecordContext>(() => ({
    kind: "draft",
    ruc: draftRuc(),
    legalName: previewLegalName(),
    address: previewAddress(),
    engineStatus: engineStatus(),
    commercialScope: {
      values: draftScope(),
      setField: setScopeField,
    },
  }));

  return (
    <SidePanelPage
      footer={
        <SidePanelFooter
          primary={{
            label: "Crear cliente",
            shortcut: "⏎",
            onClick: () => void submit(),
            disabled: submitting(),
          }}
        />
      }
    >
      <RecordTabs
        context={recordContext()}
        activeTab={activeTab()}
        onTabSelect={setActiveTab}
      />

      <Show when={errorMessage()}>
        {(message) => <p class={styles.error}>{message()}</p>}
      </Show>
    </SidePanelPage>
  );
}
