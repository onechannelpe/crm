import { onMount } from "solid-js";

import Building2 from "~/components/icons/building-2";

import { PageInfoLayout } from "../../top-bar/page-info-layout";
import { useLeadCreatePageState } from "./state";

import pageInfoLayoutStyles from "../../top-bar/page-info-layout.module.css";

export function LeadCreatePageInfo() {
  const { pageState, setRuc, label } = useLeadCreatePageState();
  let inputRef: HTMLInputElement | undefined;

  onMount(() => {
    inputRef?.focus();
  });

  return (
    <PageInfoLayout
      icon={<Building2 size={14} />}
      title={
        <input
          ref={(el) => {
            inputRef = el;
          }}
          class={pageInfoLayoutStyles.inlineInput}
          value={pageState().draft.ruc}
          onInput={(e) => setRuc(e.currentTarget.value)}
          placeholder="RUC"
          inputmode="numeric"
          pattern="[0-9]*"
          maxlength={11}
          autocomplete="off"
          aria-label="RUC"
        />
      }
      label={label()}
    />
  );
}
