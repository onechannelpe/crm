import { RecordIndexProvider } from "../context/record-index-context";
import { createRecordIndexController } from "../model/controller";
import type { RecordIndexDefinition } from "../model/definition";
import { RecordIndexHeader } from "./header";
import { RecordIndexPageHeader } from "./record-index-page-header";
import { RecordIndexTableContainer } from "./table-container";

export function RecordIndexScreen<T extends { id: string }>(props: {
  definition: RecordIndexDefinition<T>;
}) {
  const controller = createRecordIndexController(props.definition);

  return (
    <RecordIndexProvider value={controller}>
      <div class={controller.definition.class}>
        <RecordIndexPageHeader
          object={controller.definition.object}
          createAction={controller.definition.createAction}
        />
        <RecordIndexHeader />
        <RecordIndexTableContainer controller={controller} />
      </div>
    </RecordIndexProvider>
  );
}
