import { For, Show } from "solid-js";

import { Button } from "~/components/ui/input/button";
import { TextInput } from "~/components/ui/input/text-input";
import { BankPicker } from "~/components/ui/pickers/bank-picker";
import {
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
import { ACCOUNT_TYPE_KINDS } from "~/contracts/workflow";

import type { AccountsFormState } from "../model/accounts-form-state";

export function AccountsForm(props: {
  venueName: string;
  form: AccountsFormState;
  submitting: boolean;
  error: string | null;
  onSubmit: (event: SubmitEvent) => void;
}) {
  return (
    <Widget>
      <WidgetHeader>
        <WidgetTitle text={`Cuentas: ${props.venueName}`} />
      </WidgetHeader>
      <WidgetBody>
        <form onSubmit={props.onSubmit}>
          <FieldTable>
            <FieldRow>
              <FieldLabel>
                <FieldLabelText>Banco SOLES</FieldLabelText>
              </FieldLabel>
              <FieldInputValue>
                <button
                  type="button"
                  onClick={() =>
                    props.form.setShowBancoSolesPicker(
                      !props.form.showBancoSolesPicker(),
                    )
                  }
                >
                  {props.form.bancoSoles() || "Seleccionar"}
                </button>
                <Show when={props.form.showBancoSolesPicker()}>
                  <BankPicker
                    onSelect={props.form.setBancoSoles}
                    onClose={() => props.form.setShowBancoSolesPicker(false)}
                  />
                </Show>
              </FieldInputValue>
            </FieldRow>
            <FieldRow>
              <FieldLabel>
                <FieldLabelText>Tipo cuenta SOLES</FieldLabelText>
              </FieldLabel>
              <FieldInputValue>
                <div>
                  <For each={ACCOUNT_TYPE_KINDS}>
                    {(kind) => (
                      <label>
                        <input
                          type="radio"
                          name="tipoCuentaSoles"
                          checked={props.form.tipoCuentaSoles() === kind}
                          onChange={() => props.form.setTipoCuentaSoles(kind)}
                        />
                        {kind}
                      </label>
                    )}
                  </For>
                </div>
              </FieldInputValue>
            </FieldRow>
            <FieldRow>
              <FieldLabel>
                <FieldLabelText>Nro cuenta SOLES</FieldLabelText>
              </FieldLabel>
              <FieldInputValue>
                <TextInput
                  sizeVariant="sm"
                  value={props.form.nroCuentaSoles()}
                  onChange={props.form.setNroCuentaSoles}
                  required
                />
              </FieldInputValue>
            </FieldRow>
            <Show when={props.form.requiresCciSoles()}>
              <FieldRow>
                <FieldLabel>
                  <FieldLabelText>CCI SOLES</FieldLabelText>
                </FieldLabel>
                <FieldInputValue>
                  <TextInput
                    sizeVariant="sm"
                    value={props.form.cciSoles()}
                    onChange={props.form.setCciSoles}
                    required={props.form.requiresCciSoles()}
                  />
                </FieldInputValue>
              </FieldRow>
            </Show>

            <FieldRow>
              <FieldLabel>
                <FieldLabelText>Cuenta en dolares</FieldLabelText>
              </FieldLabel>
              <FieldInputValue>
                <label>
                  <input
                    type="checkbox"
                    checked={props.form.usarDolares()}
                    onChange={(event) => {
                      const checked = event.currentTarget.checked;
                      props.form.setUsarDolares(checked);
                      if (!checked) {
                        props.form.setSettlementCurrency("PEN");
                      }
                    }}
                  />
                  Agregar cuenta USD
                </label>
              </FieldInputValue>
            </FieldRow>
            <Show when={props.form.usarDolares()}>
              <FieldRow>
                <FieldLabel>
                  <FieldLabelText>Banco USD</FieldLabelText>
                </FieldLabel>
                <FieldInputValue>
                  <button
                    type="button"
                    onClick={() =>
                      props.form.setShowBancoDolaresPicker(
                        !props.form.showBancoDolaresPicker(),
                      )
                    }
                  >
                    {props.form.bancoDolares() || "Seleccionar"}
                  </button>
                  <Show when={props.form.showBancoDolaresPicker()}>
                    <BankPicker
                      onSelect={props.form.setBancoDolares}
                      onClose={() =>
                        props.form.setShowBancoDolaresPicker(false)
                      }
                    />
                  </Show>
                </FieldInputValue>
              </FieldRow>
              <FieldRow>
                <FieldLabel>
                  <FieldLabelText>Tipo cuenta USD</FieldLabelText>
                </FieldLabel>
                <FieldInputValue>
                  <div>
                    <For each={ACCOUNT_TYPE_KINDS}>
                      {(kind) => (
                        <label>
                          <input
                            type="radio"
                            name="tipoCuentaDolares"
                            checked={props.form.tipoCuentaDolares() === kind}
                            onChange={() =>
                              props.form.setTipoCuentaDolares(kind)
                            }
                          />
                          {kind}
                        </label>
                      )}
                    </For>
                  </div>
                </FieldInputValue>
              </FieldRow>
              <FieldRow>
                <FieldLabel>
                  <FieldLabelText>Nro cuenta USD</FieldLabelText>
                </FieldLabel>
                <FieldInputValue>
                  <TextInput
                    sizeVariant="sm"
                    value={props.form.nroCuentaDolares()}
                    onChange={props.form.setNroCuentaDolares}
                    required={props.form.usarDolares()}
                  />
                </FieldInputValue>
              </FieldRow>
              <Show when={props.form.requiresCciDolares()}>
                <FieldRow>
                  <FieldLabel>
                    <FieldLabelText>CCI USD</FieldLabelText>
                  </FieldLabel>
                  <FieldInputValue>
                    <TextInput
                      sizeVariant="sm"
                      value={props.form.cciDolares()}
                      onChange={props.form.setCciDolares}
                      required={props.form.requiresCciDolares()}
                    />
                  </FieldInputValue>
                </FieldRow>
              </Show>
            </Show>

            <FieldRow>
              <FieldLabel>
                <FieldLabelText>Cuenta de abono</FieldLabelText>
              </FieldLabel>
              <FieldInputValue>
                <label>
                  <input
                    type="radio"
                    name="settlementCurrency"
                    checked={props.form.settlementCurrency() === "PEN"}
                    onChange={() => props.form.setSettlementCurrency("PEN")}
                  />
                  SOLES
                </label>
                <Show when={props.form.usarDolares()}>
                  <label>
                    <input
                      type="radio"
                      name="settlementCurrency"
                      checked={props.form.settlementCurrency() === "USD"}
                      onChange={() => props.form.setSettlementCurrency("USD")}
                    />
                    USD
                  </label>
                </Show>
              </FieldInputValue>
            </FieldRow>
          </FieldTable>

          <Show when={props.error}>{(message) => <p>{message()}</p>}</Show>
          <div
            style={{
              display: "flex",
              "justify-content": "flex-end",
              "margin-top": "12px",
            }}
          >
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={props.submitting}
            >
              Guardar cuentas
            </Button>
          </div>
        </form>
      </WidgetBody>
    </Widget>
  );
}
