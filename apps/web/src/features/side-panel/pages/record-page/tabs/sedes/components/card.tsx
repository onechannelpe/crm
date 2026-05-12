import { Show } from "solid-js";

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

import type { TabContentProps } from "../../content-props";

export function VenueCard(props: {
  venue: NonNullable<
    Extract<TabContentProps, { mode: "view" }>["data"]["venues"][number]
  >;
}) {
  const venue = () => props.venue;
  return (
    <Widget>
      <WidgetHeader>
        <WidgetTitle text={venue().nombreComercial} />
      </WidgetHeader>
      <WidgetBody>
        <FieldTable>
          <FieldRow>
            <FieldLabel>
              <FieldLabelText>Cantidad POS</FieldLabelText>
            </FieldLabel>
            <FieldInputValue>{venue().posQuantity}</FieldInputValue>
          </FieldRow>
          <FieldRow>
            <FieldLabel>
              <FieldLabelText>Direccion</FieldLabelText>
            </FieldLabel>
            <FieldInputValue>{venue().direccion}</FieldInputValue>
          </FieldRow>
          <Show when={venue().referencia}>
            <FieldRow>
              <FieldLabel>
                <FieldLabelText>Referencia</FieldLabelText>
              </FieldLabel>
              <FieldInputValue>{venue().referencia}</FieldInputValue>
            </FieldRow>
          </Show>
          <FieldRow>
            <FieldLabel>
              <FieldLabelText>Distrito</FieldLabelText>
            </FieldLabel>
            <FieldInputValue>{venue().distrito}</FieldInputValue>
          </FieldRow>
          <FieldRow>
            <FieldLabel>
              <FieldLabelText>Provincia</FieldLabelText>
            </FieldLabel>
            <FieldInputValue>{venue().provincia}</FieldInputValue>
          </FieldRow>
          <FieldRow>
            <FieldLabel>
              <FieldLabelText>Departamento</FieldLabelText>
            </FieldLabel>
            <FieldInputValue>{venue().departamento}</FieldInputValue>
          </FieldRow>
          <Show when={venue().linkUrl}>
            <FieldRow>
              <FieldLabel>
                <FieldLabelText>URL Culqi Link</FieldLabelText>
              </FieldLabel>
              <FieldInputValue>{venue().linkUrl}</FieldInputValue>
            </FieldRow>
          </Show>
          <Show when={venue().onlineUrl}>
            <FieldRow>
              <FieldLabel>
                <FieldLabelText>URL Culqi Online</FieldLabelText>
              </FieldLabel>
              <FieldInputValue>{venue().onlineUrl}</FieldInputValue>
            </FieldRow>
          </Show>
          <Show when={venue().solesAccount} keyed>
            {(soles) => (
              <>
                <FieldRow>
                  <FieldLabel>
                    <FieldLabelText>Banco SOLES</FieldLabelText>
                  </FieldLabel>
                  <FieldInputValue>{soles.banco}</FieldInputValue>
                </FieldRow>
                <FieldRow>
                  <FieldLabel>
                    <FieldLabelText>Tipo cuenta SOLES</FieldLabelText>
                  </FieldLabel>
                  <FieldInputValue>{soles.tipoCuenta}</FieldInputValue>
                </FieldRow>
                <FieldRow>
                  <FieldLabel>
                    <FieldLabelText>Nro cuenta SOLES</FieldLabelText>
                  </FieldLabel>
                  <FieldInputValue>{soles.nroCuenta}</FieldInputValue>
                </FieldRow>
                <Show when={soles.cci}>
                  <FieldRow>
                    <FieldLabel>
                      <FieldLabelText>CCI SOLES</FieldLabelText>
                    </FieldLabel>
                    <FieldInputValue>{soles.cci}</FieldInputValue>
                  </FieldRow>
                </Show>
                <FieldRow>
                  <FieldLabel>
                    <FieldLabelText>Cuenta de abono</FieldLabelText>
                  </FieldLabel>
                  <FieldInputValue>
                    {soles.isSettlement
                      ? `SOLES (${soles.banco})`
                      : `USD (${venue().dollarAccount?.banco ?? "no registrado"})`}
                  </FieldInputValue>
                </FieldRow>
              </>
            )}
          </Show>
          <Show when={venue().dollarAccount}>
            <>
              <FieldRow>
                <FieldLabel>
                  <FieldLabelText>Banco USD</FieldLabelText>
                </FieldLabel>
                <FieldInputValue>
                  {venue().dollarAccount?.banco}
                </FieldInputValue>
              </FieldRow>
              <FieldRow>
                <FieldLabel>
                  <FieldLabelText>Tipo cuenta USD</FieldLabelText>
                </FieldLabel>
                <FieldInputValue>
                  {venue().dollarAccount?.tipoCuenta}
                </FieldInputValue>
              </FieldRow>
              <FieldRow>
                <FieldLabel>
                  <FieldLabelText>Nro cuenta USD</FieldLabelText>
                </FieldLabel>
                <FieldInputValue>
                  {venue().dollarAccount?.nroCuenta}
                </FieldInputValue>
              </FieldRow>
              <Show when={venue().dollarAccount?.cci}>
                <FieldRow>
                  <FieldLabel>
                    <FieldLabelText>CCI USD</FieldLabelText>
                  </FieldLabel>
                  <FieldInputValue>
                    {venue().dollarAccount?.cci}
                  </FieldInputValue>
                </FieldRow>
              </Show>
            </>
          </Show>
          <Show when={!venue().solesAccount}>
            <FieldRow>
              <FieldLabel>
                <FieldLabelText>Cuentas</FieldLabelText>
              </FieldLabel>
              <FieldInputValue>Pendiente de registro</FieldInputValue>
            </FieldRow>
          </Show>
        </FieldTable>
      </WidgetBody>
    </Widget>
  );
}
