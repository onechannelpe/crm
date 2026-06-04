import { For, Show } from "solid-js";

import { Button } from "~/components/ui/input/button";
import { TextInput } from "~/components/ui/input/text-input";
import {
  MODALIDAD_COBRO_KINDS,
  type ModalidadCobro,
  type ProductScope,
} from "~/contracts/workflow/vocabulary";
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

import type { VenueFormState } from "../model/venue-form-state";

import styles from "./venue-form.module.css";

const MODALIDAD_COBRO_LABELS: Record<ModalidadCobro, string> = {
  SUSCRIPCIONES: "Suscripciones",
  ONE_CLIC: "One Click",
  CARGO_UNICO: "Cargo único",
};

function TextFieldRow(props: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "number" | "url";
  min?: string;
  step?: string;
  required?: boolean;
}) {
  return (
    <FieldRow>
      <FieldLabel>
        <FieldLabelText>{props.label}</FieldLabelText>
      </FieldLabel>
      <FieldInputValue>
        <TextInput
          sizeVariant="sm"
          type={props.type}
          min={props.min}
          step={props.step}
          value={props.value}
          onChange={props.onChange}
          required={props.required}
        />
      </FieldInputValue>
    </FieldRow>
  );
}

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
            <TextFieldRow
              label="Nombre comercial"
              value={props.form.nombreComercial()}
              onChange={props.form.setNombreComercial}
              required
            />

            <TextFieldRow
              label="Cantidad POS"
              type="number"
              min="1"
              step="1"
              value={props.form.posQuantity()}
              onChange={props.form.setPosQuantity}
              required
            />

            <TextFieldRow
              label="Dirección"
              value={props.form.direccion()}
              onChange={props.form.setDireccion}
              required
            />

            <TextFieldRow
              label="Referencia"
              value={props.form.referencia()}
              onChange={props.form.setReferencia}
              required
            />

            <TextFieldRow
              label="Distrito"
              value={props.form.distrito()}
              onChange={props.form.setDistrito}
              required
            />

            <TextFieldRow
              label="Provincia"
              value={props.form.provincia()}
              onChange={props.form.setProvincia}
              required
            />

            <TextFieldRow
              label="Departamento"
              value={props.form.departamento()}
              onChange={props.form.setDepartamento}
              required
            />

            <Show when={props.linkScope === "per_venue"}>
              <TextFieldRow
                label="URL Culqi Link"
                type="url"
                value={props.form.linkUrl()}
                onChange={props.form.setLinkUrl}
                required
              />
            </Show>

            <Show when={props.onlineScope === "per_venue"}>
              <TextFieldRow
                label="URL Culqi Online"
                type="url"
                value={props.form.onlineUrl()}
                onChange={props.form.setOnlineUrl}
                required
              />

              <FieldRow>
                <FieldLabel>
                  <FieldLabelText>Modalidad de cobro</FieldLabelText>
                </FieldLabel>
                <FieldInputValue>
                  <div class={styles.radioGroup}>
                    <For each={MODALIDAD_COBRO_KINDS}>
                      {(value) => (
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
                          {MODALIDAD_COBRO_LABELS[value]}
                        </label>
                      )}
                    </For>
                  </div>
                </FieldInputValue>
              </FieldRow>
            </Show>
          </FieldTable>

          <Show when={props.error}>
            {(message) => <p class={styles.error}>{message()}</p>}
          </Show>

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
