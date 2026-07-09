import { For, Match, Show, Switch, createMemo } from "solid-js";

import CircleCheck from "~/components/icons/circle-check-big";
import Point from "~/components/icons/point";
import { Button } from "~/components/ui/input/button";
import type { LeadDetailView } from "~/contracts/workflow/views";
import type { RecordTabId } from "~/features/record-show/model/record-tab-id";
import { FulfillmentPanel } from "~/features/workflow/detail/forms/fulfillment/fulfillment-panel";
import { ProposeRateSection } from "~/features/workflow/detail/forms/pricing/propose-rate";
import { RateProposalSection } from "~/features/workflow/detail/forms/pricing/rate-proposal";
import { ExpiredPanel } from "~/features/workflow/detail/forms/review/expired-panel";
import { QualifyForm } from "~/features/workflow/detail/forms/review/qualify-form";
import { formatDateTime } from "~/lib/utils";

import {
  resolveNextAction,
  setupChecklist,
  type NextAction,
} from "./next-action";

import styles from "./resumen.module.css";

function asMessage(
  action: NextAction,
): Extract<NextAction, { kind: "message" }> | null {
  return action.kind === "message" ? action : null;
}

function asRateDecision(
  action: NextAction,
): Extract<NextAction, { kind: "decide-rate" }> | null {
  return action.kind === "decide-rate" ? action : null;
}

function asExpired(
  action: NextAction,
): Extract<NextAction, { kind: "expired" }> | null {
  return action.kind === "expired" ? action : null;
}

function asDisqualified(
  action: NextAction,
): Extract<NextAction, { kind: "disqualified" }> | null {
  return action.kind === "disqualified" ? action : null;
}

export function NextActionCard(props: {
  data: LeadDetailView;
  onNavigate: (id: RecordTabId) => void;
}) {
  const action = createMemo(() => resolveNextAction(props.data));
  const latestProposal = () => props.data.rateProposals.at(-1);

  return (
    <Switch>
      <Match when={asMessage(action())}>
        {(message) => (
          <div class={styles.messageCard} data-tone={message().tone}>
            <p class={styles.messageTitle}>{message().title}</p>
            <p class={styles.messageBody}>{message().message}</p>
          </div>
        )}
      </Match>

      <Match when={action().kind === "qualify"}>
        <QualifyForm leadId={props.data.lead.id} />
      </Match>

      <Match when={action().kind === "propose-rate"}>
        <ProposeRateSection
          leadId={props.data.lead.id}
          latestProposal={latestProposal()}
        />
      </Match>

      <Match when={asRateDecision(action())}>
        {(decision) => (
          <RateProposalSection
            leadId={props.data.lead.id}
            proposal={decision().proposal}
            reservationExpiresAt={props.data.lead.reservationExpiresAt}
            rateRevisions={props.data.rateRevisions}
            canAccept={props.data.availableActions.includes("accept-rate")}
            canRequestRevision={props.data.availableActions.includes(
              "request-rate-revision",
            )}
            canEdit={props.data.availableActions.includes("edit-rate-proposal")}
          />
        )}
      </Match>

      <Match when={action().kind === "fulfillment"}>
        <FulfillmentPanel data={props.data} />
      </Match>

      <Match when={action().kind === "setup-checklist"}>
        <div class={styles.checklist}>
          <p class={styles.checklistTitle}>Para activar, completa:</p>
          <ul class={styles.checklistItems}>
            <For each={setupChecklist(props.data)}>
              {(item) => (
                <li class={styles.checklistItem} data-done={item.done}>
                  <Show when={item.done} fallback={<Point size={16} />}>
                    <CircleCheck size={16} />
                  </Show>
                  <span class={styles.checklistLabel}>{item.label}</span>
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

      <Match when={asExpired(action())}>
        {(expired) => (
          <ExpiredPanel
            leadId={props.data.lead.id}
            canRestart={expired().canRestart}
          />
        )}
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
  );
}
