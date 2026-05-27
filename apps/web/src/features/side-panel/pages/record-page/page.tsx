import {
  createAsync,
  revalidate,
  useAction,
  useNavigate,
} from "@solidjs/router";
import { Show, createEffect, createMemo } from "solid-js";
import { Dynamic } from "solid-js/web";

import { useSnackBar } from "~/components/feedback/snack-bar-manager/use-snack-bar";
import { useAuthenticatedSession } from "~/components/providers/authenticated-session-provider";
import { addLeadToFavoritesMutation } from "~/features/workflow/data/command-mutations";
import {
  leadDetailQuery,
  leadListQuery,
} from "~/features/workflow/data/queries";
import { revalidateWorkflowLead } from "~/features/workflow/data/revalidate-workflow";

import { PanelList } from "../../components/list";
import { TabStrip } from "../../components/tab-strip";
import { createRecordPageController } from "./controller";
import { Footer } from "./footer";
import { useLeadRecordPageState } from "./state";
import { VIEW_RECORD_TABS_BY_ID, VIEW_RECORD_TABS } from "./tabs/tab-registry";

import styles from "./page.module.css";

const POLL_INTERVAL_MS = 3_500;
const POLL_TIMEOUT_MS = 60_000;
export function RecordPage() {
  const navigate = useNavigate();
  const addToFavorites = useAction(addLeadToFavoritesMutation);
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
    const { ruc, district, department } = detail.lead;
    const geo = [district, department].filter(Boolean).join(", ");
    setSubtitle([ruc, geo].filter(Boolean).join(" · "));
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
          <TabStrip
            tabs={VIEW_RECORD_TABS}
            activeTab={activeTab()}
            onTabSelect={setActiveTab}
          />

          <Show
            when={detailData()}
            fallback={
              <div class={styles.hiddenTabContent}>Cargando detalle...</div>
            }
          >
            {(detail) => (
              <Dynamic
                component={VIEW_RECORD_TABS_BY_ID[activeTab()].component}
                mode="view"
                data={detail()}
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
                    await addToFavorites({ leadId: detail().lead.id });
                    await revalidateWorkflowLead(detail().lead.id);
                    enqueueSuccessSnackBar("Empresa agregada a favoritos");
                  } catch {
                    enqueueErrorSnackBar("No se pudo agregar a favoritos");
                  }
                })();
              },
              onExportCompany: () => {
                const payload = {
                  empresa: detail().lead,
                  exportadoEn: new Date().toISOString(),
                };
                const json = JSON.stringify(payload, null, 2);
                const blob = new Blob([json], {
                  type: "application/json;charset=utf-8",
                });
                const url = URL.createObjectURL(blob);
                const anchor = document.createElement("a");
                anchor.href = url;
                anchor.download = `empresa-${detail().lead.id}.json`;
                anchor.click();
                URL.revokeObjectURL(url);
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
