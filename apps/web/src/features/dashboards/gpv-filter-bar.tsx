import { createAsync } from "@solidjs/router";
import { For, type JSX, Suspense } from "solid-js";

import { Select } from "~/components/ui/input/select";
import { FilterBar } from "~/components/ui/layout/filter-bar";
import type { FilterOptions } from "~/contracts/merchant-stats/views";
import { merchantFilterOptionsQuery } from "~/lib/queries/dashboards";

import { formatMonth } from "./format";
import type { GpvView } from "./gpv-view";

import styles from "./gpv-filter-bar.module.css";

const ALL = "";

export function GpvFilterBar(props: { view: GpvView; children?: JSX.Element }) {
  return (
    <Suspense fallback={<FilterBar class={styles.bar}> </FilterBar>}>
      <Fields view={props.view}>{props.children}</Fields>
    </Suspense>
  );
}

function Fields(props: { view: GpvView; children?: JSX.Element }) {
  const options = createAsync(() => merchantFilterOptionsQuery());
  const filter = props.view.filter;
  const set = props.view.setFilter;
  const pick = (raw: string) => (raw === ALL ? undefined : raw);
  const opts = (): FilterOptions =>
    options() ?? { branches: [], sellers: [], months: [], products: [] };

  return (
    <FilterBar class={styles.bar}>
      <div class={styles.filter}>
        <Select
          aria-label="Zonal"
          value={filter().branchId ?? ALL}
          onChange={(event) =>
            set({ branchId: pick(event.currentTarget.value) })
          }
        >
          <option value={ALL}>Todos los zonales</option>
          <For each={opts().branches}>
            {(branch) => <option value={branch.id}>{branch.name}</option>}
          </For>
        </Select>
      </div>

      <div class={styles.filter}>
        <Select
          aria-label="Vendedor"
          value={filter().sellerUserId ?? ALL}
          onChange={(event) =>
            set({ sellerUserId: pick(event.currentTarget.value) })
          }
        >
          <option value={ALL}>Todos los vendedores</option>
          <For each={opts().sellers}>
            {(seller) => <option value={seller.userId}>{seller.name}</option>}
          </For>
        </Select>
      </div>

      <div class={styles.filter}>
        <Select
          aria-label="Mes"
          value={filter().month ?? ALL}
          onChange={(event) => set({ month: pick(event.currentTarget.value) })}
        >
          <option value={ALL}>Todos los meses</option>
          <For each={opts().months}>
            {(month) => <option value={month}>{formatMonth(month)}</option>}
          </For>
        </Select>
      </div>

      <div class={styles.filter}>
        <Select
          aria-label="Producto"
          value={filter().product ?? ALL}
          onChange={(event) =>
            set({ product: pick(event.currentTarget.value) })
          }
        >
          <option value={ALL}>Todos los productos</option>
          <For each={opts().products}>
            {(product) => <option value={product}>{product}</option>}
          </For>
        </Select>
      </div>

      {props.children}
    </FilterBar>
  );
}
