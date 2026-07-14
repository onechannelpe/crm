import { createAsync, revalidate } from "@solidjs/router";
import { createMemo, createSignal, For, Show } from "solid-js";

import { AppPage } from "~/components/layout/page";
import { Button } from "~/components/ui/input/button";
import { Select } from "~/components/ui/input/select";
import { FilterBar } from "~/components/ui/layout/filter-bar";
import { businessStatsOverviewQuery } from "~/lib/queries/dashboards";
import type { BusinessStatsFilters } from "~/server/merchant-stats/read/contracts";

import { BarList } from "./charts/bar-list";
import { LineChart } from "./charts/line-chart";
import { StatTile, WidgetCard } from "./components/panel";
import {
  formatInteger,
  formatMonth,
  formatPercent,
  formatSolesCompact,
} from "./format";
import { AccountsGrid } from "./grids/accounts-grid";
import { CohortGrid } from "./grids/cohort-grid";
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

type Tab = "cohort" | "accounts";

export function MerchantGpvDashboard() {
  const [month, setMonth] = createSignal("");
  const [branchId, setBranchId] = createSignal("");
  const [sellerUserId, setSellerUserId] = createSignal("");
  const [product, setProduct] = createSignal("");
  const [tab, setTab] = createSignal<Tab>("cohort");
  const [showUpload, setShowUpload] = createSignal(false);
  const [missingOnly, setMissingOnly] = createSignal(false);

  const filters = createMemo<BusinessStatsFilters>(() => ({
    month: month() || undefined,
    branchId: branchId() || undefined,
    sellerUserId: sellerUserId() || undefined,
    product: product() || undefined,
  }));

  const overview = createAsync(() => businessStatsOverviewQuery(filters()), {
    initialValue: EMPTY_OVERVIEW,
  });

  const currentMonthGpv = () => overview().monthly.at(-1)?.gpv ?? 0;
  const totalProjected = () =>
    overview().sellers.reduce((sum, row) => sum + row.projectedGpv, 0);
  const totalRucs = () =>
    overview().sellers.reduce((sum, row) => sum + row.rucCount, 0);
  const attainment = () =>
    totalProjected() > 0 ? currentMonthGpv() / totalProjected() : null;

  const sellerBars = () =>
    overview()
      .sellers.slice(0, 8)
      .map((row) => ({
        key: row.sellerKey,
        label: row.sellerName,
        value: row.gpv,
        target: row.projectedGpv || null,
      }));

  const dataQualityRows = () => {
    const dq = overview().dataQuality;
    return [
      { label: "RUCs sin registrar en CRM", value: dq.unmatchedRucs },
      { label: "Cuentas sin vendedor real", value: dq.accountsMissingSeller },
      { label: "Cuentas sin proyectado", value: dq.accountsMissingProjected },
      {
        label: "Series que no cuadran con entregas",
        value: dq.serialMismatches,
      },
    ];
  };

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
          onClick={() => void revalidate(businessStatsOverviewQuery.key)}
        >
          Recargar
        </Button>
      </FilterBar>

      <Show when={showUpload()}>
        <WidgetCard title="Importar reporte GPV">
          <UploadReport onClose={() => setShowUpload(false)} />
        </WidgetCard>
      </Show>

      <div class={styles.tiles}>
        <StatTile
          label="GPV mes actual"
          value={formatSolesCompact(currentMonthGpv())}
        />
        <StatTile
          label="Objetivo mensual"
          value={formatSolesCompact(totalProjected())}
        />
        <StatTile
          label="Cumplimiento"
          value={attainment() != null ? formatPercent(attainment()!) : "—"}
          tone={
            attainment() != null && attainment()! >= 1 ? "positive" : "default"
          }
        />
        <StatTile
          label="RUCs sin CRM"
          value={formatInteger(overview().dataQuality.unmatchedRucs)}
          tone={
            overview().dataQuality.unmatchedRucs > 0 ? "warning" : "default"
          }
          hint={`${formatInteger(totalRucs())} RUCs atribuidos`}
        />
      </div>

      <div class={styles.widgets}>
        <WidgetCard title="GPV realizado por mes" span="full">
          <Show when={overview().monthly.length > 0} fallback={<Empty />}>
            <LineChart
              points={overview().monthly}
              target={totalProjected() || null}
            />
          </Show>
        </WidgetCard>

        <WidgetCard
          title="Rendimiento por vendedor"
          subtitle="Barra: GPV realizado · marca: objetivo proyectado"
          span="half"
        >
          <Show when={sellerBars().length > 0} fallback={<Empty />}>
            <BarList rows={sellerBars()} />
          </Show>
        </WidgetCard>

        <WidgetCard title="Calidad de datos" span="half">
          <div class={styles.dq}>
            <For each={dataQualityRows()}>
              {(row) => (
                <div class={styles.dqRow}>
                  <span class={styles.dqLabel}>{row.label}</span>
                  <span
                    class={styles.dqValue}
                    classList={{ [styles.dqAlert]: row.value > 0 }}
                  >
                    {formatInteger(row.value)}
                  </span>
                </div>
              )}
            </For>
          </div>
        </WidgetCard>
      </div>

      <div class={styles.tabs}>
        <div class={styles.tabBar} role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab() === "cohort"}
            class={styles.tabButton}
            classList={{ [styles.tabActive]: tab() === "cohort" }}
            onClick={() => setTab("cohort")}
          >
            Cohortes (Hoja4)
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab() === "accounts"}
            class={styles.tabButton}
            classList={{ [styles.tabActive]: tab() === "accounts" }}
            onClick={() => setTab("accounts")}
          >
            Atribución por RUC
          </button>
          <Show when={tab() === "accounts"}>
            <label class={styles.tabToggle}>
              <input
                type="checkbox"
                checked={missingOnly()}
                onChange={(e) => setMissingOnly(e.currentTarget.checked)}
              />
              Solo faltantes
            </label>
          </Show>
        </div>

        <Show
          when={tab() === "cohort"}
          fallback={
            <AccountsGrid
              filters={{ ...filters(), missingEnrichment: missingOnly() }}
              options={overview().options}
            />
          }
        >
          <CohortGrid filters={filters()} />
        </Show>
      </div>
    </AppPage>
  );
}

function Empty() {
  return (
    <p class="px-1 py-6 text-sm text-muted-foreground">
      Aún no hay datos. Importa un reporte GPV para empezar.
    </p>
  );
}
