import { createAsync, revalidate, useAction } from "@solidjs/router";
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
import {
  leadDetailQuery,
  leadListQuery,
} from "~/features/pipeline/data/queries";
import { toAppError } from "~/lib/app-errors";
import { shortName } from "~/lib/users/display-name";
import type { LeadDetailView } from "~/server/pipeline/application/queries/views/lead-detail";

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
} from "./constants";
import { Footer } from "./footer";
import { useLeadRecordPageState } from "./state";
import { FilesTab } from "./tabs/files";
import { HomeTab } from "./tabs/home";
import { NotesTab } from "./tabs/notes";
import { TasksTab } from "./tabs/tasks";
import { TimelineTab } from "./tabs/timeline";

import styles from "./page.module.css";

const POLL_INTERVAL_MS = 3_500;
const POLL_TIMEOUT_MS = 60_000;

type CreateTabContentProps = {
  mode: "create";
  ruc?: string;
  razonSocial?: string | null;
  address?: string | null;
  engineStatus?: string;
  canCreate: boolean;
  onSubmit?: () => void;
};

type ViewTabContentProps = {
  mode: "view";
  data: LeadDetailView;
};

type TabContentProps = CreateTabContentProps | ViewTabContentProps;

const TAB_COMPONENTS: Record<
  ExtendedTabId,
  (props: TabContentProps) => JSX.Element
> = {
  home: HomeTab,
  timeline: (props) =>
    props.mode === "create" ? (
      <TimelineTab
        mode="create"
        ruc={props.ruc}
        engineStatus={props.engineStatus}
      />
    ) : (
      <TimelineTab mode="view" data={props.data} />
    ),
  tasks: (props) =>
    props.mode === "create" ? (
      <TasksTab
        mode="create"
        ruc={props.ruc}
        engineStatus={props.engineStatus}
        canCreate={props.canCreate}
      />
    ) : (
      <TasksTab mode="view" data={props.data} />
    ),
  notes: (props) =>
    props.mode === "create" ? (
      <NotesTab mode="create" />
    ) : (
      <NotesTab mode="view" data={props.data} />
    ),
  files: () => <FilesTab />,
  emails: () => <HiddenTabContent title="Emails" />,
  calendar: () => <HiddenTabContent title="Calendar" />,
};

export function RecordPage() {
  const { currentUser } = useAuthenticatedSession();
  const { navigateTo } = useSidePanel();
  const createLead = useAction(createLeadMutation);
  const [error, setError] = createSignal<string | null>(null);
  const { pageState, activeTab, setActiveTab } = useLeadRecordPageState();

  const draftRuc = createMemo(() => {
    const state = pageState();
    if (state.mode !== "create") {
      return "";
    }

    return state.draft.ruc;
  });

  const detailData = createAsync(async () => {
    const state = pageState();
    if (state.mode !== "view") {
      return null;
    }

    return leadDetailQuery(state.leadId);
  });

  createEffect(on(draftRuc, () => setError(null), { defer: true }));

  const validRuc = createMemo(() => {
    const state = pageState();
    if (state.mode !== "create") {
      return null;
    }

    const value = state.draft.ruc.trim();
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

  const isCreateMode = createMemo(() => pageState().mode === "create");

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
    if (pageState().mode !== "create") {
      return;
    }

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

  let prevSunatStatus: string | undefined;
  let pollStartedAt: number | undefined;
  createEffect(() => {
    const state = pageState();
    if (state.mode !== "view") {
      prevSunatStatus = undefined;
      pollStartedAt = undefined;
      return;
    }

    const detail = detailData();
    if (!detail) return;

    const status = detail.sourceStatus.sunat.status;

    if (
      (prevSunatStatus === "queued" || prevSunatStatus === "running") &&
      status !== "queued" &&
      status !== "running"
    ) {
      void revalidate(leadListQuery.key);
      pollStartedAt = undefined;
    }
    prevSunatStatus = status;

    if (status !== "queued" && status !== "running") return;

    if (pollStartedAt === undefined) {
      pollStartedAt = Date.now();
    }
    if (Date.now() - pollStartedAt >= POLL_TIMEOUT_MS) {
      pollStartedAt = undefined;
      return;
    }

    const leadId = state.leadId;
    const id = setInterval(() => {
      void revalidate(leadDetailQuery.keyFor(leadId));
    }, POLL_INTERVAL_MS);

    onCleanup(() => clearInterval(id));
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
            when={!isCreateMode()}
            fallback={
              <Dynamic
                component={TAB_COMPONENTS[activeTab()]}
                {...createTabProps()}
              />
            }
          >
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
          </Show>

          <Show when={error()}>
            {(message) => <p class={styles.error}>{message()}</p>}
          </Show>
        </div>
      </PanelList>

      <Show when={isCreateMode()}>
        <Footer onOpen={() => void handleSubmit()} />
      </Show>
    </div>
  );
}
