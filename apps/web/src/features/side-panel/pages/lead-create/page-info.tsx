import { onMount } from "solid-js";

import Building2 from "~/components/icons/building-2";
import { TextInput } from "~/components/ui/input/text-input";

import { PageInfoLayout } from "../../top-bar/page-info-layout";
import { useLeadCreatePageState } from "./state";

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
        <TextInput
          ref={(el) => {
            inputRef = el;
          }}
          sizeVariant="sm"
          inheritFontStyles
          value={pageState().draft.ruc}
          onChange={setRuc}
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
