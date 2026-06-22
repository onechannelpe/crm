import { For, Match, Show, Switch, createMemo } from "solid-js";

import CircleCheck from "~/components/icons/circle-check-big";
import Point from "~/components/icons/point";
import { Button } from "~/components/ui/input/button";
import type { LeadDetailView } from "~/contracts/workflow/views";
import type { RecordTabId } from "~/features/record-show/model/record-tab-id";
import { ProposeRateSection } from "~/features/workflow/detail/forms/pricing/propose-rate";
import { RateProposalSection } from "~/features/workflow/detail/forms/pricing/rate-proposal";

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

      <Match when={action().kind === "propose-rate"}>
        <ProposeRateSection
          leadId={props.data.lead.id}
          latestProposal={latestProposal()}
        />
      </Match>

      {/* decide-rate only resolves when a proposal exists, so the proposal in
          the `when` both narrows the type and co-locates that invariant. */}
      <Match when={action().kind === "decide-rate" && latestProposal()}>
        {(proposal) => (
          <RateProposalSection
            leadId={props.data.lead.id}
            proposal={proposal()}
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
    </Switch>
  );
}
