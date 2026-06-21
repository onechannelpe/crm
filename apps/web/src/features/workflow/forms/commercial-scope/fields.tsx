import { For } from "solid-js";

import Building2 from "~/components/icons/building-2";
import Moneybag from "~/components/icons/moneybag";
import Package from "~/components/icons/package";
import Target from "~/components/icons/target";
import { TextInput } from "~/components/ui/input/text-input";
import { SETTLEMENT_BANKS } from "~/contracts/workflow/vocabulary";
import {
  FieldInputValue,
  FieldRow,
} from "~/features/side-panel/components/field-table";

import { coerceSettlementBank, type CommercialScopeFormValues } from "./values";

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
            value={props.values.currentProvider}
            onChange={(value) => props.onChange("currentProvider", value)}
            required
          />
        </FieldInputValue>
      </FieldRow>
      <FieldRow label="Tasa débito actual" icon={Target}>
        <FieldInputValue>
          <TextInput
            sizeVariant="sm"
            type="number"
            step="0.01"
            min="0"
            value={props.values.currentDebitRate}
            onChange={(value) => props.onChange("currentDebitRate", value)}
            required
          />
        </FieldInputValue>
      </FieldRow>
      <FieldRow label="Tasa crédito actual" icon={Target}>
        <FieldInputValue>
          <TextInput
            sizeVariant="sm"
            type="number"
            step="0.01"
            min="0"
            value={props.values.currentCreditRate}
            onChange={(value) => props.onChange("currentCreditRate", value)}
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
            value={props.values.settlementBank}
            onChange={(e) =>
              props.onChange(
                "settlementBank",
                coerceSettlementBank(e.currentTarget.value),
              )
            }
            required
          >
            <option value="">Seleccionar banco...</option>
            <For each={SETTLEMENT_BANKS}>
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
            value={props.values.posCount}
            onChange={(value) => props.onChange("posCount", value)}
            required
          />
        </FieldInputValue>
      </FieldRow>
    </>
  );
}
