import { onMount, Show } from "solid-js";

import Building2 from "~/components/icons/building-2";
import { TextInput } from "~/components/ui/input/text-input";

import { PageInfoLayout } from "../../top-bar/page-info-layout";
import { useLeadRecordPageState } from "./state";

export function RecordPageInfo() {
  const { mode, label, draftRuc, setRuc, pageState } = useLeadRecordPageState();
  let inputRef: HTMLInputElement | undefined;

  onMount(() => {
    if (mode() === "create") {
      inputRef?.focus();
    }
  });

  const isCreateMode = () => mode() === "create";
  const title = () => pageState().title;
  const rucValue = () => draftRuc();

  return (
    <PageInfoLayout
      icon={<Building2 size={14} />}
      title={
        <Show when={isCreateMode()} fallback={title()}>
          <TextInput
            ref={(el) => {
              inputRef = el;
            }}
            sizeVariant="sm"
            inheritFontStyles
            value={rucValue()}
            onChange={setRuc}
            placeholder="RUC"
            inputmode="numeric"
            pattern="[0-9]*"
            maxlength={11}
            autocomplete="off"
            aria-label="RUC"
          />
        </Show>
      }
      label={label()}
    />
  );
}
