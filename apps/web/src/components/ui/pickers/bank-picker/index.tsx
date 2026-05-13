import { createMemo, createSignal, For } from "solid-js";

import Search from "~/components/icons/search";
import { useDismissibleLayer } from "~/components/ui/utilities/use-dismissible-layer";
import { ABONO_BANKS, type AbonoBank } from "~/contracts/workflow";

import styles from "./styles.module.css";

export interface BankPickerProps {
  onSelect: (bank: AbonoBank) => void;
  onClose: () => void;
}

export function BankPicker(props: BankPickerProps) {
  const [search, setSearch] = createSignal("");
  let containerRef: HTMLDivElement | undefined;

  const filteredBanks = createMemo(() => {
    const term = search().toLowerCase().trim();
    if (!term) return ABONO_BANKS;
    return ABONO_BANKS.filter((bank) => bank.toLowerCase().includes(term));
  });

  useDismissibleLayer({
    enabled: () => true,
    onDismiss: () => props.onClose(),
    getContainer: () => containerRef,
  });

  function handleSelect(bank: AbonoBank) {
    props.onSelect(bank);
    props.onClose();
  }

  return (
    <div ref={(el) => (containerRef = el)} class={styles.container}>
      <div class={styles.searchWrapper}>
        <Search size={14} />
        <input
          type="text"
          class={styles.searchInput}
          placeholder="Buscar banco..."
          aria-label="Buscar banco"
          value={search()}
          onInput={(e) => setSearch(e.currentTarget.value)}
          autofocus
        />
      </div>
      <ul class={styles.list}>
        <For
          each={filteredBanks()}
          fallback={
            <li class={styles.loadingHint}>No se encontraron bancos</li>
          }
        >
          {(bank) => (
            <li>
              <button
                type="button"
                class={styles.item}
                onClick={() => handleSelect(bank)}
              >
                <span>{bank}</span>
              </button>
            </li>
          )}
        </For>
      </ul>
    </div>
  );
}
