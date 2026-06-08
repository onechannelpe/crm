import { useAction } from "@solidjs/router";
import { For, Show, createSignal } from "solid-js";

import Building2 from "~/components/icons/building-2";
import Moneybag from "~/components/icons/moneybag";
import Package from "~/components/icons/package";
import Target from "~/components/icons/target";
import { Button } from "~/components/ui/input/button";
import { TextInput } from "~/components/ui/input/text-input";
import type { LeadDetailView } from "~/contracts/workflow/views";
import { ABONO_BANKS, type AbonoBank } from "~/contracts/workflow/vocabulary";
import {
  FieldInputValue,
  FieldRow,
  FieldTable,
  FieldTextValue,
  RecordInlineCell,
} from "~/features/side-panel/components/field-table";
import {
  RecordDetailSectionActions,
  RecordDetailSection,
  RecordDetailSectionBody,
  RecordDetailSectionHeader,
  RecordDetailSectionTitle,
} from "~/features/side-panel/components/record-detail-section";
import { actionErrorMessage } from "~/lib/error-messages";

import {
  requestQuotationMutation,
  saveCommercialScopeMutation,
} from "../../data/command-mutations";
import { revalidateWorkflowLead } from "../../data/revalidate-workflow";

import formStyles from "./section-form.module.css";

export function CommercialScopeSection(props: {
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
      setError(actionErrorMessage(err, "Error al guardar"));
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
      setError(actionErrorMessage(err, "Error al solicitar cotización"));
    } finally {
      setRequesting(false);
    }
  }

  return (
    <RecordDetailSection>
      <RecordDetailSectionHeader>
        <RecordDetailSectionTitle text="Alcance comercial" />
      </RecordDetailSectionHeader>
      <RecordDetailSectionBody>
        <Show
          when={canEdit()}
          fallback={
            <FieldTable>
              <RecordInlineCell
                label="Proveedor actual"
                icon={Building2}
                empty={!profile()?.proveedorActual}
              >
                <FieldTextValue>{profile()?.proveedorActual}</FieldTextValue>
              </RecordInlineCell>
              <RecordInlineCell
                label="Tasa actual"
                icon={Target}
                empty={profile()?.tasaActual == null}
              >
                <FieldTextValue>{profile()?.tasaActual}%</FieldTextValue>
              </RecordInlineCell>
              <RecordInlineCell
                label="GPV"
                icon={Moneybag}
                empty={profile()?.gpv == null}
              >
                <FieldTextValue>{profile()?.gpv}</FieldTextValue>
              </RecordInlineCell>
              <RecordInlineCell
                label="Ticket"
                icon={Moneybag}
                empty={profile()?.ticket == null}
              >
                <FieldTextValue>{profile()?.ticket}</FieldTextValue>
              </RecordInlineCell>
              <RecordInlineCell
                label="Giro de negocio"
                icon={Building2}
                empty={!profile()?.giroNegocio}
              >
                <FieldTextValue>{profile()?.giroNegocio}</FieldTextValue>
              </RecordInlineCell>
              <RecordInlineCell
                label="Banco de abono"
                icon={Moneybag}
                empty={!profile()?.abonoBank}
              >
                <FieldTextValue>{profile()?.abonoBank}</FieldTextValue>
              </RecordInlineCell>
              <RecordInlineCell
                label="Cantidad de POS"
                icon={Package}
                empty={profile()?.posTotal == null}
              >
                <FieldTextValue>{profile()?.posTotal}</FieldTextValue>
              </RecordInlineCell>
            </FieldTable>
          }
        >
          <form onSubmit={(e) => void handleSave(e)}>
            <FieldTable>
              <FieldRow label="Proveedor actual" icon={Building2}>
                <FieldInputValue>
                  <TextInput
                    sizeVariant="sm"
                    value={proveedorActual()}
                    onChange={setProveedorActual}
                    required
                  />
                </FieldInputValue>
              </FieldRow>
              <FieldRow label="Tasa actual" icon={Target}>
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
              <FieldRow label="GPV" icon={Moneybag}>
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
              <FieldRow label="Ticket" icon={Moneybag}>
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
              <FieldRow label="Giro de negocio" icon={Building2}>
                <FieldInputValue>
                  <TextInput
                    sizeVariant="sm"
                    value={giroNegocio()}
                    onChange={setGiroNegocio}
                    required
                  />
                </FieldInputValue>
              </FieldRow>
              <FieldRow label="Banco de abono" icon={Moneybag}>
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
              <FieldRow label="Cantidad de POS" icon={Package}>
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
              {(msg) => <p class={formStyles.error}>{msg()}</p>}
            </Show>

            <RecordDetailSectionActions>
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
            </RecordDetailSectionActions>
          </form>
        </Show>
      </RecordDetailSectionBody>
    </RecordDetailSection>
  );
}
