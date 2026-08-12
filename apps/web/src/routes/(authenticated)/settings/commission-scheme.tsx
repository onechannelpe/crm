import {
  createAsync,
  type RouteDefinition,
  useAction,
  useSearchParams,
  useSubmission,
} from "@solidjs/router";
import {
  createMemo,
  createSignal,
  createUniqueId,
  Show,
  type JSX,
} from "solid-js";
import { createStore, reconcile, unwrap } from "solid-js/store";

import { useSnackBar } from "~/components/feedback/snack-bar-manager/use-snack-bar";
import Building2 from "~/components/icons/building-2";
import Package from "~/components/icons/package";
import Target from "~/components/icons/target";
import {
  BandTableField,
  parseNumber,
} from "~/components/settings/band-table-field";
import { SettingsCounter } from "~/components/settings/settings-counter";
import {
  SettingsOptionCard,
  SettingsOptionCardRow,
  SettingsOptionCardWideRow,
} from "~/components/settings/settings-option-card";
import { SettingsSection } from "~/components/settings/SettingsSection";
import { Badge } from "~/components/ui/display/badge";
import { Button } from "~/components/ui/input/button";
import { TextInput } from "~/components/ui/input/text-input";
import { Toggle } from "~/components/ui/input/toggle";
import { actionErrorMessage } from "~/contracts/errors";
import {
  defaultCompanyCaja3Rules,
  defaultCorporateCaja2Rules,
  defaultExecutiveActivationBarRules,
  defaultMassMarketCaja1Rules,
  defaultMassMarketCaja2Rules,
  defaultPenalidadActivacionRules,
  defaultPenalidadReversionRules,
  type CommissionSchemeRules,
  type PayoutBand,
} from "~/domain/merchant-stats/commission";
import { setCommissionSchemeMutation } from "~/features/merchant-stats/data/mutations";
import { SettingsPageLayout } from "~/features/settings-shell/page/settings-page-layout";
import {
  TabStrip,
  type TabItem,
} from "~/features/side-panel/components/tab-strip";
import { commissionSchemeDraftQuery } from "~/rpc/merchant-stats/commission-scheme";

import styles from "./commission-scheme.module.css";
import base from "./settings-page.module.css";

export const route = {
  preload: () => {
    void commissionSchemeDraftQuery();
  },
} satisfies RouteDefinition;

type CommissionTabId = "masiva" | "corporativa" | "empresa";

const DEFAULT_TAB: CommissionTabId = "masiva";

const COMMISSION_TABS: readonly TabItem<CommissionTabId>[] = [
  { id: "masiva", label: "Masiva — Mesa 2 y 3", icon: Package },
  { id: "corporativa", label: "Corporativa — Mesa 1", icon: Building2 },
  { id: "empresa", label: "Empresa", icon: Target },
];

function useCommissionTab() {
  const [params, setParams] = useSearchParams<{ tab?: string }>();

  const tab = createMemo<CommissionTabId>(() => {
    const raw = Array.isArray(params.tab) ? params.tab[0] : params.tab;

    return COMMISSION_TABS.find((item) => item.id === raw)?.id ?? DEFAULT_TAB;
  });

  return {
    tab,
    setTab: (id: CommissionTabId) =>
      setParams({ tab: id === DEFAULT_TAB ? null : id }, { scroll: false }),
  };
}

function NumberField(props: {
  label: string;
  description?: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <SettingsOptionCardRow
      title={props.label}
      description={props.description}
      control={
        <TextInput
          type="number"
          sizeVariant="sm"
          aria-label={props.label}
          value={String(props.value)}
          onChange={(value) => props.onChange(parseNumber(value))}
        />
      }
    />
  );
}

function PercentField(props: {
  label: string;
  description?: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <SettingsOptionCardRow
      title={props.label}
      description={props.description}
      control={
        <TextInput
          type="number"
          sizeVariant="sm"
          aria-label={props.label}
          value={String(Math.round(props.value * 100))}
          onChange={(value) => props.onChange(parseNumber(value) / 100)}
        />
      }
    />
  );
}

function BandTableRow(props: {
  label: string;
  bands: PayoutBand[];
  onChange: (bands: PayoutBand[]) => void;
}) {
  return (
    <SettingsOptionCardWideRow title={props.label}>
      <BandTableField bands={props.bands} onChange={props.onChange} />
    </SettingsOptionCardWideRow>
  );
}

