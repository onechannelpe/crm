import { createAsync, revalidate } from "@solidjs/router";
import { createMemo, createSignal, For, Show } from "solid-js";

import { AppPage } from "~/components/layout/page";
import { Button } from "~/components/ui/input/button";
import { Select } from "~/components/ui/input/select";
import { FilterBar } from "~/components/ui/layout/filter-bar";
import { ScrollWrapper } from "~/components/ui/utilities/scroll-wrapper";
import { WidgetCardShell } from "~/features/widgets/widget-card-shell";
import { WidgetGrid, WidgetGridItem } from "~/features/widgets/widget-layout";
import { merchantStatsOverviewQuery } from "~/lib/queries/dashboards";
import type { MerchantStatsFilters } from "~/server/merchant-stats/read/contracts";

import {
  formatInteger,
  formatMonth,
  formatPercent,
  formatSolesCompact,
} from "./format";
import { AccountsGrid } from "./grids/accounts-grid";
import { CohortGrid } from "./grids/cohort-grid";
import { BarTile, LineTile, MetricTile, StatRowsTile } from "./tiles";
import { UploadReport } from "./upload/upload-report";

import styles from "./merchant-gpv-dashboard.module.css";

const EMPTY_OVERVIEW = {
  monthly: [],
  sellers: [],
  dataQuality: {
    unmatchedRucs: 0,
    accountsMissingSeller: 0,
    accountsMissingProjected: 0,
    serialMismatches: 0,
  },
  options: { months: [], branches: [], sellers: [], products: [] },
};

