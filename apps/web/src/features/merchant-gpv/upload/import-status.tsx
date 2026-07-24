import {
  createAsync,
  revalidate,
  useAction,
  useSubmission,
} from "@solidjs/router";
import {
  createEffect,
  ErrorBoundary,
  For,
  Match,
  on,
  onCleanup,
  Show,
  Suspense,
  Switch,
} from "solid-js";

import { type GpvSnapshotProgressEvent } from "~/contracts/merchant-stats/imports";
import { WidgetCardShell } from "~/features/widgets/widget-card-shell";
import { WidgetSkeleton } from "~/features/widgets/widget-skeleton";
import type { StateSubscription } from "~/lib/realtime/subscribe-state";
import { formatAppDateTime } from "~/lib/time/app-time";
import { actionErrorMessage } from "~/lib/wire-error";

import { subscribeToGpvSnapshotImport } from "../data/import-subscription";
import { resolveGpvImportIssueMutation } from "../data/mutations";
import { gpvSnapshotQuery } from "../data/queries";
import { formatInteger } from "../format";
import { refreshPublishedGpvData } from "../revalidate";

import styles from "./upload-report.module.css";

export function ImportStatus(props: { snapshotId: string }) {
  const snapshot = createAsync(() => gpvSnapshotQuery(props.snapshotId));
  const resolveIssue = useAction(resolveGpvImportIssueMutation);
  const resolution = useSubmission(resolveGpvImportIssueMutation);
  let subscription: StateSubscription | null = null;
  let refreshedActiveSnapshotId: string | null = null;

  const jobId = () => snapshot()?.job?.jobId ?? null;

  createEffect(
    on(jobId, (id) => {
      subscription?.stop();
      subscription = null;
      if (!id || isTerminalJob(snapshot()?.job?.queueState)) {
        return;
      }

      subscription = subscribeToGpvSnapshotImport(id, () => {
        void revalidate(gpvSnapshotQuery.key);
      });
    }),
  );

  createEffect(() => {
    const view = snapshot();
    if (
      view?.state !== "active" ||
      refreshedActiveSnapshotId === view.snapshotId
    ) {
      return;
    }
    refreshedActiveSnapshotId = view.snapshotId;
    void refreshPublishedGpvData();
  });

  onCleanup(() => subscription?.stop());

  async function decide(
    issueId: string,
    choice:
      | "keep_previous"
      | "accept_candidate"
      | "exclude_candidate"
      | "reject_snapshot",
  ): Promise<void> {
    try {
      await resolveIssue({ issueId, resolution: choice });
    } catch {
      // useSubmission exposes the action error in the status card.
    }
  }

  return (
    <ErrorBoundary
      fallback={
        <WidgetCardShell title="Importación GPV" status="error">
          <span />
        </WidgetCardShell>
      }
    >
      <Suspense fallback={<WidgetSkeleton />}>
        <Show when={snapshot()}>
          {(view) => (
            <WidgetCardShell
              title="Importación GPV"
              action={
                <span class={styles.status}>
                  Corte {formatAppDateTime(new Date(view().cutAt))}
                </span>
              }
            >
              <div class={styles.panel}>
                <Show when={resolution.error}>
                  {(error) => (
                    <p class={styles.statusError}>
                      {actionErrorMessage(error())}
                    </p>
                  )}
                </Show>
                <Switch>
                  <Match
                    when={
                      view().state === "queued" || view().state === "processing"
                    }
                  >
                    <ImportProgress job={view().job} />
                  </Match>
                  <Match when={view().state === "needs_review"}>
                    <p class={styles.statusError}>
                      Esta actualización necesita una decisión antes de
                      publicarse.
                    </p>
                    <For each={view().issues}>
                      {(issue) => (
                        <div class={styles.reviewIssue}>
                          <p>{issue.detail}</p>
                          <div class={styles.reviewActions}>
                            <Show when={issue.type !== "row_rejected"}>
                              <DecisionButton
                                disabled={Boolean(resolution.pending)}
                                onClick={() =>
                                  void decide(issue.id, "keep_previous")
                                }
                              >
                                Mantener anterior
                              </DecisionButton>
                              <DecisionButton
                                disabled={Boolean(resolution.pending)}
                                onClick={() =>
                                  void decide(issue.id, "accept_candidate")
                                }
                              >
                                {issue.type === "placement_missing"
                                  ? "Aceptar ausencia"
                                  : "Usar nuevo"}
                              </DecisionButton>
                            </Show>
                            <Show when={issue.type === "row_rejected"}>
                              <DecisionButton
                                disabled={Boolean(resolution.pending)}
                                onClick={() =>
                                  void decide(issue.id, "exclude_candidate")
                                }
                              >
                                Omitir fila inválida
                              </DecisionButton>
                            </Show>
                            <DecisionButton
                              disabled={Boolean(resolution.pending)}
                              onClick={() =>
                                void decide(issue.id, "reject_snapshot")
                              }
                            >
                              Descartar actualización
                            </DecisionButton>
                          </div>
                        </div>
                      )}
                    </For>
                  </Match>
                  <Match when={view().state === "active"}>
                    <p class={styles.statusDone}>
                      La actualización está publicada.
                    </p>
                  </Match>
                  <Match when={view().state === "ready"}>
                    <p class={styles.statusDone}>
                      La actualización está lista para publicarse.
                    </p>
                  </Match>
                  <Match when={view().state === "superseded"}>
                    <p class={styles.status}>
                      Esta actualización fue reemplazada por una más reciente.
                    </p>
                  </Match>
                  <Match when={view().state === "rejected"}>
                    <p class={styles.status}>
                      La actualización fue descartada.
                    </p>
                  </Match>
                  <Match when={view().state === "failed"}>
                    <p class={styles.statusError}>
                      {view().job?.errorMessage ?? "La importación falló."}
                    </p>
                  </Match>
                </Switch>
              </div>
            </WidgetCardShell>
          )}
        </Show>
      </Suspense>
    </ErrorBoundary>
  );
}

function ImportProgress(props: { job: GpvSnapshotProgressEvent | null }) {
  const settled = () =>
    (props.job?.rowsApplied ?? 0) + (props.job?.rowsFailed ?? 0);
  const total = () => props.job?.rowsTotal ?? 0;

  return (
    <div>
      <p class={styles.status}>
        {total() === 0
          ? "Leyendo el archivo…"
          : `Procesando ${formatInteger(settled())} de ${formatInteger(
              total(),
            )} filas...`}
      </p>
      <div class={styles.bar}>
        <div
          class={styles.barFill}
          style={{
            width: `${total() ? (settled() / total()) * 100 : 0}%`,
          }}
        />
      </div>
    </div>
  );
}

function DecisionButton(props: {
  children: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      class={styles.close}
      disabled={props.disabled}
      onClick={() => props.onClick()}
    >
      {props.children}
    </button>
  );
}

function isTerminalJob(
  state: GpvSnapshotProgressEvent["queueState"] | undefined,
): boolean {
  return state === "done" || state === "failed";
}
