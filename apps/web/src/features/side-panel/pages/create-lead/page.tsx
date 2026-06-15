import { useAction } from "@solidjs/router";
import { createEffect, createMemo, createResource, on, Show } from "solid-js";

import { queryLeadBootstrapPreview } from "~/actions/workflow/queries/records";
import { useAuthenticatedSession } from "~/components/providers/authenticated-session-provider";
import type { RecordContext } from "~/features/record-show/model/record-context";
import { RecordTabs } from "~/features/record-show/tabs/record-tabs";
import { createLeadMutation } from "~/features/workflow/data/command-mutations";

import { PanelList } from "../../components/list";
import { useScopedHotkey } from "../../core/hotkeys/create-scoped-hotkey";
import { useSidePanel } from "../../state/use-side-panel";
import { createLeadRecordDetailSidePanelPage } from "../../types/side-panel-page";
import { Footer } from "../record-page/footer";
import { createCreateLeadController } from "./controller";
import { useCreateLeadPageState } from "./state";

import styles from "../record-page/page.module.css";

export function CreateLeadPage() {
  const { currentUser } = useAuthenticatedSession();
  const { navigateTo } = useSidePanel();
  const createLead = useAction(createLeadMutation);

  const {
    draftRuc,
    draftRazonSocial,
    draftAddress,
    draftScope,
    activeTab,
    setRazonSocial,
    setAddress,
    setScopeField,
    setActiveTab,
  } = useCreateLeadPageState();
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

  // Prefill identity from the SUNAT lookup, but only into empty fields so a
  // manual edit is never clobbered when the preview re-resolves.
  createEffect(
    on(latestBootstrapPreview, (preview) => {
      if (!preview) return;
      if (preview.razonSocial && !draftRazonSocial().trim()) {
        setRazonSocial(preview.razonSocial);
      }
      if (preview.address && !draftAddress().trim()) {
        setAddress(preview.address);
      }
    }),
  );

  const { error, submitting, submit } = createCreateLeadController({
    draftRuc,
    validRuc,
    razonSocial: draftRazonSocial,
    address: draftAddress,
    scope: draftScope,
    currentUser,
    createLead,
    onLeadCreated: ({ leadId, ruc }) => {
      navigateTo(
        createLeadRecordDetailSidePanelPage({
          leadId,
          title: draftRazonSocial() || `RUC ${ruc}`,
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

  const recordContext = createMemo<RecordContext>(() => ({
    kind: "draft",
    ruc: draftRuc(),
    razonSocial: draftRazonSocial(),
    address: draftAddress(),
    engineStatus: engineStatus(),
    setRazonSocial,
    setAddress,
    commercialScope: { values: draftScope(), setField: setScopeField },
  }));
  useScopedHotkey("Mod+Enter", () => void submit(), { allowInInputs: true });

  return (
    <div class={styles.pageShell}>
      <PanelList>
        <div class={styles.page}>
          <RecordTabs
            context={recordContext()}
            activeTab={activeTab()}
            onTabSelect={setActiveTab}
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
