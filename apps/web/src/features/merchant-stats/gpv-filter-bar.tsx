"use client";

import { For, type JSX, Suspense } from "solid-js";

import { Select } from "~/components/ui/input/select";
import { FilterBar } from "~/components/ui/layout/filter-bar";
import { parseCalendarMonth } from "~/domain/time/calendar-date";

import { formatMonth } from "./format";
import type { GpvView } from "./gpv-view";
import { useMerchantFilterOptions } from "./use-merchant-filter-options";

import styles from "./gpv-filter-bar.module.css";

const ALL = "";

function optional(value: string): string | undefined {
  return value === ALL ? undefined : value;
}

export function GpvFilterBar(props: { view: GpvView; children?: JSX.Element }) {
  return (
    <Suspense fallback={<FilterBar class={styles.bar} />}>
      <Fields view={props.view}>{props.children}</Fields>
    </Suspense>
  );
}

function Fields(props: { view: GpvView; children?: JSX.Element }) {
  const options = useMerchantFilterOptions();

  return (
    <FilterBar class={styles.bar}>
      <div class={styles.filter}>
        <Select
          aria-label="Zonal"
          value={props.view.filter().branchId ?? ALL}
          onChange={(event) =>
            props.view.setFilter({
              branchId: optional(event.currentTarget.value),
            })
          }
        >
          <option value={ALL}>Todos los zonales</option>
          <For each={options().branches}>
            {(branch) => <option value={branch.id}>{branch.name}</option>}
          </For>
        </Select>
      </div>

      <div class={styles.filter}>
        <Select
          aria-label="Vendedor"
          value={props.view.filter().sellerUserId ?? ALL}
          onChange={(event) =>
            props.view.setFilter({
              sellerUserId: optional(event.currentTarget.value),
            })
          }
        >
          <option value={ALL}>Todos los vendedores</option>
          <For each={options().sellers}>
            {(seller) => <option value={seller.userId}>{seller.name}</option>}
          </For>
        </Select>
      </div>

      <div class={styles.filter}>
        <Select
          aria-label="Mes"
          value={props.view.filter().month ?? ALL}
          onChange={(event) =>
            props.view.setFilter({
              month: parseCalendarMonth(event.currentTarget.value) ?? undefined,
            })
          }
        >
          <option value={ALL}>Todos los meses</option>
          <For each={options().months}>
            {(month) => <option value={month}>{formatMonth(month)}</option>}
          </For>
        </Select>
      </div>

      <div class={styles.filter}>
        <Select
          aria-label="Producto"
          value={props.view.filter().product ?? ALL}
          onChange={(event) =>
            props.view.setFilter({
              product: optional(event.currentTarget.value),
            })
          }
        >
          <option value={ALL}>Todos los productos</option>
          <For each={options().products}>
            {(product) => <option value={product}>{product}</option>}
          </For>
        </Select>
      </div>

      {props.children}
    </FilterBar>
  );
}
