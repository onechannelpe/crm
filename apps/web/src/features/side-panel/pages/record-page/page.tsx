import {
  createAsync,
  revalidate,
  useAction,
  useNavigate,
} from "@solidjs/router";
import { Show, createMemo } from "solid-js";
import { Dynamic } from "solid-js/web";

import { useToast } from "~/components/feedback/toast/provider";
import { useAuthenticatedSession } from "~/components/providers/authenticated-session-provider";
import { addLeadToFavoritesMutation } from "~/features/workflow/data/mutations";
import {
  leadDetailQuery,
  leadListQuery,
} from "~/features/workflow/data/queries";

import { PanelList } from "../../components/list";
import { TabStrip } from "../../components/tab-strip";
import {
  HIDDEN_TAB_ITEMS,
  TAB_ITEMS,
  type ExtendedTabId,
  type TabId,
} from "./constants";
import { createRecordPageController } from "./controller";
import { Footer } from "./footer";
import { useLeadRecordPageState } from "./state";
import { TAB_COMPONENTS } from "./tabs/tab-components";

import styles from "./page.module.css";

const POLL_INTERVAL_MS = 3_500;
const POLL_TIMEOUT_MS = 60_000;

export function RecordPage() {
  const navigate = useNavigate();
  const addToFavorites = useAction(addLeadToFavoritesMutation);
  const { showToast } = useToast();
  const { currentUser } = useAuthenticatedSession();
  const { leadId, activeTab, setActiveTab } = useLeadRecordPageState();
  const canDeleteCompany = createMemo(() => currentUser().role === "superuser");

  const detailData = createAsync(async () => {
    return leadDetailQuery(leadId());
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
          <TabStrip<ExtendedTabId, TabId>
            tabs={TAB_ITEMS}
            hiddenTabs={HIDDEN_TAB_ITEMS}
            activeTab={activeTab()}
            onTabSelect={setActiveTab}
            onHiddenTabSelect={setActiveTab}
          />

          <Show
            when={detailData()}
            fallback={
              <div class={styles.hiddenTabContent}>Cargando detalle...</div>
            }
          >
            {(detail) => (
              <Dynamic
                component={TAB_COMPONENTS[activeTab()]}
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
              onAddToFavorites: async () => {
                try {
                  await addToFavorites({ leadId: detail().lead.id });
                  showToast("success", "Empresa agregada a favoritos");
                } catch {
                  showToast("error", "No se pudo agregar a favoritos");
                }
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
                showToast("success", "Empresa exportada");
              },
              onDeleteCompany: () => {
                showToast("info", "Eliminar empresa estará disponible pronto");
              },
            }}
          />
        )}
      </Show>
    </div>
  );
}
