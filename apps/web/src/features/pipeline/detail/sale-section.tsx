import { useAction, useNavigate } from "@solidjs/router";
import { Show, createSignal } from "solid-js";

import Building2 from "~/components/icons/building-2";
import Link from "~/components/icons/link";
import Lock from "~/components/icons/lock";
import Moneybag from "~/components/icons/moneybag";
import Package from "~/components/icons/package";
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
import { toAppError } from "~/lib/app-errors";
import {
  SALE_BANK_KINDS,
  type SaleBankKind,
} from "~/pipeline/contracts/lead-schema";

import { createSaleMutation } from "../data/mutations";

import styles from "./sale-section.module.css";

type SaleSectionProps = {
  leadId: number;
};

export function SaleSection(props: SaleSectionProps) {
  const navigate = useNavigate();
  const create = useAction(createSaleMutation);

  const [proveedorActual, setProveedorActual] = createSignal("");
  const [tasaActual, setTasaActual] = createSignal("");
  const [gpv, setGpv] = createSignal("");
  const [ticket, setTicket] = createSignal("");
  const [abono, setAbono] = createSignal("");
  const [cantidadPos, setCantidadPos] = createSignal("");
  const [bankChoice, setBankChoice] = createSignal<SaleBankKind | "">("");
  const [otherBank, setOtherBank] = createSignal("");
  const [nroCuenta, setNroCuenta] = createSignal("");
  const [cci, setCci] = createSignal("");
  const [submitting, setSubmitting] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  function handleBankKindChange(kind: SaleBankKind) {
    setBankChoice(kind);
    if (kind === "BCP") {
      setOtherBank("");
      setCci("");
    }
  }

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    if (!bankChoice()) {
      setError("Selecciona un tipo de banco");
      return;
    }
    const requiresCci = bankChoice() === "OTRO";
    if (requiresCci && !otherBank().trim()) {
      setError("Ingresa el nombre del banco");
      return;
    }
    const banco = requiresCci ? otherBank().trim() : "BCP";
    const normalizedCci = requiresCci ? cci().trim() || null : null;
    if (requiresCci && !normalizedCci) {
      setError("CCI es requerido para bancos distintos a BCP");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await create({
        leadId: props.leadId,
        proveedorActual: proveedorActual(),
        tasaActual: Number(tasaActual()),
        gpv: Number(gpv()),
        ticket: Number(ticket()),
        abono: Number(abono()),
        cantidadPos: Number(cantidadPos()),
        banco,
        nroCuenta: nroCuenta(),
        cci: normalizedCci,
      });
      navigate("/leads");
    } catch (err) {
      setError(toAppError(err, "Error al registrar venta").publicMessage);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section class={styles.section}>
      <p class={styles.eyebrow}>Venta</p>
      <form onSubmit={(e) => void handleSubmit(e)}>
        <FieldTable>
          <FieldRow>
            <FieldLabel>
              <FieldIcon>
                <Building2 size={16} />
              </FieldIcon>
              <FieldLabelText>Proveedor</FieldLabelText>
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
                <Moneybag size={16} />
              </FieldIcon>
              <FieldLabelText>Abono</FieldLabelText>
            </FieldLabel>
            <FieldInputValue>
              <TextInput
                sizeVariant="sm"
                type="number"
                step="0.01"
                min="0"
                value={abono()}
                onChange={setAbono}
                required
              />
            </FieldInputValue>
          </FieldRow>
          <FieldRow>
            <FieldLabel>
              <FieldIcon>
                <Package size={16} />
              </FieldIcon>
              <FieldLabelText>Cantidad POS</FieldLabelText>
            </FieldLabel>
            <FieldInputValue>
              <TextInput
                sizeVariant="sm"
                type="number"
                step="1"
                min="0"
                value={cantidadPos()}
                onChange={setCantidadPos}
                required
              />
            </FieldInputValue>
          </FieldRow>
          <FieldRow>
            <FieldLabel>
              <FieldIcon>
                <Building2 size={16} />
              </FieldIcon>
              <FieldLabelText>Tipo banco</FieldLabelText>
            </FieldLabel>
            <FieldInputValue>
              <div class={styles.bankKindGroup}>
                {SALE_BANK_KINDS.map((kind) => (
                  <label class={styles.bankKindOption}>
                    <input
                      type="radio"
                      name="bank-kind"
                      value={kind}
                      checked={bankChoice() === kind}
                      onChange={() => handleBankKindChange(kind)}
                    />
                    <span>{kind === "BCP" ? "BCP" : "Otro banco"}</span>
                  </label>
                ))}
              </div>
            </FieldInputValue>
          </FieldRow>
          <Show when={bankChoice() === "OTRO"}>
            <FieldRow>
              <FieldLabel>
                <FieldIcon>
                  <Building2 size={16} />
                </FieldIcon>
                <FieldLabelText>Otro banco</FieldLabelText>
              </FieldLabel>
              <FieldInputValue>
                <TextInput
                  sizeVariant="sm"
                  value={otherBank()}
                  onChange={setOtherBank}
                  required
                />
              </FieldInputValue>
            </FieldRow>
          </Show>
          <FieldRow>
            <FieldLabel>
              <FieldIcon>
                <Link size={16} />
              </FieldIcon>
              <FieldLabelText>Nro. cuenta</FieldLabelText>
            </FieldLabel>
            <FieldInputValue>
              <TextInput
                sizeVariant="sm"
                value={nroCuenta()}
                onChange={setNroCuenta}
                required
              />
            </FieldInputValue>
          </FieldRow>
          <Show when={bankChoice() === "OTRO"}>
            <FieldRow>
              <FieldLabel>
                <FieldIcon>
                  <Lock size={16} />
                </FieldIcon>
                <FieldLabelText>CCI</FieldLabelText>
              </FieldLabel>
              <FieldInputValue>
                <TextInput sizeVariant="sm" value={cci()} onChange={setCci} />
              </FieldInputValue>
            </FieldRow>
          </Show>
        </FieldTable>
        {error() && <p class={styles.error}>{error()}</p>}
        <div class={styles.actions}>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            loading={submitting()}
          >
            Registrar venta
          </Button>
        </div>
      </form>
    </section>
  );
}
