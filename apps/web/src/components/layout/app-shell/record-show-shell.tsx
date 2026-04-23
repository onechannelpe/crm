import { useParams, type RouteSectionProps } from "@solidjs/router";

import { RecordShowHeader } from "~/features/record-show/header/record-show-header";

import shellStyles from "~/components/layout/shell.module.css";

export function RecordShowShell(props: RouteSectionProps) {
  const params = useParams<{ leadId: string }>();

  return (
    <div class={shellStyles.main}>
      <RecordShowHeader leadId={Number(params.leadId)} />
      <main class={shellStyles.settingsBody}>{props.children}</main>
    </div>
  );
}
