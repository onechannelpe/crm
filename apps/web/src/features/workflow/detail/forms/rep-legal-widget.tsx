import { useAction } from "@solidjs/router";
import { Show, createSignal } from "solid-js";

import User from "~/components/icons/user";
import { Button } from "~/components/ui/input/button";
import { TextInput } from "~/components/ui/input/text-input";
import type { LeadDetailView } from "~/contracts/workflow/views";
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

import { recordRepLegalMutation } from "../../data/mutations";

export function RepLegalWidget(props: {
  leadId: string;
  data: LeadDetailView;
}) {
  const record = useAction(recordRepLegalMutation);

  const canEdit = () => props.data.lead.stage === "SETUP_EXECUTION";
  const repLegal = () => props.data.repLegal;

  const [nombres, setNombres] = createSignal(repLegal()?.nombres ?? "");
  const [apellidoPaterno, setApellidoPaterno] = createSignal(
    repLegal()?.apellidoPaterno ?? "",
  );
  const [apellidoMaterno, setApellidoMaterno] = createSignal(
    repLegal()?.apellidoMaterno ?? "",
  );
  const [dni, setDni] = createSignal(repLegal()?.dni ?? "");
  const [telefono, setTelefono] = createSignal(repLegal()?.telefono ?? "");
  const [email, setEmail] = createSignal(repLegal()?.email ?? "");

  const [saving, setSaving] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  async function handleSave(e: SubmitEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await record({
        leadId: props.leadId,
        nombres: nombres().trim(),
        apellidoPaterno: apellidoPaterno().trim(),
        apellidoMaterno: apellidoMaterno().trim(),
        dni: dni().trim(),
        telefono: telefono().trim(),
        email: email().trim(),
      });
    } catch (err) {
      setError(
        toAppError(err, "Error al guardar representante legal").publicMessage,
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Widget>
      <WidgetHeader>
        <WidgetTitle text="Representante legal" />
      </WidgetHeader>
      <WidgetBody>
        <Show
          when={canEdit()}
          fallback={
            <Show
              when={repLegal()}
              fallback={
                <div style={{ padding: "8px", color: "#666" }}>
                  Sin datos de representante legal
                </div>
              }
            >
              {(rl) => (
                <FieldTable>
                  <FieldRow>
                    <FieldLabel>
                      <FieldLabelText>Nombres</FieldLabelText>
                    </FieldLabel>
                    <span>{rl().nombres}</span>
                  </FieldRow>
                  <FieldRow>
                    <FieldLabel>
                      <FieldLabelText>Apellido paterno</FieldLabelText>
                    </FieldLabel>
                    <span>{rl().apellidoPaterno}</span>
                  </FieldRow>
                  <FieldRow>
                    <FieldLabel>
                      <FieldLabelText>Apellido materno</FieldLabelText>
                    </FieldLabel>
                    <span>{rl().apellidoMaterno}</span>
                  </FieldRow>
                  <FieldRow>
                    <FieldLabel>
                      <FieldLabelText>DNI</FieldLabelText>
                    </FieldLabel>
                    <span>{rl().dni}</span>
                  </FieldRow>
                  <FieldRow>
                    <FieldLabel>
                      <FieldLabelText>Telefono</FieldLabelText>
                    </FieldLabel>
                    <span>{rl().telefono ?? "—"}</span>
                  </FieldRow>
                  <FieldRow>
                    <FieldLabel>
                      <FieldLabelText>Email</FieldLabelText>
                    </FieldLabel>
                    <span>{rl().email ?? "—"}</span>
                  </FieldRow>
                </FieldTable>
              )}
            </Show>
          }
        >
          <form onSubmit={(e) => void handleSave(e)}>
            <FieldTable>
              <FieldRow>
                <FieldLabel>
                  <FieldIcon>
                    <User size={16} />
                  </FieldIcon>
                  <FieldLabelText>Nombres</FieldLabelText>
                </FieldLabel>
                <FieldInputValue>
                  <TextInput
                    sizeVariant="sm"
                    value={nombres()}
                    onChange={setNombres}
                    required
                  />
                </FieldInputValue>
              </FieldRow>
              <FieldRow>
                <FieldLabel>
                  <FieldIcon>
                    <User size={16} />
                  </FieldIcon>
                  <FieldLabelText>Apellido paterno</FieldLabelText>
                </FieldLabel>
                <FieldInputValue>
                  <TextInput
                    sizeVariant="sm"
                    value={apellidoPaterno()}
                    onChange={setApellidoPaterno}
                    required
                  />
                </FieldInputValue>
              </FieldRow>
              <FieldRow>
                <FieldLabel>
                  <FieldIcon>
                    <User size={16} />
                  </FieldIcon>
                  <FieldLabelText>Apellido materno</FieldLabelText>
                </FieldLabel>
                <FieldInputValue>
                  <TextInput
                    sizeVariant="sm"
                    value={apellidoMaterno()}
                    onChange={setApellidoMaterno}
                    required
                  />
                </FieldInputValue>
              </FieldRow>
              <FieldRow>
                <FieldLabel>
                  <FieldLabel>
                    <FieldLabelText>DNI</FieldLabelText>
                  </FieldLabel>
                </FieldLabel>
                <FieldInputValue>
                  <TextInput
                    sizeVariant="sm"
                    value={dni()}
                    onChange={setDni}
                    required
                  />
                </FieldInputValue>
              </FieldRow>
              <FieldRow>
                <FieldLabel>
                  <FieldLabelText>Telefono</FieldLabelText>
                </FieldLabel>
                <FieldInputValue>
                  <TextInput
                    sizeVariant="sm"
                    type="tel"
                    value={telefono()}
                    onChange={setTelefono}
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
                    value={email()}
                    onChange={setEmail}
                  />
                </FieldInputValue>
              </FieldRow>
            </FieldTable>

            <Show when={error()}>
              {(msg) => (
                <p style={{ color: "red", margin: "8px 0" }}>{msg()}</p>
              )}
            </Show>

            <div style={{ padding: "8px 0" }}>
              <Button
                type="submit"
                variant="secondary"
                size="sm"
                loading={saving()}
              >
                Guardar datos
              </Button>
            </div>
          </form>
        </Show>
      </WidgetBody>
    </Widget>
  );
}
