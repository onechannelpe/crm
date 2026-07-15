import { For, type JSX } from "solid-js";

import { Select } from "~/components/ui/input/select";
import { FilterBar } from "~/components/ui/layout/filter-bar";
import type {
  BookFilter,
  FilterOptions,
} from "~/contracts/merchant-stats/views";

import { formatMonth } from "../format";

import styles from "./record-filter-bar.module.css";

const ALL = "";

interface RecordFilterBarProps {
  options: FilterOptions;
  filter: BookFilter;
  onChange: (patch: Partial<BookFilter>) => void;
  // Grid-specific controls, e.g. the attribution queue's confidence selector.
  children?: JSX.Element;
}

// Zonal and vendedor select against credit, which lives on one table. Mes and
// producto mean a different column at each grain, so each query applies them to
// its own -- a filter is honored everywhere, but not by one shared expression.
export function RecordFilterBar(props: RecordFilterBarProps) {
  const value = (raw: string) => (raw === ALL ? undefined : raw);

  return (
    <FilterBar>
      <div class={styles.filter}>
        <Select
          aria-label="Zonal"
          value={props.filter.branchId ?? ALL}
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
          value={props.filter.sellerUserId ?? ALL}
          onChange={(event) =>
            props.onChange({ sellerUserId: value(event.currentTarget.value) })
          }
        >
          <option value={ALL}>Todos los vendedores</option>
          <For each={props.options.sellers}>
            {(seller) => <option value={seller.userId}>{seller.name}</option>}
          </For>
        </Select>
      </div>

      <div class={styles.filter}>
        <Select
          aria-label="Mes"
          value={props.filter.month ?? ALL}
          onChange={(event) =>
            props.onChange({ month: value(event.currentTarget.value) })
          }
        >
          <option value={ALL}>Todos los meses</option>
          <For each={props.options.months}>
            {(month) => <option value={month}>{formatMonth(month)}</option>}
          </For>
        </Select>
      </div>

      <div class={styles.filter}>
        <Select
          aria-label="Producto"
          value={props.filter.product ?? ALL}
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
