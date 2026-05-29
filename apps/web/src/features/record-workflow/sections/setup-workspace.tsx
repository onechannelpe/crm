import { useAction } from "@solidjs/router";
import { For, Show, createSignal } from "solid-js";

import { Button } from "~/components/ui/input/button";
import type {
  LeadDetailVenueView,
  LeadDetailView,
} from "~/contracts/workflow/views";
import {
  MODALIDAD_COBRO_KINDS,
  type ModalidadCobro,
  type ProductScope,
} from "~/contracts/workflow/vocabulary";
import {
  Widget,
  WidgetBody,
  WidgetHeader,
  WidgetTitle,
} from "~/features/side-panel/components/widget-card";
import {
  addVenueAccountsMutation,
  createVenueMutation,
  saveDigitalPolicyMutation,
} from "~/features/workflow/data/command-mutations";
import { revalidateWorkflowLead } from "~/features/workflow/data/revalidate-workflow";
import { toAppError } from "~/lib/app-errors";

import { AccountsForm } from "./setup/components/accounts-form";
import { VenueCard } from "./setup/components/card";
import { VenueForm } from "./setup/components/venue-form";
import { useAccountsFormState } from "./setup/model/accounts-form-state";
import { buildAccountsSubmitInput } from "./setup/model/accounts-submit-input";
import { useVenueFormState } from "./setup/model/venue-form-state";
import { buildVenueSubmitInput } from "./setup/model/venue-submit-input";

const MODALIDAD_COBRO_LABELS: Record<ModalidadCobro, string> = {
  SUSCRIPCIONES: "Suscripciones",
  ONE_CLIC: "One Click",
  CARGO_UNICO: "Cargo único",
};

