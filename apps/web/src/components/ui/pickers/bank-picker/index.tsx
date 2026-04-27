import { createMemo, createSignal, For, onCleanup, onMount } from "solid-js";

import Search from "~/components/icons/search";
import { ABONO_BANKS, type AbonoBank } from "~/workflow/contracts/lead-schema";

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

  onMount(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target;
      if (
        containerRef &&
        target instanceof Node &&
        !containerRef.contains(target)
      ) {
        props.onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    onCleanup(() =>
      document.removeEventListener("mousedown", handleClickOutside),
    );
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
