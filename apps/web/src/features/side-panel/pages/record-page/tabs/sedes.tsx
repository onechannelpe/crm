import { useAction } from "@solidjs/router";
import { For, Show, createMemo, createSignal } from "solid-js";

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
import {
  createSaleContainerMutation,
  createSaleVenueMutation,
} from "~/features/workflow/data/mutations";
import { toAppError } from "~/lib/app-errors";
import {
  ACCOUNT_TYPE_KINDS,
  isBcpBank,
  type AbonoBank,
  type AccountTypeKind,
} from "~/workflow/contracts/lead-schema";

import type { TabContentProps } from "./content-props";

function VenueCard(props: {
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
            <FieldInputValue>{venue().cantidadPos}</FieldInputValue>
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
          <FieldRow>
            <FieldLabel>
              <FieldLabelText>Banco SOLES</FieldLabelText>
            </FieldLabel>
            <FieldInputValue>{venue().solesAccount.banco}</FieldInputValue>
          </FieldRow>
          <FieldRow>
            <FieldLabel>
              <FieldLabelText>Tipo cuenta SOLES</FieldLabelText>
            </FieldLabel>
            <FieldInputValue>{venue().solesAccount.tipoCuenta}</FieldInputValue>
          </FieldRow>
          <FieldRow>
            <FieldLabel>
              <FieldLabelText>Nro cuenta SOLES</FieldLabelText>
            </FieldLabel>
            <FieldInputValue>{venue().solesAccount.nroCuenta}</FieldInputValue>
          </FieldRow>
          <Show when={venue().solesAccount.cci}>
            <FieldRow>
              <FieldLabel>
                <FieldLabelText>CCI SOLES</FieldLabelText>
              </FieldLabel>
              <FieldInputValue>{venue().solesAccount.cci}</FieldInputValue>
            </FieldRow>
          </Show>
          <Show when={venue().dollarAccount}>
            <FieldRow>
              <FieldLabel>
                <FieldLabelText>Banco USD</FieldLabelText>
              </FieldLabel>
              <FieldInputValue>{venue().dollarAccount?.banco}</FieldInputValue>
            </FieldRow>
          </Show>
          <Show when={venue().dollarAccount}>
            <FieldRow>
              <FieldLabel>
                <FieldLabelText>Tipo cuenta USD</FieldLabelText>
              </FieldLabel>
              <FieldInputValue>
                {venue().dollarAccount?.tipoCuenta}
              </FieldInputValue>
            </FieldRow>
          </Show>
          <Show when={venue().dollarAccount}>
            <FieldRow>
              <FieldLabel>
                <FieldLabelText>Nro cuenta USD</FieldLabelText>
              </FieldLabel>
              <FieldInputValue>
                {venue().dollarAccount?.nroCuenta}
              </FieldInputValue>
            </FieldRow>
          </Show>
          <Show when={venue().dollarAccount?.cci}>
            <FieldRow>
              <FieldLabel>
                <FieldLabelText>CCI USD</FieldLabelText>
              </FieldLabel>
              <FieldInputValue>{venue().dollarAccount?.cci}</FieldInputValue>
            </FieldRow>
          </Show>
          <FieldRow>
            <FieldLabel>
              <FieldLabelText>Cuenta de abono</FieldLabelText>
            </FieldLabel>
            <FieldInputValue>
              {venue().solesAccount.isSettlement
                ? `SOLES (${venue().solesAccount.banco})`
                : `USD (${venue().dollarAccount?.banco ?? "N/A"})`}
            </FieldInputValue>
          </FieldRow>
        </FieldTable>
      </WidgetBody>
    </Widget>
  );
}

