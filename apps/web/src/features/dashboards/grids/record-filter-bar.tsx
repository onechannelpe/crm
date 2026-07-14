import { For, type JSX } from "solid-js";

import { Select } from "~/components/ui/input/select";
import { FilterBar } from "~/components/ui/layout/filter-bar";
import type {
  MerchantStatsFilterOptions,
  RecordFilters,
} from "~/server/merchant-stats/read/contracts";

import { formatMonth } from "../format";

import styles from "./record-filter-bar.module.css";

const ALL = "";

interface RecordFilterBarProps {
  options: MerchantStatsFilterOptions;
  filters: RecordFilters;
  onChange: (patch: Partial<RecordFilters>) => void;
  // Grid-specific controls, e.g. the attribution queue's "solo faltantes".
  children?: JSX.Element;
}

// Narrowing belongs to the record surfaces: here a reader is hunting specific
// rows, so a filter answers the question they came with. The performance tab
// groups instead of filtering, which is why it carries no bar of its own.
//
// Every control here is honored by both getCohortReport and getMerchantAccounts.
// Adding one that only some queries read is what produced the old page's "one
// bar, five queries, three different honored subsets".
export function RecordFilterBar(props: RecordFilterBarProps) {
  const value = (raw: string) => (raw === ALL ? undefined : raw);

  return (
    <FilterBar>
      <div class={styles.filter}>
        <Select
          aria-label="Zonal"
          value={props.filters.branchId ?? ALL}
          onChange={(event) =>
            props.onChange({ branchId: value(event.currentTarget.value) })
          }
        >
          <option value={ALL}>Todos los zonales</option>
          <For each={props.options.branches}>
            {(branch) => <option value={branch.id}>{branch.name}</option>}
          </For>
        </Select>
      </div>

      <div class={styles.filter}>
        <Select
          aria-label="Vendedor"
          value={props.filters.sellerKey ?? ALL}
          onChange={(event) =>
            props.onChange({ sellerKey: value(event.currentTarget.value) })
          }
        >
          <option value={ALL}>Todos los vendedores</option>
          <For each={props.options.sellers}>
            {(seller) => <option value={seller.key}>{seller.name}</option>}
          </For>
        </Select>
      </div>

      <div class={styles.filter}>
        <Select
          aria-label="Mes de venta"
          value={props.filters.saleMonth ?? ALL}
          onChange={(event) =>
            props.onChange({ saleMonth: value(event.currentTarget.value) })
          }
        >
          <option value={ALL}>Todos los meses</option>
          <For each={props.options.saleMonths}>
            {(month) => <option value={month}>{formatMonth(month)}</option>}
          </For>
        </Select>
      </div>

      <div class={styles.filter}>
        <Select
          aria-label="Producto"
          value={props.filters.product ?? ALL}
          onChange={(event) =>
            props.onChange({ product: value(event.currentTarget.value) })
          }
        >
          <option value={ALL}>Todos los productos</option>
          <For each={props.options.products}>
            {(product) => <option value={product}>{product}</option>}
          </For>
        </Select>
      </div>

      {props.children}
    </FilterBar>
  );
}