function ConfigurableSection(props: {
  title: string;
  description?: string;
  toggleAriaLabel?: string;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  children: JSX.Element;
}) {
  return (
    <SettingsSection title={props.title} description={props.description}>
      <SettingsOptionCard>
        <SettingsOptionCardRow
          interactive
          title="Configurado"
          description="Empieza con los umbrales confirmados; desactívalo si no corresponde calcular esta caja."
          control={
            <Toggle
              ariaLabel={`Configurar ${props.toggleAriaLabel ?? props.title}`}
              value={props.enabled}
              onChange={props.onToggle}
            />
          }
        />

        <Show when={props.enabled}>{props.children}</Show>
      </SettingsOptionCard>
    </SettingsSection>
  );
}

function PendingSection(props: { title: string; description: string }) {
  return (
    <SettingsSection
      title={props.title}
      description={props.description}
      actions={<Badge variant="secondary">Pendiente de definir</Badge>}
    />
  );
}

function CommissionSchemeForm(props: { initial: CommissionSchemeRules }) {
  const [draft, setDraft] = createStore<CommissionSchemeRules>(
    structuredClone(props.initial),
  );
  const [baseline, setBaseline] = createSignal(structuredClone(props.initial));
  const save = useAction(setCommissionSchemeMutation);
  const submission = useSubmission(setCommissionSchemeMutation);
  const { enqueueSuccessSnackBar, enqueueErrorSnackBar } = useSnackBar();
  const formId = createUniqueId();
  const { tab, setTab } = useCommissionTab();

  const isDirty = createMemo(
    () => JSON.stringify(draft) !== JSON.stringify(baseline()),
  );

  async function handleSubmit(event: SubmitEvent) {
    event.preventDefault();

    try {
      await save({
        effectiveFrom: new Date().toISOString().slice(0, 10),
        rules: draft,
      });

      // `draft` is a store Proxy; structuredClone throws DataCloneError on
      // Proxies in the browser, so clone the unwrapped plain value instead.
      setBaseline(structuredClone(unwrap(draft)));
      enqueueSuccessSnackBar("Esquema de comisiones actualizado");
    } catch (error) {
      enqueueErrorSnackBar(actionErrorMessage(error));
    }
  }

  function handleCancel() {
    setDraft(reconcile(structuredClone(baseline())));
  }

  return (
    <SettingsPageLayout
      actionButton={
        <Show when={isDirty()}>
          <div class={styles.actionButtons}>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleCancel}
            >
              Cancelar
            </Button>

            <Button
              type="submit"
              form={formId}
              size="sm"
              loading={submission.pending}
            >
              Guardar
            </Button>
          </div>
        </Show>
      }
    >
      <div class={styles.tabStrip}>
        <TabStrip
          tabs={COMMISSION_TABS}
          activeTab={tab()}
          onTabSelect={setTab}
        />
      </div>

      <form
        id={formId}
        class={base.stack}
        onSubmit={(event) => void handleSubmit(event)}
      >
        <Show when={tab() === "masiva"}>
          <ConfigurableSection
            title="Caja 1"
            description="Activación en M0 y rangos de pago a M0+15."
            toggleAriaLabel="Caja 1, mesa 2 y 3 (masiva)"
            enabled={draft.massMarket.caja1 !== null}
            onToggle={(enabled) =>
              setDraft(
                "massMarket",
                "caja1",
                enabled ? defaultMassMarketCaja1Rules() : null,
              )
            }
          >
            <Show when={draft.massMarket.caja1}>
              {(caja1) => (
                <>
                  <NumberField
                    label="GPV mínimo (M0)"
                    description="Más de este monto en soles."
                    value={caja1().activation.minGpv}
                    onChange={(minGpv) =>
                      setDraft("massMarket", "caja1", {
                        ...caja1(),
                        activation: {
                          ...caja1().activation,
                          minGpv,
                        },
                      })
                    }
                  />

                  <SettingsOptionCardRow
                    title="Transacciones mínimas (M0)"
                    control={
                      <SettingsCounter
                        ariaLabel="Transacciones mínimas"
                        value={caja1().activation.minTrx}
                        min={0}
                        max={20}
                        onChange={(minTrx) =>
                          setDraft("massMarket", "caja1", {
                            ...caja1(),
                            activation: {
                              ...caja1().activation,
                              minTrx,
                            },
                          })
                        }
                      />
                    }
                  />

                  <SettingsOptionCardRow
                    title="Meta de activas en M0"
                    control={
                      <SettingsCounter
                        ariaLabel="Meta de activas en M0"
                        value={caja1().m0Target}
                        min={0}
                        max={200}
                        onChange={(m0Target) =>
                          setDraft("massMarket", "caja1", {
                            ...caja1(),
                            m0Target,
                          })
                        }
                      />
                    }
                  />

                  <BandTableRow
                    label="Rangos de pago (activas en M0+15)"
                    bands={caja1().m0Plus15Bands}
                    onChange={(m0Plus15Bands) =>
                      setDraft("massMarket", "caja1", {
                        ...caja1(),
                        m0Plus15Bands,
                      })
                    }
                  />
                </>
              )}
            </Show>
          </ConfigurableSection>

          <ConfigurableSection
            title="Caja 2"
            description="Rangos de pago por volumen de POS activo, en M0+M1 y M2."
            toggleAriaLabel="Caja 2, mesa 2 y 3 (masiva)"
            enabled={draft.massMarket.caja2 !== null}
            onToggle={(enabled) =>
              setDraft(
                "massMarket",
                "caja2",
                enabled ? defaultMassMarketCaja2Rules() : null,
              )
            }
          >
            <Show when={draft.massMarket.caja2}>
              {(caja2) => (
                <>
                  <NumberField
                    label="GPV mínimo por POS activo"
                    value={caja2().activePosMinGpv}
                    onChange={(activePosMinGpv) =>
                      setDraft("massMarket", "caja2", {
                        ...caja2(),
                        activePosMinGpv,
                      })
                    }
                  />

                  <BandTableRow
                    label="Rangos de pago (M0+M1)"
                    bands={caja2().bandsM0PlusM1}
                    onChange={(bandsM0PlusM1) =>
                      setDraft("massMarket", "caja2", {
                        ...caja2(),
                        bandsM0PlusM1,
                      })
                    }
                  />

                  <BandTableRow
                    label="Rangos de pago (M2)"
                    bands={caja2().bandsM2}
                    onChange={(bandsM2) =>
                      setDraft("massMarket", "caja2", {
                        ...caja2(),
                        bandsM2,
                      })
                    }
                  />
                </>
              )}
            </Show>
          </ConfigurableSection>

          <ConfigurableSection
            title="Penalidad de reversión"
            description="Si un POS comisionó en M0+M1 pero no llega al mínimo en M2."
            toggleAriaLabel="Penalidad de reversión, mesa 2 y 3 (masiva)"
            enabled={draft.penalidadReversion.massMarket !== null}
            onToggle={(enabled) =>
              setDraft(
                "penalidadReversion",
                "massMarket",
                enabled ? defaultPenalidadReversionRules() : null,
              )
            }
          >
            <Show when={draft.penalidadReversion.massMarket}>
              {(reversion) => (
                <>
                  <NumberField
                    label="GPV mínimo en M2"
                    value={reversion().minM2Gpv}
                    onChange={(minM2Gpv) =>
                      setDraft("penalidadReversion", "massMarket", {
                        ...reversion(),
                        minM2Gpv,
                      })
                    }
                  />

                  <PercentField
                    label="Porcentaje de reversión"
                    value={reversion().reversalPct}
                    onChange={(reversalPct) =>
                      setDraft("penalidadReversion", "massMarket", {
                        ...reversion(),
                        reversalPct,
                      })
                    }
                  />
                </>
              )}
            </Show>
          </ConfigurableSection>
        </Show>

        <Show when={tab() === "corporativa"}>
          <PendingSection
            title="Caja 1"
            description="El criterio de activación para mesa 1 (corporativa) todavía no está definido."
          />

          <ConfigurableSection
            title="Caja 2"
            description="Por usuario: suma de RUCs calificados vs. dos criterios."
            toggleAriaLabel="Caja 2, mesa 1 (corporativa)"
            enabled={draft.corporate.caja2 !== null}
            onToggle={(enabled) =>
              setDraft(
                "corporate",
                "caja2",
                enabled ? defaultCorporateCaja2Rules() : null,
              )
            }
          >
            <Show when={draft.corporate.caja2}>
              {(caja2) => (
                <>
                  <NumberField
                    label="GPV mínimo por RUC activo"
                    value={caja2().activeRucMinGpv}
                    onChange={(activeRucMinGpv) =>
                      setDraft("corporate", "caja2", {
                        ...caja2(),
                        activeRucMinGpv,
                      })
                    }
                  />

                  <NumberField
                    label="Suma mínima de RUCs calificados"
                    value={caja2().minAggregateGpv}
                    onChange={(minAggregateGpv) =>
                      setDraft("corporate", "caja2", {
                        ...caja2(),
                        minAggregateGpv,
                      })
                    }
                  />

                  <SettingsOptionCardRow
                    title="Mínimo de RUCs calificados"
                    control={
                      <SettingsCounter
                        ariaLabel="Mínimo de RUCs calificados"
                        value={caja2().minQualifyingRucs}
                        min={0}
                        max={10}
                        onChange={(minQualifyingRucs) =>
                          setDraft("corporate", "caja2", {
                            ...caja2(),
                            minQualifyingRucs,
                          })
                        }
                      />
                    }
                  />
                </>
              )}
            </Show>
          </ConfigurableSection>

          <PendingSection
            title="Penalidad de reversión"
            description="Existe una penalidad de reversión para mesa 1 (corporativa), pero su cálculo todavía no está definido."
          />
        </Show>

        <Show when={tab() === "empresa"}>
          <ConfigurableSection
            title="Caja 3"
            description="Meta única de GPV, todas las mesas y productos, M0+M1+M2."
            enabled={draft.company.caja3 !== null}
            onToggle={(enabled) =>
              setDraft(
                "company",
                "caja3",
                enabled ? defaultCompanyCaja3Rules() : null,
              )
            }
          >
            <Show when={draft.company.caja3}>
              {(caja3) => (
                <NumberField
                  label="Meta de GPV"
                  value={caja3().targetGpv}
                  onChange={(targetGpv) =>
                    setDraft("company", "caja3", { targetGpv })
                  }
                />
              )}
            </Show>
          </ConfigurableSection>

          <ConfigurableSection
            title="Penalidad de activación"
            description="Las ventas no activadas en acumulado (M0+M1+M2) deben ser menos del 10% de la empresa."
            enabled={draft.penalidadActivacion !== null}
            onToggle={(enabled) =>
              setDraft(
                "penalidadActivacion",
                enabled ? defaultPenalidadActivacionRules() : null,
              )
            }
          >
            <Show when={draft.penalidadActivacion}>
              {(activacion) => (
                <>
                  <NumberField
                    label="GPV mínimo acumulado — Mesa 1"
                    value={activacion().minCumulativeGpvByMesa.mesa1}
                    onChange={(mesa1) =>
                      setDraft("penalidadActivacion", {
                        ...activacion(),
                        minCumulativeGpvByMesa: {
                          ...activacion().minCumulativeGpvByMesa,
                          mesa1,
                        },
                      })
                    }
                  />

                  <NumberField
                    label="GPV mínimo acumulado — Mesa 2"
                    value={activacion().minCumulativeGpvByMesa.mesa2}
                    onChange={(mesa2) =>
                      setDraft("penalidadActivacion", {
                        ...activacion(),
                        minCumulativeGpvByMesa: {
                          ...activacion().minCumulativeGpvByMesa,
                          mesa2,
                        },
                      })
                    }
                  />

                  <NumberField
                    label="GPV mínimo acumulado — Mesa 3"
                    value={activacion().minCumulativeGpvByMesa.mesa3}
                    onChange={(mesa3) =>
                      setDraft("penalidadActivacion", {
                        ...activacion(),
                        minCumulativeGpvByMesa: {
                          ...activacion().minCumulativeGpvByMesa,
                          mesa3,
                        },
                      })
                    }
                  />

                  <PercentField
                    label="Porcentaje máximo de inactivas"
                    description="Estrictamente menor a este porcentaje."
                    value={activacion().maxInactiveRate}
                    onChange={(maxInactiveRate) =>
                      setDraft("penalidadActivacion", {
                        ...activacion(),
                        maxInactiveRate,
                      })
                    }
                  />
                </>
              )}
            </Show>
          </ConfigurableSection>

          <ConfigurableSection
            title="Activación de ejecutivos"
            description="Umbral uniforme que exige Infinity Pay, distinto del criterio real de Culqi."
            enabled={draft.executiveActivationBar !== null}
            onToggle={(enabled) =>
              setDraft(
                "executiveActivationBar",
                enabled ? defaultExecutiveActivationBarRules() : null,
              )
            }
          >
            <Show when={draft.executiveActivationBar}>
              {(bar) => (
                <NumberField
                  label="GPV mínimo por venta"
                  value={bar().minGpvPerSale}
                  onChange={(minGpvPerSale) =>
                    setDraft("executiveActivationBar", { minGpvPerSale })
                  }
                />
              )}
            </Show>
          </ConfigurableSection>
        </Show>
      </form>
    </SettingsPageLayout>
  );
}

export default function CommissionSchemePage() {
  const draft = createAsync(() => commissionSchemeDraftQuery(), {
    initialValue: null,
  });

  return (
    <Show when={draft()}>
      {(initial) => <CommissionSchemeForm initial={initial()} />}
    </Show>
  );
}
