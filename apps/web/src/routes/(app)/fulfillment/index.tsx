import { A, createAsync } from "@solidjs/router";
import { For, Show } from "solid-js";

import { AppPage, AppPageSection } from "~/components/layout/page";
import {
  describeFulfillmentStep,
  describeProductKind,
} from "~/contracts/workflow/fulfillment-labels";
import type { FulfillmentQueueRowView } from "~/contracts/workflow/views";
import type { FulfillmentStep } from "~/contracts/workflow/vocabulary";
import { fulfillmentQueueQuery } from "~/features/workflow/data/queries";

import styles from "./fulfillment-queue.module.css";

const STALE_AFTER_MS = 48 * 3_600_000;

function waitingLabel(since: number): string {
  const hours = Math.floor((Date.now() - since) / 3_600_000);
  if (hours < 1) return "Hace menos de 1h";
  if (hours < 24) return `Hace ${hours}h`;
  return `Hace ${Math.floor(hours / 24)}d`;
}

type Group = { step: FulfillmentStep; rows: FulfillmentQueueRowView[] };

// Group the inbox by the action the role must take, so the same task batches
// together; order groups by their oldest item so the most-aged work surfaces
// first. Rows arrive oldest-first from the query.
function groupByStep(rows: FulfillmentQueueRowView[]): Group[] {
  const byStep = new Map<FulfillmentStep, FulfillmentQueueRowView[]>();
  for (const row of rows) {
    const existing = byStep.get(row.currentStep);
    if (existing) existing.push(row);
    else byStep.set(row.currentStep, [row]);
  }
  return [...byStep.entries()]
    .map(([step, groupRows]) => ({ step, rows: groupRows }))
    .toSorted((a, b) => a.rows[0].waitingSince - b.rows[0].waitingSince);
}

// Back-office (and supervisor) inbox: every lead across the branch sitting on a
// step they must act on, grouped by step and aged. The single highest-leverage
// screen for the bottleneck role.
export default function FulfillmentQueuePage() {
  const queue = createAsync(() => fulfillmentQueueQuery(), {
    initialValue: { rows: [] },
  });
  const groups = () => groupByStep(queue().rows);

  return (
    <AppPage width="wide">
      <AppPageSection>
        <Show
          when={queue().rows.length > 0}
          fallback={<p class={styles.empty}>No hay entregas pendientes.</p>}
        >
          <div class={styles.groups}>
            <For each={groups()}>
              {(group) => (
                <section class={styles.group}>
                  <header class={styles.groupHeader}>
                    <span class={styles.groupTitle}>
                      {describeFulfillmentStep(group.step)}
                    </span>
                    <span class={styles.count}>{group.rows.length}</span>
                  </header>
                  <ul class={styles.queue}>
                    <For each={group.rows}>
                      {(row) => (
                        <A
                          href={`/records/${row.leadId}`}
                          class={styles.row}
                          data-state={
                            Date.now() - row.waitingSince > STALE_AFTER_MS
                              ? "stale"
                              : "fresh"
                          }
                        >
                          <div class={styles.main}>
                            <span class={styles.ruc}>{row.ruc}</span>
                            <span class={styles.name}>
                              {row.legalName ?? "Sin razón social"}
                            </span>
                          </div>
                          <div class={styles.meta}>
                            <Show when={row.productKind}>
                              {(kind) => (
                                <span class={styles.tag}>
                                  {describeProductKind(kind())}
                                </span>
                              )}
                            </Show>
                            <span class={styles.executive}>
                              {row.executiveName}
                            </span>
                            <span class={styles.waiting}>
                              {waitingLabel(row.waitingSince)}
                            </span>
                          </div>
                        </A>
                      )}
                    </For>
                  </ul>
                </section>
              )}
            </For>
          </div>
        </Show>
      </AppPageSection>
    </AppPage>
  );
}
