import { useAction } from "@solidjs/router";
import { createSignal, Show } from "solid-js";

import Building2 from "~/components/icons/building-2";
import Moneybag from "~/components/icons/moneybag";
import Package from "~/components/icons/package";
import Target from "~/components/icons/target";
import { Button } from "~/components/ui/input/button";
import { TextInput } from "~/components/ui/input/text-input";
import { BankPicker } from "~/components/ui/pickers/bank-picker";
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
import type { LeadDetailCommercialInputView } from "~/server/workflow/application/queries/views/lead-detail";
import type {
  CulqiProductKind,
  ModalidadCobro,
} from "~/workflow/contracts/lead-schema";

import { completeCommercialInputMutation } from "../../data/mutations";

import styles from "./commercial-input.module.css";

export function CommercialInputSection(props: {
  leadId: string;
  initialValues?: LeadDetailCommercialInputView;
}) {
  const complete = useAction(completeCommercialInputMutation);

  const [repLegalNombres, setRepLegalNombres] = createSignal(
    props.initialValues?.repLegalNombres ?? "",
  );
  const [repLegalApellidoPaterno, setRepLegalApellidoPaterno] = createSignal(
    props.initialValues?.repLegalApellidoPaterno ?? "",
  );
  const [repLegalApellidoMaterno, setRepLegalApellidoMaterno] = createSignal(
    props.initialValues?.repLegalApellidoMaterno ?? "",
  );
  const [repLegalDni, setRepLegalDni] = createSignal(
    props.initialValues?.repLegalDni ?? "",
  );
  const [repLegalTelefono, setRepLegalTelefono] = createSignal(
    props.initialValues?.repLegalTelefono ?? "",
  );
  const [repLegalEmail, setRepLegalEmail] = createSignal(
    props.initialValues?.repLegalEmail ?? "",
  );

  const [giroNegocio, setGiroNegocio] = createSignal(
    props.initialValues?.giroNegocio ?? "",
  );
  const [proveedorActual, setProveedorActual] = createSignal(
    props.initialValues?.proveedorActual ?? "",
  );
  const [tasaActual, setTasaActual] = createSignal(
    props.initialValues?.tasaActual?.toString() ?? "",
  );
  const [gpv, setGpv] = createSignal(
    props.initialValues?.gpv?.toString() ?? "",
  );
  const [ticket, setTicket] = createSignal(
    props.initialValues?.ticket?.toString() ?? "",
  );

  const [tipoProducto, setTipoProducto] = createSignal<CulqiProductKind | "">(
    props.initialValues?.tipoProducto ?? "",
  );
  const [urlCliente, setUrlCliente] = createSignal(
    props.initialValues?.urlCliente ?? "",
  );
  const [modalidadCobro, setModalidadCobro] = createSignal<ModalidadCobro | "">(
    props.initialValues?.modalidadCobro ?? "",
  );

  const [submitting, setSubmitting] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();

    const nombre = repLegalNombres().trim();
    const apellido1 = repLegalApellidoPaterno().trim();
    const apellido2 = repLegalApellidoMaterno().trim();
    const dni = repLegalDni().trim();
    const telefono = repLegalTelefono().trim();
    const email = repLegalEmail().trim();
    const giro = giroNegocio().trim();
    const proveedor = proveedorActual().trim();
    const tasa = Number(tasaActual());
    const gpvVal = Number(gpv());
    const ticketVal = Number(ticket());
    const product = tipoProducto();
    const url = urlCliente().trim();
    const modalidad = modalidadCobro();

    if (
      !nombre ||
      !apellido1 ||
      !apellido2 ||
      !dni ||
      !telefono ||
      !email ||
      !giro ||
      !proveedor
    ) {
      setError("Todos los campos obligatorios deben completarse");
      return;
    }

    if (!product) {
      setError("Selecciona un tipo de producto");
      return;
    }

    if ((product === "CULQI_LINK" || product === "CULQI_ONLINE") && !url) {
      setError("URL del cliente es requerida para este tipo de producto");
      return;
    }

    if (
      (product === "CULQI_LINK" || product === "CULQI_ONLINE") &&
      !modalidad
    ) {
      setError("Modalidad de cobro es requerida para este tipo de producto");
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      await complete({
        leadId: props.leadId,
        repLegalNombres: nombre,
        repLegalApellidoPaterno: apellido1,
        repLegalApellidoMaterno: apellido2,
        repLegalDni: dni,
        repLegalTelefono: telefono,
        repLegalEmail: email,
        giroNegocio: giro,
        proveedorActual: proveedor,
        tasaActual: tasa,
        gpv: gpvVal,
        ticket: ticketVal,
        tipoProducto: product,
        urlCliente: url || null,
        modalidadCobro: modalidad || null,
      });
    } catch (err) {
      setError(toAppError(err, "Error al guardar").publicMessage);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Widget>
      <WidgetHeader>
        <WidgetTitle text="Datos comerciales" />
      </WidgetHeader>
      <WidgetBody>
        <form onSubmit={(e) => void handleSubmit(e)}>
          <div style={{ "margin-bottom": "16px" }}>
            <div style={{ "font-weight": "600", "margin-bottom": "8px" }}>
              Representante Legal
            </div>
            <FieldTable>
              <FieldRow>
                <FieldLabel>
                  <FieldLabelText>Nombres</FieldLabelText>
                </FieldLabel>
                <FieldInputValue>
                  <TextInput
                    sizeVariant="sm"
                    value={repLegalNombres()}
                    onChange={setRepLegalNombres}
                    required
                  />
                </FieldInputValue>
              </FieldRow>
              <FieldRow>
                <FieldLabel>
                  <FieldLabelText>Primer apellido</FieldLabelText>
                </FieldLabel>
                <FieldInputValue>
                  <TextInput
                    sizeVariant="sm"
                    value={repLegalApellidoPaterno()}
                    onChange={setRepLegalApellidoPaterno}
                    required
                  />
                </FieldInputValue>
              </FieldRow>
              <FieldRow>
                <FieldLabel>
                  <FieldLabelText>Segundo apellido</FieldLabelText>
                </FieldLabel>
                <FieldInputValue>
                  <TextInput
                    sizeVariant="sm"
                    value={repLegalApellidoMaterno()}
                    onChange={setRepLegalApellidoMaterno}
                    required
                  />
                </FieldInputValue>
              </FieldRow>
              <FieldRow>
                <FieldLabel>
                  <FieldLabelText>DNI</FieldLabelText>
                </FieldLabel>
                <FieldInputValue>
                  <TextInput
                    sizeVariant="sm"
                    value={repLegalDni()}
                    onChange={setRepLegalDni}
                    maxLength={8}
                    required
                  />
                </FieldInputValue>
              </FieldRow>
              <FieldRow>
                <FieldLabel>
                  <FieldLabelText>Teléfono/Celular</FieldLabelText>
                </FieldLabel>
                <FieldInputValue>
                  <TextInput
                    sizeVariant="sm"
                    value={repLegalTelefono()}
                    onChange={setRepLegalTelefono}
                    required
                  />
                </FieldInputValue>
              </FieldRow>
              <FieldRow>
                <FieldLabel>
                  <FieldLabelText>Email</FieldLabelText>
                </FieldLabel>
                <FieldInputValue>
                  <TextInput
                    sizeVariant="sm"
                    type="email"
                    value={repLegalEmail()}
                    onChange={setRepLegalEmail}
                    required
                  />
                </FieldInputValue>
              </FieldRow>
            </FieldTable>
          </div>

          <div style={{ "margin-bottom": "16px" }}>
            <div style={{ "font-weight": "600", "margin-bottom": "8px" }}>
              Datos Comerciales
            </div>
            <FieldTable>
              <FieldRow>
                <FieldLabel>
                  <FieldIcon>
                    <Building2 size={16} />
                  </FieldIcon>
                  <FieldLabelText>Proveedor Actual</FieldLabelText>
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
                  <FieldLabelText>Tasa Actual</FieldLabelText>
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
                  <FieldLabelText>Giro de Negocio</FieldLabelText>
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
            </FieldTable>
          </div>

          <div style={{ "margin-bottom": "16px" }}>
            <div style={{ "font-weight": "600", "margin-bottom": "8px" }}>
              Tipo de Producto
            </div>
            <FieldTable>
              <FieldRow>
                <FieldLabel>
                  <FieldIcon>
                    <Package size={16} />
                  </FieldIcon>
                  <FieldLabelText>Producto</FieldLabelText>
                </FieldLabel>
                <FieldInputValue>
                  <div
                    style={{
                      display: "flex",
                      "flex-direction": "column",
                      gap: "8px",
                    }}
                  >
                    <label>
                      <input
                        type="radio"
                        name="tipoProducto"
                        value="CULQI_FULL"
                        checked={tipoProducto() === "CULQI_FULL"}
                        onChange={() => setTipoProducto("CULQI_FULL")}
                      />
                      CulqiFull (POS)
                    </label>
                    <label>
                      <input
                        type="radio"
                        name="tipoProducto"
                        value="CULQI_LINK"
                        checked={tipoProducto() === "CULQI_LINK"}
                        onChange={() => setTipoProducto("CULQI_LINK")}
                      />
                      CulqiLink (Link de pago)
                    </label>
                    <label>
                      <input
                        type="radio"
                        name="tipoProducto"
                        value="CULQI_ONLINE"
                        checked={tipoProducto() === "CULQI_ONLINE"}
                        onChange={() => setTipoProducto("CULQI_ONLINE")}
                      />
                      CulqiOnline (Pasarela de pagos)
                    </label>
                  </div>
                </FieldInputValue>
              </FieldRow>

              <Show
                when={
                  tipoProducto() === "CULQI_LINK" ||
                  tipoProducto() === "CULQI_ONLINE"
                }
              >
                <FieldRow>
                  <FieldLabel>
                    <FieldLabelText>URL del Cliente</FieldLabelText>
                  </FieldLabel>
                  <FieldInputValue>
                    <TextInput
                      sizeVariant="sm"
                      type="url"
                      value={urlCliente()}
                      onChange={setUrlCliente}
                      required
                    />
                  </FieldInputValue>
                </FieldRow>

                <FieldRow>
                  <FieldLabel>
                    <FieldLabelText>Modalidad de Cobro</FieldLabelText>
                  </FieldLabel>
                  <FieldInputValue>
                    <div
                      style={{
                        display: "flex",
                        "flex-direction": "column",
                        gap: "8px",
                      }}
                    >
                      <label>
                        <input
                          type="radio"
                          name="modalidadCobro"
                          value="SUSCRIPCIONES"
                          checked={modalidadCobro() === "SUSCRIPCIONES"}
                          onChange={() => setModalidadCobro("SUSCRIPCIONES")}
                        />
                        Suscripciones
                      </label>
                      <label>
                        <input
                          type="radio"
                          name="modalidadCobro"
                          value="ONE_CLIC"
                          checked={modalidadCobro() === "ONE_CLIC"}
                          onChange={() => setModalidadCobro("ONE_CLIC")}
                        />
                        One Click
                      </label>
                      <label>
                        <input
                          type="radio"
                          name="modalidadCobro"
                          value="CARGO_UNICO"
                          checked={modalidadCobro() === "CARGO_UNICO"}
                          onChange={() => setModalidadCobro("CARGO_UNICO")}
                        />
                        Cargo Único
                      </label>
                    </div>
                  </FieldInputValue>
                </FieldRow>
              </Show>
            </FieldTable>
          </div>

          {error() && <p class={styles.error}>{error()}</p>}
          <div class={styles.actions}>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={submitting()}
            >
              Guardar datos comerciales
            </Button>
          </div>
        </form>
      </WidgetBody>
    </Widget>
  );
}