export function SedesTab(props: TabContentProps) {
  const createSale = useAction(createSaleContainerMutation);
  const createSaleVenue = useAction(createSaleVenueMutation);

  const [nombreComercial, setNombreComercial] = createSignal("");
  const [cantidadPos, setCantidadPos] = createSignal("1");
  const [direccion, setDireccion] = createSignal("");
  const [referencia, setReferencia] = createSignal("");
  const [distrito, setDistrito] = createSignal("");
  const [provincia, setProvincia] = createSignal("");
  const [departamento, setDepartamento] = createSignal("");

  const [bancoSoles, setBancoSoles] = createSignal<AbonoBank | "">("");
  const [showBancoSolesPicker, setShowBancoSolesPicker] = createSignal(false);
  const [tipoCuentaSoles, setTipoCuentaSoles] = createSignal<
    AccountTypeKind | ""
  >("");
  const [nroCuentaSoles, setNroCuentaSoles] = createSignal("");
  const [cciSoles, setCciSoles] = createSignal("");

  const [usarDolares, setUsarDolares] = createSignal(false);
  const [bancoDolares, setBancoDolares] = createSignal<AbonoBank | "">("");
  const [showBancoDolaresPicker, setShowBancoDolaresPicker] =
    createSignal(false);
  const [tipoCuentaDolares, setTipoCuentaDolares] = createSignal<
    AccountTypeKind | ""
  >("");
  const [nroCuentaDolares, setNroCuentaDolares] = createSignal("");
  const [cciDolares, setCciDolares] = createSignal("");

  const [settlementCurrency, setSettlementCurrency] = createSignal<
    "PEN" | "USD"
  >("PEN");

  const [submitting, setSubmitting] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  const viewProps = createMemo(() =>
    props.mode === "view" ? props.data : null,
  );
  const requiresCciSoles = createMemo(() =>
    bancoSoles() ? !isBcpBank(bancoSoles()) : false,
  );
  const requiresCciDolares = createMemo(() =>
    bancoDolares() ? !isBcpBank(bancoDolares()) : false,
  );

  function resetForm() {
    setNombreComercial("");
    setCantidadPos("1");
    setDireccion("");
    setReferencia("");
    setDistrito("");
    setProvincia("");
    setDepartamento("");
    setBancoSoles("");
    setTipoCuentaSoles("");
    setNroCuentaSoles("");
    setCciSoles("");
    setUsarDolares(false);
    setBancoDolares("");
    setTipoCuentaDolares("");
    setNroCuentaDolares("");
    setCciDolares("");
    setSettlementCurrency("PEN");
  }

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    const data = viewProps();
    if (!data) return;

    const currentBancoSoles = bancoSoles();
    const currentTipoCuentaSoles = tipoCuentaSoles();
    const cantidadPosValue = Number(cantidadPos());

    if (!nombreComercial().trim() || !direccion().trim()) {
      setError("Nombre comercial y direccion son obligatorios");
      return;
    }
    if (!referencia().trim()) {
      setError("Referencia es obligatoria");
      return;
    }
    if (!distrito().trim() || !provincia().trim() || !departamento().trim()) {
      setError("Distrito, provincia y departamento son obligatorios");
      return;
    }
    if (!Number.isFinite(cantidadPosValue) || cantidadPosValue <= 0) {
      setError("Cantidad POS debe ser mayor a 0");
      return;
    }
    if (
      !currentBancoSoles ||
      !currentTipoCuentaSoles ||
      !nroCuentaSoles().trim()
    ) {
      setError("Completa todos los datos de cuenta en soles");
      return;
    }
    if (requiresCciSoles() && !cciSoles().trim()) {
      setError("CCI en soles es obligatorio cuando el banco no es BCP");
      return;
    }
    const solesAccount = {
      banco: currentBancoSoles,
      tipoCuenta: currentTipoCuentaSoles,
      nroCuenta: nroCuentaSoles().trim(),
      ...(cciSoles().trim() ? { cci: cciSoles().trim() } : {}),
      isSettlement: settlementCurrency() === "PEN",
    };

    let dollarAccount:
      | {
          banco: AbonoBank;
          tipoCuenta: AccountTypeKind;
          nroCuenta: string;
          cci?: string;
          isSettlement: boolean;
        }
      | undefined;

    if (usarDolares()) {
      const currentBancoDolares = bancoDolares();
      const currentTipoCuentaDolares = tipoCuentaDolares();
      if (
        !currentBancoDolares ||
        !currentTipoCuentaDolares ||
        !nroCuentaDolares().trim()
      ) {
        setError("Completa todos los datos de cuenta en dolares");
        return;
      }
      if (requiresCciDolares() && !cciDolares().trim()) {
        setError("CCI en dolares es obligatorio cuando el banco no es BCP");
        return;
      }
      dollarAccount = {
        banco: currentBancoDolares,
        tipoCuenta: currentTipoCuentaDolares,
        nroCuenta: nroCuentaDolares().trim(),
        ...(cciDolares().trim() ? { cci: cciDolares().trim() } : {}),
        isSettlement: settlementCurrency() === "USD",
      };
    }

    setSubmitting(true);
    setError(null);

    try {
      let saleId = data.sale?.id;
      if (!saleId) {
        const saleResult = await createSale({ leadId: data.lead.id });
        saleId = saleResult.saleId;
      }

      await createSaleVenue({
        leadId: data.lead.id,
        saleId,
        nombreComercial: nombreComercial().trim(),
        cantidadPos: cantidadPosValue,
        direccion: direccion().trim(),
        referencia: referencia().trim(),
        distrito: distrito().trim(),
        provincia: provincia().trim(),
        departamento: departamento().trim(),
        solesAccount,
        dollarAccount,
      });

      resetForm();
    } catch (err) {
      setError(toAppError(err, "No se pudo registrar la sede").publicMessage);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Show when={viewProps()} keyed>
      {(data) => (
        <div>
          <Show when={data.venues.length > 0}>
            <For each={data.venues}>
              {(venue) => <VenueCard venue={venue} />}
            </For>
          </Show>

          <Show
            when={data.lead.stage === "READY_FOR_SALE"}
            fallback={
              <Show when={data.venues.length === 0}>
                <Widget>
                  <WidgetBody>
                    <div
                      style={{
                        padding: "12px",
                        "text-align": "center",
                        color: "#666",
                      }}
                    >
                      No hay sedes registradas
                    </div>
                  </WidgetBody>
                </Widget>
              </Show>
            }
          >
            <Widget>
              <WidgetHeader>
                <WidgetTitle text="Agregar sede" />
              </WidgetHeader>
              <WidgetBody>
                <form onSubmit={(e) => void handleSubmit(e)}>
                  <FieldTable>
                    <FieldRow>
                      <FieldLabel>
                        <FieldLabelText>Nombre comercial</FieldLabelText>
                      </FieldLabel>
                      <FieldInputValue>
                        <TextInput
                          sizeVariant="sm"
                          value={nombreComercial()}
                          onChange={setNombreComercial}
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
                          value={cantidadPos()}
                          onChange={setCantidadPos}
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
                          value={direccion()}
                          onChange={setDireccion}
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
                          value={referencia()}
                          onChange={setReferencia}
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
                          value={distrito()}
                          onChange={setDistrito}
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
                          value={provincia()}
                          onChange={setProvincia}
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
                          value={departamento()}
                          onChange={setDepartamento}
                          required
                        />
                      </FieldInputValue>
                    </FieldRow>

                    <FieldRow>
                      <FieldLabel>
                        <FieldLabelText>Banco SOLES</FieldLabelText>
                      </FieldLabel>
                      <FieldInputValue>
                        <button
                          type="button"
                          onClick={() =>
                            setShowBancoSolesPicker(!showBancoSolesPicker())
                          }
                        >
                          {bancoSoles() || "Seleccionar"}
                        </button>
                        <Show when={showBancoSolesPicker()}>
                          <BankPicker
                            onSelect={setBancoSoles}
                            onClose={() => setShowBancoSolesPicker(false)}
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
                                  checked={tipoCuentaSoles() === kind}
                                  onChange={() => setTipoCuentaSoles(kind)}
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
                          value={nroCuentaSoles()}
                          onChange={setNroCuentaSoles}
                          required
                        />
                      </FieldInputValue>
                    </FieldRow>
                    <Show when={requiresCciSoles()}>
                      <FieldRow>
                        <FieldLabel>
                          <FieldLabelText>CCI SOLES</FieldLabelText>
                        </FieldLabel>
                        <FieldInputValue>
                          <TextInput
                            sizeVariant="sm"
                            value={cciSoles()}
                            onChange={setCciSoles}
                            required={requiresCciSoles()}
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
                            checked={usarDolares()}
                            onChange={(event) => {
                              const checked = event.currentTarget.checked;
                              setUsarDolares(checked);
                              if (!checked) {
                                setSettlementCurrency("PEN");
                              }
                            }}
                          />
                          Agregar cuenta USD
                        </label>
                      </FieldInputValue>
                    </FieldRow>
                    <Show when={usarDolares()}>
                      <FieldRow>
                        <FieldLabel>
                          <FieldLabelText>Banco USD</FieldLabelText>
                        </FieldLabel>
                        <FieldInputValue>
                          <button
                            type="button"
                            onClick={() =>
                              setShowBancoDolaresPicker(
                                !showBancoDolaresPicker(),
                              )
                            }
                          >
                            {bancoDolares() || "Seleccionar"}
                          </button>
                          <Show when={showBancoDolaresPicker()}>
                            <BankPicker
                              onSelect={setBancoDolares}
                              onClose={() => setShowBancoDolaresPicker(false)}
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
                                    checked={tipoCuentaDolares() === kind}
                                    onChange={() => setTipoCuentaDolares(kind)}
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
                            value={nroCuentaDolares()}
                            onChange={setNroCuentaDolares}
                            required={usarDolares()}
                          />
                        </FieldInputValue>
                      </FieldRow>
                      <Show when={requiresCciDolares()}>
                        <FieldRow>
                          <FieldLabel>
                            <FieldLabelText>CCI USD</FieldLabelText>
                          </FieldLabel>
                          <FieldInputValue>
                            <TextInput
                              sizeVariant="sm"
                              value={cciDolares()}
                              onChange={setCciDolares}
                              required={requiresCciDolares()}
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
                            checked={settlementCurrency() === "PEN"}
                            onChange={() => setSettlementCurrency("PEN")}
                          />
                          SOLES
                        </label>
                        <Show when={usarDolares()}>
                          <label>
                            <input
                              type="radio"
                              name="settlementCurrency"
                              checked={settlementCurrency() === "USD"}
                              onChange={() => setSettlementCurrency("USD")}
                            />
                            USD
                          </label>
                        </Show>
                      </FieldInputValue>
                    </FieldRow>
                  </FieldTable>

                  <Show when={error()}>{(message) => <p>{message()}</p>}</Show>
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
                      loading={submitting()}
                    >
                      Guardar sede
                    </Button>
                  </div>
                </form>
              </WidgetBody>
            </Widget>
          </Show>
        </div>
      )}
    </Show>
  );
}
