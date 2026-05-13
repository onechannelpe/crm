import { useAction } from "@solidjs/router";
import { For, Show, createMemo, createSignal } from "solid-js";

import {
  Widget,
  WidgetBody,
} from "~/features/side-panel/components/widget-card";
import {
  addVenueAccountsMutation,
  createVenueMutation,
} from "~/features/workflow/data/mutations";
import { toAppError } from "~/lib/app-errors";
import type { LeadDetailVenueView } from "~/contracts/workflow";
import type { ProductScope } from "~/contracts/workflow";

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
      {(data) => {
        const canAddVenue = ["QUOTING", "CLOSING", "LIVE"].includes(
          data.lead.stage,
        );
        const canAddAccounts = ["CLOSING", "LIVE"].includes(data.lead.stage);

        return (
          <div>
            <Show when={canAddVenue}>
              <VenueCreatePanel
                leadId={data.lead.id}
                linkScope={data.profile?.linkScope ?? "none"}
                onlineScope={data.profile?.onlineScope ?? "none"}
              />
            </Show>
            <Show
              when={data.venues.length > 0}
              fallback={
                <Show when={!canAddVenue}>
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
              }
            >
              <For each={data.venues}>
                {(venue) => (
                  <>
                    <VenueCard venue={venue} />
                    <Show when={canAddAccounts && !venue.solesAccount}>
                      <AccountsFormPanel leadId={data.lead.id} venue={venue} />
                    </Show>
                  </>
                )}
              </For>
            </Show>
          </div>
        );
      }}
    </Show>
  );
}

function VenueCreatePanel(props: {
  leadId: string;
  linkScope: ProductScope;
  onlineScope: ProductScope;
}) {
  const createVenue = useAction(createVenueMutation);
  const form = useVenueFormState();
  const [submitting, setSubmitting] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  async function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    const parsed = buildVenueSubmitInput(form, {
      linkScope: props.linkScope,
      onlineScope: props.onlineScope,
    });
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
      linkScope={props.linkScope}
      onlineScope={props.onlineScope}
      submitting={submitting()}
      error={error()}
      onSubmit={(e) => void handleSubmit(e)}
    />
  );
}

function AccountsFormPanel(props: {
  leadId: string;
  venue: LeadDetailVenueView;
}) {
  const addAccounts = useAction(addVenueAccountsMutation);
  const form = useAccountsFormState();
  const [submitting, setSubmitting] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

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
    <AccountsForm
      venueName={props.venue.nombreComercial}
      form={form}
      submitting={submitting()}
      error={error()}
      onSubmit={(e) => void handleSubmit(e)}
    />
  );
}
