import { useAction } from "@solidjs/router";

import { UserPicker } from "~/components/ui/pickers/user-picker";
import { toAppError } from "~/lib/app-errors";

import { reassignLeadMutation } from "../data/mutations";
import { assignableExecutivesQuery } from "../data/queries";

export interface ExecutivePickerProps {
  leadId: number;
  currentUserId: number;
  onSelect: () => void;
  onClose: () => void;
}

export function ExecutivePicker(props: ExecutivePickerProps) {
  const reassign = useAction(reassignLeadMutation);

  async function handleSelect(executiveId: number) {
    try {
      await reassign({ leadId: props.leadId, newExecutiveId: executiveId });
      props.onSelect();
    } catch (err) {
      throw new Error(toAppError(err, "Error al reasignar").publicMessage, {
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
