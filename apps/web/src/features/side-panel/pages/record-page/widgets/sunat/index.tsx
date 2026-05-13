import { For, Show } from "solid-js";

import type { LeadDetailView } from "~/contracts/workflow/views";
import { FieldChipList } from "~/features/side-panel/components/field-chip-list";
import {
  RelationList,
  RelationRow,
} from "~/features/side-panel/components/relation-list";
import {
  Widget,
  WidgetActions,
  WidgetBody,
  WidgetHeader,
  WidgetOptionsButton,
  WidgetTitle,
} from "~/features/side-panel/components/widget-card";

export function SunatWidget(props: { data?: LeadDetailView }) {
  const activities = () =>
    props.data?.sourceStatus.sunat.economicActivities ?? [];
  const sunatStatus = () => props.data?.sourceStatus.sunat.status;

  return (
    <Widget>
      <WidgetHeader>
        <WidgetTitle text="Verificacion SUNAT" />
        <WidgetActions>
          <WidgetOptionsButton>...</WidgetOptionsButton>
        </WidgetActions>
      </WidgetHeader>
      <WidgetBody>
        <RelationList>
          <Show
            when={props.data}
            fallback={
              <RelationRow>
                <span>Se encola al registrar el lead</span>
              </RelationRow>
            }
          >
            <RelationRow>
              <span>Estado</span>
              <span>{sunatStatus() ?? "—"}</span>
            </RelationRow>
            <Show when={activities().length > 0}>
              <RelationRow>
                <span>Actividades economicas</span>
              </RelationRow>
              <For each={activities()}>
                {(activity) => (
                  <RelationRow>
                    <FieldChipList
                      emptyLabel="—"
                      items={[
                        {
                          id: `${activity.role}-${activity.order ?? 0}-${activity.code}`,
                          label: activity.code,
                          tone:
                            activity.role === "principal"
                              ? "positive"
                              : "neutral",
                          tooltip: `${activity.label} - ${activity.description}`,
                        },
                      ]}
                    />
                  </RelationRow>
                )}
              </For>
            </Show>
          </Show>
        </RelationList>
      </WidgetBody>
    </Widget>
  );
}