export function SetupWorkspace(props: { data: LeadDetailView }) {
  const canAddVenue = () => props.data.lead.stage === "SETUP_EXECUTION";
  const canAddAccounts = () => props.data.lead.stage === "SETUP_EXECUTION";
  const canEditDigitalPolicy = () => props.data.lead.stage === "SETUP_PLAN";

  return (
    <div>
      <Show when={canEditDigitalPolicy()}>
        <DigitalPolicyPanel
          leadId={props.data.lead.id}
          linkScope={props.data.profile?.linkScope ?? "none"}
          linkUrl={props.data.profile?.linkUrl ?? null}
          onlineScope={props.data.profile?.onlineScope ?? "none"}
          onlineUrl={props.data.profile?.onlineUrl ?? null}
          onlineModalidad={props.data.profile?.onlineModalidad ?? null}
        />
      </Show>

      <Show when={canAddVenue()}>
        <VenueCreatePanel
          leadId={props.data.lead.id}
          linkScope={props.data.profile?.linkScope ?? "none"}
          onlineScope={props.data.profile?.onlineScope ?? "none"}
        />
      </Show>

      <Show
        when={props.data.venues.length > 0}
        fallback={
          <Show when={!canAddVenue()}>
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
        <For each={props.data.venues}>
          {(venue) => (
            <>
              <VenueCard venue={venue} />
              <Show when={canAddAccounts() && !venue.solesAccount}>
                <AccountsFormPanel leadId={props.data.lead.id} venue={venue} />
              </Show>
            </>
          )}
        </For>
      </Show>
    </div>
  );
}

function DigitalPolicyPanel(props: {
  leadId: string;
  linkScope: ProductScope;
  linkUrl: string | null;
  onlineScope: ProductScope;
  onlineUrl: string | null;
  onlineModalidad: ModalidadCobro | null;
}) {
  const saveDigitalPolicy = useAction(saveDigitalPolicyMutation);
  const [linkEnabled, setLinkEnabled] = createSignal(
    props.linkScope !== "none",
  );
  const [linkScope, setLinkScope] = createSignal<"shared" | "per_venue">(
    props.linkScope === "per_venue" ? "per_venue" : "shared",
  );
  const [linkUrl, setLinkUrl] = createSignal(props.linkUrl ?? "");
  const [onlineEnabled, setOnlineEnabled] = createSignal(
    props.onlineScope !== "none",
  );
  const [onlineScope, setOnlineScope] = createSignal<"shared" | "per_venue">(
    props.onlineScope === "per_venue" ? "per_venue" : "shared",
  );
  const [onlineUrl, setOnlineUrl] = createSignal(props.onlineUrl ?? "");
  const [onlineModalidad, setOnlineModalidad] = createSignal<
    ModalidadCobro | ""
  >(props.onlineModalidad ?? "");
  const [submitting, setSubmitting] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  const resolvedLinkScope = () => (linkEnabled() ? linkScope() : "none");
  const resolvedOnlineScope = () => (onlineEnabled() ? onlineScope() : "none");

  function validate(): string | null {
    const selectedLinkScope = resolvedLinkScope();
    const selectedOnlineScope = resolvedOnlineScope();

    if (selectedLinkScope === "shared" && !linkUrl().trim()) {
      return "URL de CulqiLink es requerida cuando la modalidad es compartida";
    }

    if (selectedOnlineScope === "shared" && !onlineUrl().trim()) {
      return "URL de CulqiOnline es requerida cuando la modalidad es compartida";
    }

    if (selectedOnlineScope === "shared" && !onlineModalidad()) {
      return "Modalidad de cobro es obligatoria cuando CulqiOnline es compartido";
    }

    return null;
  }

  async function handleSave(event: SubmitEvent) {
    event.preventDefault();

    const validationError = validate();

    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const selectedLinkScope = resolvedLinkScope();
      const selectedOnlineScope = resolvedOnlineScope();
      const modalidad = onlineModalidad();

      await saveDigitalPolicy({
        leadId: props.leadId,
        linkScope: selectedLinkScope,
        linkUrl: selectedLinkScope === "shared" ? linkUrl().trim() : null,
        onlineScope: selectedOnlineScope,
        onlineUrl: selectedOnlineScope === "shared" ? onlineUrl().trim() : null,
        onlineModalidad:
          selectedOnlineScope === "shared" && modalidad ? modalidad : null,
      });

      await revalidateWorkflowLead(props.leadId);
    } catch (err) {
      setError(
        toAppError(err, "No se pudo guardar política digital").publicMessage,
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Widget>
      <WidgetHeader>
        <WidgetTitle text="Política digital" />
      </WidgetHeader>

      <WidgetBody>
        <form onSubmit={(event) => void handleSave(event)}>
          <label>
            <input
              type="checkbox"
              checked={linkEnabled()}
              onChange={(event) => setLinkEnabled(event.currentTarget.checked)}
            />{" "}
            Activar CulqiLink
          </label>

          <Show when={linkEnabled()}>
            <label>
              <input
                type="radio"
                name="linkScope"
                checked={linkScope() === "shared"}
                onChange={() => setLinkScope("shared")}
              />{" "}
              URL compartida
            </label>

            <label>
              <input
                type="radio"
                name="linkScope"
                checked={linkScope() === "per_venue"}
                onChange={() => setLinkScope("per_venue")}
              />{" "}
              URL por local
            </label>

            <Show when={linkScope() === "shared"}>
              <input
                type="url"
                value={linkUrl()}
                onChange={(event) => setLinkUrl(event.currentTarget.value)}
                placeholder="URL CulqiLink"
              />
            </Show>
          </Show>

          <label>
            <input
              type="checkbox"
              checked={onlineEnabled()}
              onChange={(event) => {
                setOnlineEnabled(event.currentTarget.checked);

                if (!event.currentTarget.checked) {
                  setOnlineModalidad("");
                }
              }}
            />{" "}
            Activar CulqiOnline
          </label>

          <Show when={onlineEnabled()}>
            <label>
              <input
                type="radio"
                name="onlineScope"
                checked={onlineScope() === "shared"}
                onChange={() => setOnlineScope("shared")}
              />{" "}
              URL compartida
            </label>

            <label>
              <input
                type="radio"
                name="onlineScope"
                checked={onlineScope() === "per_venue"}
                onChange={() => {
                  setOnlineScope("per_venue");
                  setOnlineModalidad("");
                }}
              />{" "}
              URL por local
            </label>

            <Show when={onlineScope() === "shared"}>
              <input
                type="url"
                value={onlineUrl()}
                onChange={(event) => setOnlineUrl(event.currentTarget.value)}
                placeholder="URL CulqiOnline"
              />

              <For each={MODALIDAD_COBRO_KINDS}>
                {(value) => (
                  <label>
                    <input
                      type="radio"
                      name="onlineModalidad"
                      value={value}
                      checked={onlineModalidad() === value}
                      onChange={() => setOnlineModalidad(value)}
                    />{" "}
                    {MODALIDAD_COBRO_LABELS[value]}
                  </label>
                )}
              </For>
            </Show>
          </Show>

          <Show when={error()}>
            {(msg) => <p style={{ color: "red", margin: "8px 0" }}>{msg()}</p>}
          </Show>

          <Button
            type="submit"
            variant="secondary"
            size="sm"
            loading={submitting()}
          >
            Guardar política digital
          </Button>
        </form>
      </WidgetBody>
    </Widget>
  );
}

function VenueCreatePanel(props: {
  leadId: string;
  linkScope: ProductScope;
  onlineScope: ProductScope;
}) {
  const createVenue = useAction(createVenueMutation);
  const form = useVenueFormState();
  const [showForm, setShowForm] = createSignal(false);
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
      await revalidateWorkflowLead(props.leadId);
      form.reset();
      setShowForm(false);
    } catch (err) {
      setError(toAppError(err, "No se pudo registrar la sede").publicMessage);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Show
      when={showForm()}
      fallback={
        <div style={{ padding: "var(--spacing-3) 0" }}>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setShowForm(true)}
          >
            + Agregar sede
          </Button>
        </div>
      }
    >
      <VenueForm
        form={form}
        linkScope={props.linkScope}
        onlineScope={props.onlineScope}
        submitting={submitting()}
        error={error()}
        onSubmit={(event) => void handleSubmit(event)}
      />
    </Show>
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

      await revalidateWorkflowLead(props.leadId);
      form.reset();
    } catch (err) {
      setError(
        toAppError(err, "No se pudieron registrar las cuentas").publicMessage,
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
      onSubmit={(event) => void handleSubmit(event)}
    />
  );
}
