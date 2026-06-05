import { createAsync, revalidate, useNavigate } from "@solidjs/router";
import { Show, createEffect, createMemo } from "solid-js";

import { useSnackBar } from "~/components/feedback/snack-bar-manager/use-snack-bar";
import { useAuthenticatedSession } from "~/components/providers/authenticated-session-provider";
import { createRecordPageController } from "~/features/record-show/record-page-controller";
import { RecordTabs } from "~/features/record-show/tabs/record-tabs";
import { useRecordActions } from "~/features/record-show/use-record-actions";
import {
  leadDetailQuery,
  leadListQuery,
} from "~/features/workflow/data/queries";

import { PanelList } from "../../components/list";
import { Footer } from "./footer";
import { useLeadRecordPageState } from "./state";

import styles from "./page.module.css";

const POLL_INTERVAL_MS = 3_500;
const POLL_TIMEOUT_MS = 60_000;
export function RecordPage() {
  const navigate = useNavigate();
  const { setFavorite, exportLead } = useRecordActions();
  const { enqueueSuccessSnackBar, enqueueErrorSnackBar, enqueueInfoSnackBar } =
    useSnackBar();
  const { currentUser } = useAuthenticatedSession();
  const { leadId, activeTab, setActiveTab, setSubtitle } =
    useLeadRecordPageState();
  const canDeleteCompany = createMemo(() => currentUser().role === "superuser");

  const detailData = createAsync(async () => {
    return leadDetailQuery(leadId());
  });
  createEffect(() => {
    const detail = detailData();
    if (!detail) return;
    setSubtitle(detail.lead.ruc);
  });

  createRecordPageController({
    leadId,
    detailData,
    pollIntervalMs: POLL_INTERVAL_MS,
    pollTimeoutMs: POLL_TIMEOUT_MS,
    revalidateLeadDetail: async (currentLeadId) => {
      await revalidate(leadDetailQuery.keyFor(currentLeadId));
    },
    revalidateLeadList: async () => {
      await revalidate(leadListQuery.key);
    },
  });

  return (
    <div class={styles.pageShell}>
      <PanelList>
        <div class={styles.page}>
          <Show
            when={detailData()}
            fallback={
              <div class={styles.hiddenTabContent}>Cargando detalle...</div>
            }
          >
            {(detail) => (
              <RecordTabs
                context={{ kind: "lead", data: detail() }}
                activeTab={activeTab()}
                onTabSelect={setActiveTab}
              />
            )}
          </Show>
        </div>
      </PanelList>

      <Show when={detailData()}>
        {(detail) => (
          <Footer
            onOpen={() => navigate(`/records/${detail().lead.id}`)}
            options={{
              showDeleteCompany: canDeleteCompany(),
              addToFavoritesDisabled: detail().lead.isFavorite,
              onAddToFavorites: () => {
                void (async () => {
                  try {
                    await setFavorite(
                      detail().lead.id,
                      detail().lead.isFavorite,
                    );
                    enqueueSuccessSnackBar("Empresa agregada a favoritos");
                  } catch {
                    enqueueErrorSnackBar("No se pudo agregar a favoritos");
                  }
                })();
              },
              onExportCompany: () => {
                exportLead(detail().lead);
                enqueueSuccessSnackBar("Empresa exportada");
              },
              onDeleteCompany: () => {
                enqueueInfoSnackBar(
                  "Eliminar empresa estará disponible pronto",
                );
              },
            }}
          />
        )}
      </Show>
    </div>
  );
}
