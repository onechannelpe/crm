import { Match, Switch } from "solid-js";

import { useRecordIndex } from "../../context/record-index-context";
import { AnyFieldSearchMenu } from "./any-field-search-menu";
import { FilterFieldSelectMenu } from "./filter-field-select-menu";
import { FilterValueMenu } from "./filter-value-menu";

type FilterDropdownContentProps = {
  onClose: () => void;
};

export function FilterDropdownContent(props: FilterDropdownContentProps) {
  const recordIndex = useRecordIndex();

  const selectedField = () => {
    const panel = recordIndex.filtering?.panel();
    if (panel?.kind !== "field-value") {
      return undefined;
    }

    return recordIndex.definition.filter?.catalog.fields.find(
      (field) => field.id === panel.fieldId,
    );
  };

  return (
    <Switch>
      <Match
        when={
          recordIndex.filtering?.panel().kind === "any-field-search"
            ? recordIndex.search
            : undefined
        }
      >
        {(search) => (
          <AnyFieldSearchMenu search={search()} onClose={props.onClose} />
        )}
      </Match>
      <Match when={selectedField()}>
        {(field) => <FilterValueMenu field={field()} onClose={props.onClose} />}
      </Match>
      <Match when>
        <FilterFieldSelectMenu onClose={props.onClose} />
      </Match>
    </Switch>
  );
}
