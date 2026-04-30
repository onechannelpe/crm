import { useAction } from "@solidjs/router";
import { For, Show, createMemo, createSignal } from "solid-js";

import {
  Widget,
  WidgetBody,
} from "~/features/side-panel/components/widget-card";
import {
  createSaleContainerMutation,
  createSaleVenueMutation,
} from "~/features/workflow/data/mutations";
import { toAppError } from "~/lib/app-errors";

import type { TabContentProps } from "../content-props";
import { VenueCard } from "./components/card";
import { VenueForm } from "./components/form";
import { useSedesFormState } from "./model/form-state";
import { buildSubmitInput } from "./model/submit-input";

export function SedesTab(props: TabContentProps) {
  const createSale = useAction(createSaleContainerMutation);
  const createSaleVenue = useAction(createSaleVenueMutation);

  const form = useSedesFormState();
  const [submitting, setSubmitting] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  const viewProps = createMemo(() =>
    props.mode === "view" ? props.data : null,
  );

  async function handleSubmit(event: SubmitEvent) {
    event.preventDefault();

    const data = viewProps();
    if (!data) return;

    const parsed = buildSubmitInput(form);
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      let saleId = data.sale?.id;
      if (!saleId) {
        const saleResult = await createSale({ leadId: data.lead.id });
        saleId = saleResult.saleId;
      }

      await createSaleVenue({
        leadId: data.lead.id,
        saleId,
        ...parsed.value,
      });

      form.reset();
    } catch (err) {
      setError(toAppError(err, "No se pudo registrar la sede").publicMessage);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Show when={viewProps()} keyed>
      {(data) => (
        <div>
          <Show when={data.venues.length > 0}>
            <For each={data.venues}>
              {(venue) => <VenueCard venue={venue} />}
            </For>
          </Show>

          <Show
            when={data.lead.stage === "READY_FOR_SALE"}
            fallback={
              <Show when={data.venues.length === 0}>
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
            <VenueForm
              form={form}
              submitting={submitting()}
              error={error()}
              onSubmit={(submitEvent) => void handleSubmit(submitEvent)}
            />
          </Show>
        </div>
      )}
    </Show>
  );
}
