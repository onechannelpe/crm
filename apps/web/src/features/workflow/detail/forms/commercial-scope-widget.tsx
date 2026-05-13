import { useAction } from "@solidjs/router";
import { For, Show, createSignal } from "solid-js";

import Building2 from "~/components/icons/building-2";
import Moneybag from "~/components/icons/moneybag";
import Target from "~/components/icons/target";
import { Button } from "~/components/ui/input/button";
import { TextInput } from "~/components/ui/input/text-input";
import {
  FieldIcon,
  FieldInputValue,
  FieldLabel,
  FieldLabelText,
  FieldRow,
  FieldTable,
} from "~/features/side-panel/components/field-table";
import {
  Widget,
  WidgetBody,
  WidgetHeader,
  WidgetTitle,
} from "~/features/side-panel/components/widget-card";
import { toAppError } from "~/lib/app-errors";
import type { LeadDetailView } from "~/server/workflow/application/queries/views/lead-detail";
import {
  ABONO_BANKS,
  type AbonoBank,
  type ModalidadCobro,
  type ProductScope,
} from "~/workflow/contracts/lead-schema";

import {
  requestQuotationMutation,
  saveCommercialScopeMutation,
} from "../../data/mutations";

export function CommercialScopeWidget(props: {
  leadId: string;
  data: LeadDetailView;
}) {
  const save = useAction(saveCommercialScopeMutation);
  const requestQuotation = useAction(requestQuotationMutation);

  const canEdit = () => props.data.lead.stage === "SCOPING";
  const canRequestQuotation = () =>
    props.data.availableActions.includes("request-quotation");

  const profile = () => props.data.profile;

  const [proveedorActual, setProveedorActual] = createSignal(
    profile()?.proveedorActual ?? "",
  );
  const [tasaActual, setTasaActual] = createSignal(
    profile()?.tasaActual?.toString() ?? "",
  );
  const [gpv, setGpv] = createSignal(profile()?.gpv?.toString() ?? "");
  const [ticket, setTicket] = createSignal(profile()?.ticket?.toString() ?? "");
  const [giroNegocio, setGiroNegocio] = createSignal(
    profile()?.giroNegocio ?? "",
  );
  const [abonoBank, setAbonoBank] = createSignal<AbonoBank | "">(
    profile()?.abonoBank ?? "",
  );
  const [posTotal, setPosTotal] = createSignal(
    profile()?.posTotal?.toString() ?? "",
  );

  const initialLinkScope = profile()?.linkScope ?? "none";
  const initialOnlineScope = profile()?.onlineScope ?? "none";

  const [linkEnabled, setLinkEnabled] = createSignal(
    initialLinkScope !== "none",
  );
  const [linkScope, setLinkScope] = createSignal<"shared" | "per_venue">(
    initialLinkScope === "per_venue" ? "per_venue" : "shared",
  );
  const [linkUrl, setLinkUrl] = createSignal(profile()?.linkUrl ?? "");

  const [onlineEnabled, setOnlineEnabled] = createSignal(
    initialOnlineScope !== "none",
  );
  const [onlineScope, setOnlineScope] = createSignal<"shared" | "per_venue">(
    initialOnlineScope === "per_venue" ? "per_venue" : "shared",
  );
  const [onlineUrl, setOnlineUrl] = createSignal(profile()?.onlineUrl ?? "");
  const [onlineModalidad, setOnlineModalidad] = createSignal<
    ModalidadCobro | ""
  >(profile()?.onlineModalidad ?? "");

  const [saving, setSaving] = createSignal(false);
  const [requesting, setRequesting] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  function resolvedLinkScope(): ProductScope {
    return linkEnabled() ? linkScope() : "none";
  }

  function resolvedOnlineScope(): ProductScope {
    return onlineEnabled() ? onlineScope() : "none";
  }

  function validateForm(): string | null {
    if (!proveedorActual().trim()) return "Proveedor actual es requerido";
    if (!giroNegocio().trim()) return "Giro de negocio es requerido";
    if (!abonoBank()) return "Banco de abono es requerido";
    if (!posTotal().trim() || Number(posTotal()) <= 0)
      return "Cantidad de POS es requerida";
    const computedLinkScope = resolvedLinkScope();
    const computedOnlineScope = resolvedOnlineScope();
    if (computedLinkScope === "shared" && !linkUrl().trim())
      return "URL de CulqiLink es requerida cuando la modalidad es compartida";
    if (computedOnlineScope === "shared" && !onlineUrl().trim())
      return "URL de CulqiOnline es requerida cuando la modalidad es compartida";
    if (computedOnlineScope === "shared" && !onlineModalidad())
      return "Modalidad de cobro es obligatoria cuando CulqiOnline es compartido";
    return null;
  }

  async function handleSave(e: SubmitEvent) {
    e.preventDefault();
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }
    const bank = abonoBank();
    if (!bank) return;
    setError(null);
    setSaving(true);
    const computedLinkScope = resolvedLinkScope();
    const computedOnlineScope = resolvedOnlineScope();
    const modalidad = onlineModalidad();
    try {
      await save({
        leadId: props.leadId,
        proveedorActual: proveedorActual().trim(),
        tasaActual: Number(tasaActual()),
        gpv: Number(gpv()),
        ticket: Number(ticket()),
        giroNegocio: giroNegocio().trim(),
        abonoBank: bank,
        posTotal: Number(posTotal()),
        linkScope: computedLinkScope,
        linkUrl: computedLinkScope === "shared" ? linkUrl().trim() : null,
        onlineScope: computedOnlineScope,
        onlineUrl: computedOnlineScope === "shared" ? onlineUrl().trim() : null,
        onlineModalidad:
          computedOnlineScope === "shared" && modalidad ? modalidad : null,
      });
    } catch (err) {
      setError(toAppError(err, "Error al guardar").publicMessage);
    } finally {
      setSaving(false);
    }
  }

  async function handleRequestQuotation() {
    setError(null);
    setRequesting(true);
    try {
      await requestQuotation({ leadId: props.leadId });
    } catch (err) {
      setError(toAppError(err, "Error al solicitar cotizacion").publicMessage);
    } finally {
      setRequesting(false);
    }
  }

  return (
    <Widget>
      <WidgetHeader>
        <WidgetTitle text="Alcance comercial" />
      </WidgetHeader>
      <WidgetBody>
        <Show
          when={canEdit()}
          fallback={
            <FieldTable>
              <FieldRow>
                <FieldLabel>
                  <FieldLabelText>Proveedor actual</FieldLabelText>
                </FieldLabel>
                <span>{profile()?.proveedorActual ?? "—"}</span>
              </FieldRow>
              <FieldRow>
                <FieldLabel>
                  <FieldLabelText>Tasa actual</FieldLabelText>
                </FieldLabel>
                <span>
                  {profile()?.tasaActual != null
                    ? `${profile()?.tasaActual}%`
                    : "—"}
                </span>
              </FieldRow>
              <FieldRow>
                <FieldLabel>
                  <FieldLabelText>GPV</FieldLabelText>
                </FieldLabel>
                <span>{profile()?.gpv ?? "—"}</span>
              </FieldRow>
              <FieldRow>
                <FieldLabel>
                  <FieldLabelText>Ticket</FieldLabelText>
                </FieldLabel>
                <span>{profile()?.ticket ?? "—"}</span>
              </FieldRow>
              <FieldRow>
                <FieldLabel>
                  <FieldLabelText>Giro de negocio</FieldLabelText>
                </FieldLabel>
                <span>{profile()?.giroNegocio ?? "—"}</span>
              </FieldRow>
              <FieldRow>
                <FieldLabel>
                  <FieldLabelText>Banco de abono</FieldLabelText>
                </FieldLabel>
                <span>{profile()?.abonoBank ?? "—"}</span>
              </FieldRow>
              <FieldRow>
                <FieldLabel>
                  <FieldLabelText>Cantidad de POS</FieldLabelText>
                </FieldLabel>
                <span>{profile()?.posTotal ?? "—"}</span>
              </FieldRow>
            </FieldTable>
          }
        >
          <form onSubmit={(e) => void handleSave(e)}>
            <FieldTable>
              <FieldRow>
                <FieldLabel>
                  <FieldIcon>
                    <Building2 size={16} />
                  </FieldIcon>
                  <FieldLabelText>Proveedor actual</FieldLabelText>
                </FieldLabel>
                <FieldInputValue>
                  <TextInput
                    sizeVariant="sm"
                    value={proveedorActual()}
                    onChange={setProveedorActual}
                    required
                  />
                </FieldInputValue>
              </FieldRow>
              <FieldRow>
                <FieldLabel>
                  <FieldIcon>
                    <Target size={16} />
                  </FieldIcon>
                  <FieldLabelText>Tasa actual</FieldLabelText>
                </FieldLabel>
                <FieldInputValue>
                  <TextInput
                    sizeVariant="sm"
                    type="number"
                    step="0.01"
                    min="0"
                    value={tasaActual()}
                    onChange={setTasaActual}
                    required
                  />
                </FieldInputValue>
              </FieldRow>
              <FieldRow>
                <FieldLabel>
                  <FieldIcon>
                    <Moneybag size={16} />
                  </FieldIcon>
                  <FieldLabelText>GPV</FieldLabelText>
                </FieldLabel>
                <FieldInputValue>
                  <TextInput
                    sizeVariant="sm"
                    type="number"
                    step="0.01"
                    min="0"
                    value={gpv()}
                    onChange={setGpv}
                    required
                  />
                </FieldInputValue>
              </FieldRow>
              <FieldRow>
                <FieldLabel>
                  <FieldIcon>
                    <Moneybag size={16} />
                  </FieldIcon>
                  <FieldLabelText>Ticket</FieldLabelText>
                </FieldLabel>
                <FieldInputValue>
                  <TextInput
                    sizeVariant="sm"
                    type="number"
                    step="0.01"
                    min="0"
                    value={ticket()}
                    onChange={setTicket}
                    required
                  />
                </FieldInputValue>
              </FieldRow>
              <FieldRow>
                <FieldLabel>
                  <FieldIcon>
                    <Building2 size={16} />
                  </FieldIcon>
                  <FieldLabelText>Giro de negocio</FieldLabelText>
                </FieldLabel>
                <FieldInputValue>
                  <TextInput
                    sizeVariant="sm"
                    value={giroNegocio()}
                    onChange={setGiroNegocio}
                    required
                  />
                </FieldInputValue>
              </FieldRow>
              <FieldRow>
                <FieldLabel>
                  <FieldLabelText>Banco de abono</FieldLabelText>
                </FieldLabel>
                <FieldInputValue>
                  <select
                    value={abonoBank()}
                    onChange={(e) => {
                      const val = e.currentTarget.value;
                      setAbonoBank(ABONO_BANKS.find((b) => b === val) ?? "");
                    }}
                    required
                  >
                    <option value="">Seleccionar banco...</option>
                    <For each={ABONO_BANKS}>
                      {(bank) => <option value={bank}>{bank}</option>}
                    </For>
                  </select>
                </FieldInputValue>
              </FieldRow>
              <FieldRow>
                <FieldLabel>
                  <FieldLabelText>Cantidad de POS</FieldLabelText>
                </FieldLabel>
                <FieldInputValue>
                  <TextInput
                    sizeVariant="sm"
                    type="number"
                    min="1"
                    step="1"
                    value={posTotal()}
                    onChange={setPosTotal}
                    required
                  />
                </FieldInputValue>
              </FieldRow>

              <FieldRow>
                <FieldLabel>
                  <FieldLabelText>CulqiLink</FieldLabelText>
                </FieldLabel>
                <FieldInputValue>
                  <label>
                    <input
                      type="checkbox"
                      checked={linkEnabled()}
                      onChange={(e) => setLinkEnabled(e.currentTarget.checked)}
                    />{" "}
                    Activar CulqiLink
                  </label>
                </FieldInputValue>
              </FieldRow>
              <Show when={linkEnabled()}>
                <FieldRow>
                  <FieldLabel>
                    <FieldLabelText>Modalidad Link</FieldLabelText>
                  </FieldLabel>
                  <FieldInputValue>
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
                  </FieldInputValue>
                </FieldRow>
                <Show when={linkScope() === "shared"}>
                  <FieldRow>
                    <FieldLabel>
                      <FieldLabelText>URL CulqiLink</FieldLabelText>
                    </FieldLabel>
                    <FieldInputValue>
                      <TextInput
                        sizeVariant="sm"
                        type="url"
                        value={linkUrl()}
                        onChange={setLinkUrl}
                        required
                      />
                    </FieldInputValue>
                  </FieldRow>
                </Show>
              </Show>

              <FieldRow>
                <FieldLabel>
                  <FieldLabelText>CulqiOnline</FieldLabelText>
                </FieldLabel>
                <FieldInputValue>
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
                </FieldInputValue>
              </FieldRow>
              <Show when={onlineEnabled()}>
                <FieldRow>
                  <FieldLabel>
                    <FieldLabelText>Modalidad Online</FieldLabelText>
                  </FieldLabel>
                  <FieldInputValue>
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
                  </FieldInputValue>
                </FieldRow>
                <Show when={onlineScope() === "shared"}>
                  <FieldRow>
                    <FieldLabel>
                      <FieldLabelText>URL CulqiOnline</FieldLabelText>
                    </FieldLabel>
                    <FieldInputValue>
                      <TextInput
                        sizeVariant="sm"
                        type="url"
                        value={onlineUrl()}
                        onChange={setOnlineUrl}
                        required
                      />
                    </FieldInputValue>
                  </FieldRow>
                  <FieldRow>
                    <FieldLabel>
                      <FieldLabelText>Modalidad de cobro</FieldLabelText>
                    </FieldLabel>
                    <FieldInputValue>
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
                        One Click
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
                    </FieldInputValue>
                  </FieldRow>
                </Show>
              </Show>
            </FieldTable>

            <Show when={error()}>
              {(msg) => (
                <p style={{ color: "red", margin: "8px 0" }}>{msg()}</p>
              )}
            </Show>

            <div style={{ display: "flex", gap: "8px", padding: "8px 0" }}>
              <Button
                type="submit"
                variant="secondary"
                size="sm"
                loading={saving()}
              >
                Guardar
              </Button>
              <Show when={canRequestQuotation()}>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  loading={requesting()}
                  onClick={() => void handleRequestQuotation()}
                >
                  Solicitar cotizacion
                </Button>
              </Show>
            </div>
          </form>
        </Show>
      </WidgetBody>
    </Widget>
  );
}