export function MerchantGpvDashboard() {
  const [month, setMonth] = createSignal("");
  const [branchId, setBranchId] = createSignal("");
  const [sellerUserId, setSellerUserId] = createSignal("");
  const [product, setProduct] = createSignal("");
  const [showUpload, setShowUpload] = createSignal(false);
  const [missingOnly, setMissingOnly] = createSignal(false);

  const filters = createMemo<MerchantStatsFilters>(() => ({
    month: month() || undefined,
    branchId: branchId() || undefined,
    sellerUserId: sellerUserId() || undefined,
    product: product() || undefined,
  }));

  const overview = createAsync(() => merchantStatsOverviewQuery(filters()), {
    initialValue: EMPTY_OVERVIEW,
  });

  const metrics = createMemo(() => {
    const data = overview();
    const currentMonthGpv = data.monthly.at(-1)?.gpv ?? 0;
    const totalProjected = data.sellers.reduce(
      (sum, row) => sum + row.projectedGpv,
      0,
    );
    const totalRucs = data.sellers.reduce((sum, row) => sum + row.rucCount, 0);
    const attainment =
      totalProjected > 0 ? currentMonthGpv / totalProjected : null;
    return { currentMonthGpv, totalProjected, totalRucs, attainment };
  });

  return (
    <AppPage>
      <FilterBar>
        <div class={styles.filter}>
          <Select
            label="Mes"
            value={month()}
            onInput={(e) => setMonth(e.currentTarget.value)}
          >
            <option value="">Todos</option>
            <For each={overview().options.months}>
              {(m) => <option value={m}>{formatMonth(m)}</option>}
            </For>
          </Select>
        </div>
        <div class={styles.filter}>
          <Select
            label="Zonal"
            value={branchId()}
            onInput={(e) => setBranchId(e.currentTarget.value)}
          >
            <option value="">Todas</option>
            <For each={overview().options.branches}>
              {(b) => <option value={b.id}>{b.name}</option>}
            </For>
          </Select>
        </div>
        <div class={styles.filter}>
          <Select
            label="Vendedor"
            value={sellerUserId()}
            onInput={(e) => setSellerUserId(e.currentTarget.value)}
          >
            <option value="">Todos</option>
            <For each={overview().options.sellers}>
              {(s) => <option value={s.id}>{s.name}</option>}
            </For>
          </Select>
        </div>
        <div class={styles.filter}>
          <Select
            label="Producto"
            value={product()}
            onInput={(e) => setProduct(e.currentTarget.value)}
          >
            <option value="">Todos</option>
            <For each={overview().options.products}>
              {(p) => <option value={p}>{p}</option>}
            </For>
          </Select>
        </div>
        <Button onClick={() => setShowUpload((v) => !v)}>
          Importar reporte
        </Button>
        <Button
          variant="secondary"
          onClick={() => void revalidate(merchantStatsOverviewQuery.key)}
        >
          Recargar
        </Button>
      </FilterBar>

      <Show when={showUpload()}>
        <WidgetCardShell title="Importar reporte GPV">
          <UploadReport onClose={() => setShowUpload(false)} />
        </WidgetCardShell>
      </Show>

      <div class={styles.scrollArea}>
        <ScrollWrapper>
          <WidgetGrid>
            <MetricTile
              title="GPV mes actual"
              span="quarter"
              value={formatSolesCompact(metrics().currentMonthGpv)}
              tone="default"
            />
            <MetricTile
              title="Objetivo mensual"
              span="quarter"
              value={formatSolesCompact(metrics().totalProjected)}
              tone="default"
            />
            <MetricTile
              title="Cumplimiento"
              span="quarter"
              value={
                metrics().attainment != null
                  ? formatPercent(metrics().attainment!)
                  : "—"
              }
              tone={
                metrics().attainment != null && metrics().attainment! >= 1
                  ? "positive"
                  : "default"
              }
            />
            <MetricTile
              title="RUCs sin CRM"
              span="quarter"
              value={formatInteger(overview().dataQuality.unmatchedRucs)}
              tone={
                overview().dataQuality.unmatchedRucs > 0 ? "warning" : "default"
              }
              hint={`${formatInteger(metrics().totalRucs)} RUCs atribuidos`}
            />

            <LineTile
              title="GPV realizado por mes"
              span="full"
              points={overview().monthly.map((point) => ({
                label: point.month,
                value: point.gpv,
              }))}
              target={metrics().totalProjected || null}
            />

            <BarTile
              title="Rendimiento por vendedor"
              span="half"
              rows={overview()
                .sellers.slice(0, 8)
                .map((row) => ({
                  key: row.sellerKey,
                  label: row.sellerName,
                  value: row.gpv,
                  target: row.projectedGpv || null,
                }))}
            />

            <StatRowsTile
              title="Calidad de datos"
              span="half"
              rows={[
                {
                  label: "RUCs sin registrar en CRM",
                  value: formatInteger(overview().dataQuality.unmatchedRucs),
                  alert: overview().dataQuality.unmatchedRucs > 0,
                },
                {
                  label: "Cuentas sin vendedor real",
                  value: formatInteger(
                    overview().dataQuality.accountsMissingSeller,
                  ),
                  alert: overview().dataQuality.accountsMissingSeller > 0,
                },
                {
                  label: "Cuentas sin proyectado",
                  value: formatInteger(
                    overview().dataQuality.accountsMissingProjected,
                  ),
                  alert: overview().dataQuality.accountsMissingProjected > 0,
                },
                {
                  label: "Series que no cuadran con entregas",
                  value: formatInteger(overview().dataQuality.serialMismatches),
                  alert: overview().dataQuality.serialMismatches > 0,
                },
              ]}
            />

            <WidgetGridItem span="full">
              <WidgetCardShell title="Cohortes de ventas">
                <CohortGrid filters={filters()} />
              </WidgetCardShell>
            </WidgetGridItem>

            <WidgetGridItem span="full">
              <WidgetCardShell
                title="Atribución por RUC"
                action={
                  <label class={styles.toggle}>
                    <input
                      type="checkbox"
                      checked={missingOnly()}
                      onChange={(e) => setMissingOnly(e.currentTarget.checked)}
                    />
                    Solo faltantes
                  </label>
                }
              >
                <AccountsGrid
                  filters={{ ...filters(), missingEnrichment: missingOnly() }}
                  options={overview().options}
                />
              </WidgetCardShell>
            </WidgetGridItem>
          </WidgetGrid>
        </ScrollWrapper>
      </div>
    </AppPage>
  );
}
