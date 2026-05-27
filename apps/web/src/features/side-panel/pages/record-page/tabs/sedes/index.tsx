import { useAction } from "@solidjs/router";
import { For, Show, createMemo, createSignal } from "solid-js";

import { Button } from "~/components/ui/input/button";
import type { LeadDetailVenueView } from "~/contracts/workflow/views";
import {
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
  startSetupExecutionMutation,
} from "~/features/workflow/data/command-mutations";
import { revalidateWorkflowLead } from "~/features/workflow/data/revalidate-workflow";
import { toAppError } from "~/lib/app-errors";

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
        const canAddVenue = data.lead.stage === "SETUP_EXECUTION";
        const canAddAccounts = data.lead.stage === "SETUP_EXECUTION";
        const canEditDigitalPolicy = data.lead.stage === "SETUP_PLAN";
        const canStartSetupExecution = data.availableActions.includes(
          "start-setup-execution",
        );

        return (
          <div>
            <Show when={canEditDigitalPolicy}>
              <DigitalPolicyPanel
                leadId={data.lead.id}
                linkScope={data.profile?.linkScope ?? "none"}
                linkUrl={data.profile?.linkUrl ?? null}
                onlineScope={data.profile?.onlineScope ?? "none"}
                onlineUrl={data.profile?.onlineUrl ?? null}
                onlineModalidad={data.profile?.onlineModalidad ?? null}
                canStartSetupExecution={canStartSetupExecution}
              />
            </Show>
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

function DigitalPolicyPanel(props: {
  leadId: string;
  linkScope: ProductScope;
  linkUrl: string | null;
  onlineScope: ProductScope;
  onlineUrl: string | null;
  onlineModalidad: ModalidadCobro | null;
  canStartSetupExecution: boolean;
}) {
  const saveDigitalPolicy = useAction(saveDigitalPolicyMutation);
  const startSetupExecution = useAction(startSetupExecutionMutation);
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
  const [starting, setStarting] = createSignal(false);
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

  async function handleStartSetupExecution() {
    setError(null);
    setStarting(true);
    try {
      await startSetupExecution({ leadId: props.leadId });
      await revalidateWorkflowLead(props.leadId);
    } catch (err) {
      setError(toAppError(err, "No se pudo iniciar afiliación").publicMessage);
    } finally {
      setStarting(false);
    }
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
        <form onSubmit={(e) => void handleSave(e)}>
          <label>
            <input
              type="checkbox"
              checked={linkEnabled()}
              onChange={(e) => setLinkEnabled(e.currentTarget.checked)}
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
                onChange={(e) => setLinkUrl(e.currentTarget.value)}
                placeholder="URL CulqiLink"
              />
            </Show>
          </Show>
          <label>
            <input
              type="checkbox"
              checked={onlineEnabled()}
              onChange={(e) => {
                setOnlineEnabled(e.currentTarget.checked);
                if (!e.currentTarget.checked) setOnlineModalidad("");
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
                onChange={(e) => setOnlineUrl(e.currentTarget.value)}
                placeholder="URL CulqiOnline"
              />
              <label>
                <input
                  type="radio"
                  name="onlineModalidad"
                  value="SUSCRIPCIONES"
                  checked={onlineModalidad() === "SUSCRIPCIONES"}
                  onChange={() => setOnlineModalidad("SUSCRIPCIONES")}
                />{" "}
                Suscripciones
              </label>
              <label>
                <input
                  type="radio"
                  name="onlineModalidad"
                  value="ONE_CLIC"
                  checked={onlineModalidad() === "ONE_CLIC"}
                  onChange={() => setOnlineModalidad("ONE_CLIC")}
                />{" "}
                One click
              </label>
              <label>
                <input
                  type="radio"
                  name="onlineModalidad"
                  value="CARGO_UNICO"
                  checked={onlineModalidad() === "CARGO_UNICO"}
                  onChange={() => setOnlineModalidad("CARGO_UNICO")}
                />{" "}
                Cargo unico
              </label>
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
          <Show when={props.canStartSetupExecution}>
            <Button
              type="button"
              variant="primary"
              size="sm"
              loading={starting()}
              onClick={() => void handleStartSetupExecution()}
            >
              Iniciar afiliación
            </Button>
          </Show>
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
      onSubmit={(e) => void handleSubmit(e)}
    />
  );
}
