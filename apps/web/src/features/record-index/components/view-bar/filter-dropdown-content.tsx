import { Match, Switch } from "solid-js";

import { useRecordIndexModelContext } from "../../context/model-context";
import { useRecordIndexSetup } from "../../context/setup-context";
import { AnyFieldSearchMenu } from "./any-field-search-menu";
import { FilterFieldSelectMenu } from "./filter-field-select-menu";
import { FilterValueMenu } from "./filter-value-menu";

type FilterDropdownContentProps = {
  onClose: () => void;
};

export function FilterDropdownContent(props: FilterDropdownContentProps) {
  const model = useRecordIndexModelContext();
  const setup = useRecordIndexSetup();

  const selectedField = () => {
    const panel = model.filtering.panel();
    if (panel.kind !== "field-value") {
      return undefined;
    }

    return setup.filter?.fields.find((field) => field.id === panel.fieldId);
  };

  return (
    <Switch>
      <Match
        when={
          model.filtering.panel().kind === "any-field-search"
            ? model.anyFieldFilter
            : undefined
        }
      >
        {(anyFieldFilter) => (
          <AnyFieldSearchMenu
            anyFieldFilter={anyFieldFilter()}
            onClose={props.onClose}
          />
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
