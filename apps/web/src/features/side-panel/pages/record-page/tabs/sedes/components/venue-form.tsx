import { For, Show } from "solid-js";

import { Button } from "~/components/ui/input/button";
import { TextInput } from "~/components/ui/input/text-input";
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
import type {
  ModalidadCobro,
  ProductScope,
} from "~/workflow/contracts/lead-schema";

import type { VenueFormState } from "../model/venue-form-state";

import styles from "./venue-form.module.css";

export function VenueForm(props: {
  form: VenueFormState;
  linkScope: ProductScope;
  onlineScope: ProductScope;
  submitting: boolean;
  error: string | null;
  onSubmit: (event: SubmitEvent) => void;
}) {
  return (
    <Widget>
      <WidgetHeader>
        <WidgetTitle text="Agregar sede" />
      </WidgetHeader>
      <WidgetBody>
        <form onSubmit={props.onSubmit}>
          <FieldTable>
            <FieldRow>
              <FieldLabel>
                <FieldLabelText>Nombre comercial</FieldLabelText>
              </FieldLabel>
              <FieldInputValue>
                <TextInput
                  sizeVariant="sm"
                  value={props.form.nombreComercial()}
                  onChange={props.form.setNombreComercial}
                  required
                />
              </FieldInputValue>
            </FieldRow>
            <FieldRow>
              <FieldLabel>
                <FieldLabelText>Cantidad POS</FieldLabelText>
              </FieldLabel>
              <FieldInputValue>
                <TextInput
                  sizeVariant="sm"
                  type="number"
                  min="1"
                  step="1"
                  value={props.form.posQuantity()}
                  onChange={props.form.setPosQuantity}
                  required
                />
              </FieldInputValue>
            </FieldRow>
            <FieldRow>
              <FieldLabel>
                <FieldLabelText>Direccion</FieldLabelText>
              </FieldLabel>
              <FieldInputValue>
                <TextInput
                  sizeVariant="sm"
                  value={props.form.direccion()}
                  onChange={props.form.setDireccion}
                  required
                />
              </FieldInputValue>
            </FieldRow>
            <FieldRow>
              <FieldLabel>
                <FieldLabelText>Referencia</FieldLabelText>
              </FieldLabel>
              <FieldInputValue>
                <TextInput
                  sizeVariant="sm"
                  value={props.form.referencia()}
                  onChange={props.form.setReferencia}
                  required
                />
              </FieldInputValue>
            </FieldRow>
            <FieldRow>
              <FieldLabel>
                <FieldLabelText>Distrito</FieldLabelText>
              </FieldLabel>
              <FieldInputValue>
                <TextInput
                  sizeVariant="sm"
                  value={props.form.distrito()}
                  onChange={props.form.setDistrito}
                  required
                />
              </FieldInputValue>
            </FieldRow>
            <FieldRow>
              <FieldLabel>
                <FieldLabelText>Provincia</FieldLabelText>
              </FieldLabel>
              <FieldInputValue>
                <TextInput
                  sizeVariant="sm"
                  value={props.form.provincia()}
                  onChange={props.form.setProvincia}
                  required
                />
              </FieldInputValue>
            </FieldRow>
            <FieldRow>
              <FieldLabel>
                <FieldLabelText>Departamento</FieldLabelText>
              </FieldLabel>
              <FieldInputValue>
                <TextInput
                  sizeVariant="sm"
                  value={props.form.departamento()}
                  onChange={props.form.setDepartamento}
                  required
                />
              </FieldInputValue>
            </FieldRow>
            <Show when={props.linkScope === "per_venue"}>
              <FieldRow>
                <FieldLabel>
                  <FieldLabelText>URL Culqi Link</FieldLabelText>
                </FieldLabel>
                <FieldInputValue>
                  <TextInput
                    sizeVariant="sm"
                    type="url"
                    value={props.form.linkUrl()}
                    onChange={props.form.setLinkUrl}
                    required
                  />
                </FieldInputValue>
              </FieldRow>
            </Show>
            <Show when={props.onlineScope === "per_venue"}>
              <FieldRow>
                <FieldLabel>
                  <FieldLabelText>URL Culqi Online</FieldLabelText>
                </FieldLabel>
                <FieldInputValue>
                  <TextInput
                    sizeVariant="sm"
                    type="url"
                    value={props.form.onlineUrl()}
                    onChange={props.form.setOnlineUrl}
                    required
                  />
                </FieldInputValue>
              </FieldRow>
              <FieldRow>
                <FieldLabel>
                  <FieldLabelText>Modalidad de Cobro</FieldLabelText>
                </FieldLabel>
                <FieldInputValue>
                  <div class={styles.radioGroup}>
                    <For
                      each={
                        [
                          ["SUSCRIPCIONES", "Suscripciones"],
                          ["ONE_CLIC", "One Click"],
                          ["CARGO_UNICO", "Cargo Unico"],
                        ] as [ModalidadCobro, string][]
                      }
                    >
                      {([value, label]) => (
                        <label>
                          <input
                            type="radio"
                            name="onlineModalidad"
                            value={value}
                            checked={props.form.onlineModalidad() === value}
                            onChange={() =>
                              props.form.setOnlineModalidad(value)
                            }
                          />{" "}
                          {label}
                        </label>
                      )}
                    </For>
                  </div>
                </FieldInputValue>
              </FieldRow>
            </Show>
          </FieldTable>

          <Show when={props.error}>{(message) => <p>{message()}</p>}</Show>
          <div class={styles.actions}>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={props.submitting}
            >
              Guardar sede
            </Button>
          </div>
        </form>
      </WidgetBody>
    </Widget>
  );
}
