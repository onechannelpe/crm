import { useAction } from "@solidjs/router";
import { For, Show, createSignal } from "solid-js";

import Building2 from "~/components/icons/building-2";
import Moneybag from "~/components/icons/moneybag";
import Target from "~/components/icons/target";
import { Button } from "~/components/ui/input/button";
import { TextInput } from "~/components/ui/input/text-input";
import type { LeadDetailView } from "~/contracts/workflow/views";
import { ABONO_BANKS, type AbonoBank } from "~/contracts/workflow/vocabulary";
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

import {
  requestQuotationMutation,
  saveCommercialScopeMutation,
} from "../../data/command-mutations";
import { revalidateWorkflowLead } from "../../data/revalidate-workflow";

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

  const [saving, setSaving] = createSignal(false);
  const [requesting, setRequesting] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  function validateForm(): string | null {
    if (!proveedorActual().trim()) return "Proveedor actual es requerido";
    if (!giroNegocio().trim()) return "Giro de negocio es requerido";
    if (!abonoBank()) return "Banco de abono es requerido";
    if (!posTotal().trim() || Number(posTotal()) <= 0)
      return "Cantidad de POS es requerida";
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
      });
      await revalidateWorkflowLead(props.leadId);
    } catch (err) {
      setError(toAppError(err, "Error al guardar").publicMessage);
    } finally {
      setSaving(false);
    }
  }

  async function handleRequestQuotation() {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }
    const bank = abonoBank();
    if (!bank) return;
    setError(null);
    setRequesting(true);
    try {
      await requestQuotation({
        leadId: props.leadId,
        proveedorActual: proveedorActual().trim(),
        tasaActual: Number(tasaActual()),
        gpv: Number(gpv()),
        ticket: Number(ticket()),
        giroNegocio: giroNegocio().trim(),
        abonoBank: bank,
        posTotal: Number(posTotal()),
      });
      await revalidateWorkflowLead(props.leadId);
    } catch (err) {
      setError(toAppError(err, "Error al solicitar cotización").publicMessage);
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
                  Solicitar cotización
                </Button>
              </Show>
            </div>
          </form>
        </Show>
      </WidgetBody>
    </Widget>
  );
}
