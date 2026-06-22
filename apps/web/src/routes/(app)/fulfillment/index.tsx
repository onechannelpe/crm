import { A, createAsync } from "@solidjs/router";
import { For, Show } from "solid-js";

import { AppPage, AppPageSection } from "~/components/layout/page";
import {
  describeFulfillmentStep,
  describeProductKind,
} from "~/contracts/workflow/fulfillment-labels";
import { fulfillmentQueueQuery } from "~/features/workflow/data/queries";

import styles from "./fulfillment-queue.module.css";

const OWNER_LABELS: Record<string, string> = {
  executive: "Ejecutivo",
  back_office: "Back office",
  supervisor: "Supervisor",
};

function waitingLabel(since: number): string {
  const hours = Math.floor((Date.now() - since) / 3_600_000);
  if (hours < 1) return "Hace menos de 1h";
  if (hours < 24) return `Hace ${hours}h`;
  return `Hace ${Math.floor(hours / 24)}d`;
}

// Back-office (and supervisor) inbox: every lead across the branch sitting on a
// step they must act on, oldest first. The single highest-leverage screen for
// the bottleneck role.
export default function FulfillmentQueuePage() {
  const queue = createAsync(() => fulfillmentQueueQuery(), {
    initialValue: { rows: [] },
  });

  return (
    <AppPage width="wide">
      <AppPageSection>
        <Show
          when={queue().rows.length > 0}
          fallback={<p class={styles.empty}>No hay entregas pendientes.</p>}
        >
          <ul class={styles.queue}>
            <For each={queue().rows}>
              {(row) => (
                <A href={`/records/${row.leadId}`} class={styles.row}>
                  <div class={styles.main}>
                    <span class={styles.ruc}>{row.ruc}</span>
                    <span class={styles.name}>
                      {row.legalName ?? "Sin razón social"}
                    </span>
                  </div>
                  <div class={styles.meta}>
                    <span class={styles.step}>
                      {describeFulfillmentStep(row.currentStep)}
                    </span>
                    <Show when={row.productKind}>
                      {(kind) => (
                        <span class={styles.tag}>
                          {describeProductKind(kind())}
                        </span>
                      )}
                    </Show>
                    <span class={styles.owner}>
                      {row.pendingOwner
                        ? (OWNER_LABELS[row.pendingOwner] ?? row.pendingOwner)
                        : ""}
                    </span>
                    <span class={styles.executive}>{row.executiveName}</span>
                    <span class={styles.waiting}>
                      {waitingLabel(row.waitingSince)}
                    </span>
                  </div>
                </A>
              )}
            </For>
          </ul>
        </Show>
      </AppPageSection>
    </AppPage>
  );
}
