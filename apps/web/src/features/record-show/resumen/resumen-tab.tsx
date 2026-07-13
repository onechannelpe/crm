import { For, Match, Show, Switch, createMemo } from "solid-js";

import CircleCheck from "~/components/icons/circle-check-big";
import Point from "~/components/icons/point";
import { Button } from "~/components/ui/input/button";
import type { RecordContext } from "~/features/record-show/model/record-context";
import type { RecordTabId } from "~/features/record-show/model/record-tab-id";
import { RateProposalSection } from "~/features/workflow/detail/forms/pricing/rate-proposal";
import { formatDateTime } from "~/lib/utils";

import {
  resolveNextAction,
  setupChecklist,
  type NextAction,
} from "./next-action";
import { StageStepper } from "./stage-stepper";

import styles from "./resumen.module.css";

function asMessage(action: NextAction) {
  return action.kind === "message" ? action : null;
}

function asDisqualified(action: NextAction) {
  return action.kind === "disqualified" ? action : null;
}

export function ResumenTab(props: {
  context: RecordContext;
  onNavigate: (id: RecordTabId) => void;
}) {
  return (
    <Show
      when={props.context.kind === "lead" ? props.context.data : null}
      keyed
    >
      {(data) => {
        const action = createMemo(() => resolveNextAction(data));
        const latestProposal = () => data.rateProposals.at(-1);

        return (
          <div class={styles.resumen}>
            <StageStepper stage={data.lead.stage} />

            <Switch>
              <Match when={asMessage(action())}>
                {(message) => (
                  <div class={styles.messageCard} data-tone={message().tone}>
                    <p class={styles.messageTitle}>{message().title}</p>
                    <p class={styles.messageBody}>{message().message}</p>
                  </div>
                )}
              </Match>

              <Match when={action().kind === "decide-rate" && latestProposal()}>
                {(proposal) => (
                  <RateProposalSection
                    leadId={data.lead.id}
                    proposal={proposal()}
                    reservationExpiresAt={data.lead.reservationExpiresAt}
                    rateRevisions={data.rateRevisions}
                    canAccept={false}
                    canRequestRevision={false}
                    canEdit={false}
                  />
                )}
              </Match>

              <Match when={action().kind === "setup-checklist"}>
                <div class={styles.checklist}>
                  <p class={styles.checklistTitle}>Para activar, completa:</p>
                  <ul class={styles.checklistItems}>
                    <For each={setupChecklist(data)}>
                      {(item) => (
                        <li class={styles.checklistItem} data-done={item.done}>
                          <Show when={item.done} fallback={<Point size={16} />}>
                            <CircleCheck size={16} />
                          </Show>
                          <span class={styles.checklistLabel}>
                            {item.label}
                          </span>
                        </li>
                      )}
                    </For>
                  </ul>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => props.onNavigate("afiliacion")}
                  >
                    Ir a afiliación
                  </Button>
                </div>
              </Match>

              <Match when={asDisqualified(action())}>
                {(disqualified) => (
                  <div class={styles.messageCard} data-tone="terminal">
                    <p class={styles.messageTitle}>Descalificado</p>
                    <p class={styles.messageBody}>
                      Este cliente no continúa en el flujo.
                    </p>
                    <Show
                      when={disqualified().disqualification}
                      fallback={
                        <p class={styles.receiptNote}>Sin motivo registrado.</p>
                      }
                    >
                      {(info) => (
                        <dl class={styles.receipt}>
                          <div class={styles.receiptRow}>
                            <dt>Motivo</dt>
                            <dd>{info().reason}</dd>
                          </div>
                          <div class={styles.receiptRow}>
                            <dt>Registrado por</dt>
                            <dd>{info().byName}</dd>
                          </div>
                          <div class={styles.receiptRow}>
                            <dt>Fecha</dt>
                            <dd>{formatDateTime(info().at)}</dd>
                          </div>
                        </dl>
                      )}
                    </Show>
                  </div>
                )}
              </Match>
            </Switch>
          </div>
        );
      }}
    </Show>
  );
}
