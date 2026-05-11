import { useAction } from "@solidjs/router";
import { For, Match, Show, Switch, createMemo, createSignal } from "solid-js";

import {
  Widget,
  WidgetBody,
} from "~/features/side-panel/components/widget-card";
import {
  addVenueAccountsMutation,
  createVenueMutation,
} from "~/features/workflow/data/mutations";
import { toAppError } from "~/lib/app-errors";
import type { LeadDetailVenueView } from "~/server/workflow/application/queries/views/lead-detail";

import type { TabContentProps } from "../content-props";
import { AccountsForm } from "./components/accounts-form";
import { VenueCard } from "./components/card";
import { VenueForm } from "./components/venue-form";
import { useAccountsFormState } from "./model/accounts-form-state";
import { buildAccountsSubmitInput } from "./model/accounts-submit-input";
import { useVenueFormState } from "./model/venue-form-state";
import { buildVenueSubmitInput } from "./model/venue-submit-input";

export function SedesTab(props: TabContentProps) {
  const viewProps = createMemo(() =>
    props.mode === "view" ? props.data : null,
  );

  return (
    <Show when={viewProps()} keyed>
      {(data) => (
        <Switch>
          <Match
            when={
              data.lead.stage === "SCOPING" || data.lead.stage === "QUOTING"
            }
          >
            <VenueCreationView leadId={data.lead.id} venues={data.venues} />
          </Match>
          <Match when={data.lead.stage === "CLOSING"}>
            <VenueClosingView leadId={data.lead.id} venues={data.venues} />
          </Match>
          <Match when={true}>
            <VenueReadOnlyView venues={data.venues} />
          </Match>
        </Switch>
      )}
    </Show>
  );
}

function VenueCreationView(props: {
  leadId: string;
  venues: LeadDetailVenueView[];
}) {
  return (
    <div>
      <For each={props.venues}>{(venue) => <VenueCard venue={venue} />}</For>
      <VenueCreatePanel leadId={props.leadId} />
    </div>
  );
}

function VenueCreatePanel(props: { leadId: string }) {
  const createVenue = useAction(createVenueMutation);
  const form = useVenueFormState();
  const [submitting, setSubmitting] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  async function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    const parsed = buildVenueSubmitInput(form);
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await createVenue({ leadId: props.leadId, ...parsed.value });
      form.reset();
    } catch (err) {
      setError(toAppError(err, "No se pudo registrar la sede").publicMessage);
    } finally {
      setSubmitting(false);
    }
  }
  return (
    <VenueForm
      form={form}
      submitting={submitting()}
      error={error()}
      onSubmit={(e) => void handleSubmit(e)}
    />
  );
}

function VenueClosingView(props: {
  leadId: string;
  venues: LeadDetailVenueView[];
}) {
  return (
    <div>
      <VenueCreatePanel leadId={props.leadId} />
      <For each={props.venues}>
        {(venue) => <VenueClosingCard leadId={props.leadId} venue={venue} />}
      </For>
      <Show when={props.venues.length === 0}>
        <Widget>
          <WidgetBody>
            <div
              style={{
                padding: "12px",
                "text-align": "center",
                color: "#666",
              }}
            >
              No hay sedes registradas
            </div>
          </WidgetBody>
        </Widget>
      </Show>
    </div>
  );
}

function VenueClosingCard(props: {
  leadId: string;
  venue: LeadDetailVenueView;
}) {
  const addAccounts = useAction(addVenueAccountsMutation);
  const form = useAccountsFormState();
  const [submitting, setSubmitting] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  const hasAccounts = () => !!props.venue.solesAccount;

  async function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    const parsed = buildAccountsSubmitInput(form);
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await addAccounts({
        leadId: props.leadId,
        venueId: props.venue.id,
        ...parsed.value,
      });
      form.reset();
    } catch (err) {
      setError(
        toAppError(err, "No se pudo registrar las cuentas").publicMessage,
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <VenueCard venue={props.venue} />
      <Show when={!hasAccounts()}>
        <AccountsForm
          venueName={props.venue.nombreComercial}
          form={form}
          submitting={submitting()}
          error={error()}
          onSubmit={(e) => void handleSubmit(e)}
        />
      </Show>
    </div>
  );
}

function VenueReadOnlyView(props: { venues: LeadDetailVenueView[] }) {
  return (
    <div>
      <Show
        when={props.venues.length > 0}
        fallback={
          <Widget>
            <WidgetBody>
              <div
                style={{
                  padding: "12px",
                  "text-align": "center",
                  color: "#666",
                }}
              >
                No hay sedes registradas
              </div>
            </WidgetBody>
          </Widget>
        }
      >
        <For each={props.venues}>{(venue) => <VenueCard venue={venue} />}</For>
      </Show>
    </div>
  );
}
