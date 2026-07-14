import { createAsync, revalidate } from "@solidjs/router";
import { createMemo, createSignal, For, Show } from "solid-js";

import { AppPage } from "~/components/layout/page";
import { Button } from "~/components/ui/input/button";
import { Select } from "~/components/ui/input/select";
import { FilterBar } from "~/components/ui/layout/filter-bar";
import { DashboardGrid, GridItem } from "~/features/page-layout/dashboard-grid";
import {
  WidgetRenderer,
  type WidgetStatus,
} from "~/features/page-layout/widget-renderer";
import { WidgetShell } from "~/features/page-layout/widget-shell";
import { businessStatsOverviewQuery } from "~/lib/queries/dashboards";
import type { BusinessStatsFilters } from "~/server/merchant-stats/read/contracts";

import { formatMonth } from "./format";
import { AccountsGrid } from "./grids/accounts-grid";
import { CohortGrid } from "./grids/cohort-grid";
import { UploadReport } from "./upload/upload-report";
import {
  buildMerchantGpvWidgets,
  type DashboardWidget,
} from "./widgets/dashboard-widget";
import { WidgetContent } from "./widgets/widget-content";

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

function widgetStatus(widget: DashboardWidget): WidgetStatus {
  if (widget.type === "line") return widget.points.length ? "ready" : "empty";
  if (widget.type === "bar") return widget.rows.length ? "ready" : "empty";
  return "ready";
}

export function MerchantGpvDashboard() {
  const [month, setMonth] = createSignal("");
  const [branchId, setBranchId] = createSignal("");
  const [sellerUserId, setSellerUserId] = createSignal("");
  const [product, setProduct] = createSignal("");
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

  const widgets = createMemo(() => buildMerchantGpvWidgets(overview()));

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
        <WidgetShell title="Importar reporte GPV">
          <UploadReport onClose={() => setShowUpload(false)} />
        </WidgetShell>
      </Show>

      <DashboardGrid>
        <For each={widgets()}>
          {(widget) => (
            <GridItem span={widget.span}>
              <WidgetRenderer
                title={widget.title}
                subtitle={widget.subtitle}
                status={widgetStatus(widget)}
              >
                <WidgetContent widget={widget} />
              </WidgetRenderer>
            </GridItem>
          )}
        </For>

        <GridItem span="full">
          <WidgetRenderer title="Cohortes de ventas">
            <CohortGrid filters={filters()} />
          </WidgetRenderer>
        </GridItem>

        <GridItem span="full">
          <WidgetRenderer
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
          </WidgetRenderer>
        </GridItem>
      </DashboardGrid>
    </AppPage>
  );
}
