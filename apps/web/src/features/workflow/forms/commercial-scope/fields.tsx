import { For } from "solid-js";

import Building2 from "~/components/icons/building-2";
import Moneybag from "~/components/icons/moneybag";
import Package from "~/components/icons/package";
import Target from "~/components/icons/target";
import { TextInput } from "~/components/ui/input/text-input";
import { ABONO_BANKS } from "~/contracts/workflow/vocabulary";
import {
  FieldInputValue,
  FieldRow,
} from "~/features/side-panel/components/field-table";

import { coerceAbonoBank, type CommercialScopeFormValues } from "./values";

// Shared by the create draft and inline scope corrections. Renders rows only;
// the parent owns the surrounding FieldTable or form.
export function CommercialScopeFields(props: {
  values: CommercialScopeFormValues;
  onChange: <K extends keyof CommercialScopeFormValues>(
    key: K,
    value: CommercialScopeFormValues[K],
  ) => void;
}) {
  return (
    <>
      <FieldRow label="Proveedor actual" icon={Building2}>
        <FieldInputValue>
          <TextInput
            sizeVariant="sm"
            value={props.values.proveedorActual}
            onChange={(value) => props.onChange("proveedorActual", value)}
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
            value={props.values.tasaActual}
            onChange={(value) => props.onChange("tasaActual", value)}
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
            value={props.values.gpv}
            onChange={(value) => props.onChange("gpv", value)}
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
            value={props.values.ticket}
            onChange={(value) => props.onChange("ticket", value)}
            required
          />
        </FieldInputValue>
      </FieldRow>
      <FieldRow label="Giro de negocio" icon={Building2}>
        <FieldInputValue>
          <TextInput
            sizeVariant="sm"
            value={props.values.giroNegocio}
            onChange={(value) => props.onChange("giroNegocio", value)}
            required
          />
        </FieldInputValue>
      </FieldRow>
      <FieldRow label="Banco de abono" icon={Moneybag}>
        <FieldInputValue>
          <select
            value={props.values.abonoBank}
            onChange={(e) =>
              props.onChange(
                "abonoBank",
                coerceAbonoBank(e.currentTarget.value),
              )
            }
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
            value={props.values.posTotal}
            onChange={(value) => props.onChange("posTotal", value)}
            required
          />
        </FieldInputValue>
      </FieldRow>
    </>
  );
}
