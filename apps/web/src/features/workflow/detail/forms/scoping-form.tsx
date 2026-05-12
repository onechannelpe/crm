import { useAction } from "@solidjs/router";
import { Show, createSignal } from "solid-js";

import Building2 from "~/components/icons/building-2";
import Moneybag from "~/components/icons/moneybag";
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
import {
  Widget,
  WidgetBody,
  WidgetHeader,
  WidgetTitle,
} from "~/features/side-panel/components/widget-card";
import { toAppError } from "~/lib/app-errors";
import type { LeadDetailProfileView } from "~/server/workflow/application/queries/views/lead-detail";
import type {
  ModalidadCobro,
  ProductScope,
} from "~/workflow/contracts/lead-schema";

import { completeScopingMutation } from "../../data/mutations";

import styles from "./scoping-form.module.css";

export function ScopingForm(props: {
  leadId: string;
  initialValues?: LeadDetailProfileView;
}) {
  const complete = useAction(completeScopingMutation);

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

  const initialLinkScope = props.initialValues?.linkScope ?? "none";
  const initialOnlineScope = props.initialValues?.onlineScope ?? "none";

  const [linkEnabled, setLinkEnabled] = createSignal(
    initialLinkScope !== "none",
  );
  const [linkScope, setLinkScope] = createSignal<"shared" | "per_venue">(
    initialLinkScope === "per_venue" ? "per_venue" : "shared",
  );
  const [linkUrl, setLinkUrl] = createSignal(
    props.initialValues?.linkUrl ?? "",
  );

  const [onlineEnabled, setOnlineEnabled] = createSignal(
    initialOnlineScope !== "none",
  );
  const [onlineScope, setOnlineScope] = createSignal<"shared" | "per_venue">(
    initialOnlineScope === "per_venue" ? "per_venue" : "shared",
  );
  const [onlineUrl, setOnlineUrl] = createSignal(
    props.initialValues?.onlineUrl ?? "",
  );
  const [onlineModalidad, setOnlineModalidad] = createSignal<
    ModalidadCobro | ""
  >(props.initialValues?.onlineModalidad ?? "");

  const [submitting, setSubmitting] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  function resolvedLinkScope(): ProductScope {
    return linkEnabled() ? linkScope() : "none";
  }

  function resolvedOnlineScope(): ProductScope {
    return onlineEnabled() ? onlineScope() : "none";
  }

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
    const computedLinkScope = resolvedLinkScope();
    const computedOnlineScope = resolvedOnlineScope();
    const url = linkUrl().trim();
    const onUrl = onlineUrl().trim();
    const modalidad = onlineModalidad();

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

    if (computedLinkScope === "shared" && !url) {
      setError(
        "URL de Culqi Link es requerida cuando la modalidad es compartida",
      );
      return;
    }

    if (computedOnlineScope === "shared" && !onUrl) {
      setError(
        "URL de Culqi Online es requerida cuando la modalidad es compartida",
      );
      return;
    }

    if (computedOnlineScope === "shared" && !modalidad) {
      setError(
        "Modalidad de cobro es obligatoria cuando Culqi Online es compartido",
      );
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
        linkScope: computedLinkScope,
        linkUrl: computedLinkScope === "shared" ? url : null,
        onlineScope: computedOnlineScope,
        onlineUrl: computedOnlineScope === "shared" ? onUrl : null,
        onlineModalidad:
          computedOnlineScope === "shared" && modalidad ? modalidad : null,
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
          <div class={styles.section}>
            <div class={styles.sectionTitle}>Representante Legal</div>
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

          <div class={styles.section}>
            <div class={styles.sectionTitle}>Datos Comerciales</div>
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
            </FieldTable>
          </div>

          <div class={styles.section}>
            <div class={styles.sectionTitle}>Canal Digital</div>
            <FieldTable>
              <FieldRow>
                <FieldLabel>
                  <FieldLabelText>CulqiLink</FieldLabelText>
                </FieldLabel>
                <FieldInputValue>
                  <label>
                    <input
                      type="checkbox"
                      checked={linkEnabled()}
                      onChange={(e) => {
                        setLinkEnabled(e.currentTarget.checked);
                      }}
                    />{" "}
                    Activar CulqiLink
                  </label>
                </FieldInputValue>
              </FieldRow>
              <Show when={linkEnabled()}>
                <FieldRow>
                  <FieldLabel>
                    <FieldLabelText>Modalidad Link</FieldLabelText>
                  </FieldLabel>
                  <FieldInputValue>
                    <label class={styles.inlineOption}>
                      <input
                        type="radio"
                        name="linkScope"
                        checked={linkScope() === "shared"}
                        onChange={() => setLinkScope("shared")}
                      />{" "}
                      URL compartida
                    </label>
                    <label>
                      <input
                        type="radio"
                        name="linkScope"
                        checked={linkScope() === "per_venue"}
                        onChange={() => setLinkScope("per_venue")}
                      />{" "}
                      URL por local
                    </label>
                  </FieldInputValue>
                </FieldRow>
                <Show when={linkScope() === "shared"}>
                  <FieldRow>
                    <FieldLabel>
                      <FieldLabelText>URL CulqiLink</FieldLabelText>
                    </FieldLabel>
                    <FieldInputValue>
                      <TextInput
                        sizeVariant="sm"
                        type="url"
                        value={linkUrl()}
                        onChange={setLinkUrl}
                        required
                      />
                    </FieldInputValue>
                  </FieldRow>
                </Show>
              </Show>

              <FieldRow>
                <FieldLabel>
                  <FieldLabelText>CulqiOnline</FieldLabelText>
                </FieldLabel>
                <FieldInputValue>
                  <label>
                    <input
                      type="checkbox"
                      checked={onlineEnabled()}
                      onChange={(e) => {
                        setOnlineEnabled(e.currentTarget.checked);
                        if (!e.currentTarget.checked) setOnlineModalidad("");
                      }}
                    />{" "}
                    Activar CulqiOnline
                  </label>
                </FieldInputValue>
              </FieldRow>
              <Show when={onlineEnabled()}>
                <FieldRow>
                  <FieldLabel>
                    <FieldLabelText>Modalidad Online</FieldLabelText>
                  </FieldLabel>
                  <FieldInputValue>
                    <label class={styles.inlineOption}>
                      <input
                        type="radio"
                        name="onlineScope"
                        checked={onlineScope() === "shared"}
                        onChange={() => setOnlineScope("shared")}
                      />{" "}
                      URL compartida
                    </label>
                    <label>
                      <input
                        type="radio"
                        name="onlineScope"
                        checked={onlineScope() === "per_venue"}
                        onChange={() => {
                          setOnlineScope("per_venue");
                          setOnlineModalidad("");
                        }}
                      />{" "}
                      URL por local
                    </label>
                  </FieldInputValue>
                </FieldRow>
                <Show when={onlineScope() === "shared"}>
                  <FieldRow>
                    <FieldLabel>
                      <FieldLabelText>URL Culqi Online</FieldLabelText>
                    </FieldLabel>
                    <FieldInputValue>
                      <TextInput
                        sizeVariant="sm"
                        type="url"
                        value={onlineUrl()}
                        onChange={setOnlineUrl}
                        required
                      />
                    </FieldInputValue>
                  </FieldRow>
                  <FieldRow>
                    <FieldLabel>
                      <FieldLabelText>Modalidad de cobro</FieldLabelText>
                    </FieldLabel>
                    <FieldInputValue>
                      <div class={styles.radioGroup}>
                        <label>
                          <input
                            type="radio"
                            name="onlineModalidad"
                            value="SUSCRIPCIONES"
                            checked={onlineModalidad() === "SUSCRIPCIONES"}
                            onChange={() => setOnlineModalidad("SUSCRIPCIONES")}
                          />{" "}
                          Suscripciones
                        </label>
                        <label>
                          <input
                            type="radio"
                            name="onlineModalidad"
                            value="ONE_CLIC"
                            checked={onlineModalidad() === "ONE_CLIC"}
                            onChange={() => setOnlineModalidad("ONE_CLIC")}
                          />{" "}
                          One Click
                        </label>
                        <label>
                          <input
                            type="radio"
                            name="onlineModalidad"
                            value="CARGO_UNICO"
                            checked={onlineModalidad() === "CARGO_UNICO"}
                            onChange={() => setOnlineModalidad("CARGO_UNICO")}
                          />{" "}
                          Cargo único
                        </label>
                      </div>
                    </FieldInputValue>
                  </FieldRow>
                </Show>
              </Show>
            </FieldTable>
          </div>

          <Show when={error()}>
            {(msg) => <p class={styles.error}>{msg()}</p>}
          </Show>
          <div class={styles.actions}>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={submitting()}
            >
              Guardar y continuar
            </Button>
          </div>
        </form>
      </WidgetBody>
    </Widget>
  );
}
