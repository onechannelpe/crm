import { useAction } from "@solidjs/router";

import { UserPicker } from "~/components/ui/pickers/user-picker";
import { actionErrorMessage } from "~/lib/wire-error";

import { reassignLeadMutation } from "../../data/command-mutations";
import { assignableExecutivesQuery } from "../../data/queries";
import { revalidateWorkflowLead } from "../../data/revalidate-workflow";

export interface ExecutivePickerProps {
  leadId: string;
  currentUserId: number;
  onSelect: () => void;
  onClose: () => void;
}

export function ExecutivePicker(props: ExecutivePickerProps) {
  const reassign = useAction(reassignLeadMutation);

  async function handleSelect(executiveId: number) {
    try {
      await reassign({ leadId: props.leadId, newExecutiveId: executiveId });
      await revalidateWorkflowLead(props.leadId);
      props.onSelect();
    } catch (err) {
      throw new Error(actionErrorMessage(err), {
        cause: err,
      });
    }
  }

  return (
    <UserPicker
      currentUserId={props.currentUserId}
      fetchUsers={(search) =>
        assignableExecutivesQuery({ leadId: props.leadId, search, limit: 50 })
      }
      onSelect={handleSelect}
      onClose={props.onClose}
    />
  );
}
