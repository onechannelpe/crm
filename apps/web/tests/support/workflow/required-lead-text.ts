import { expectOk } from "@tests/support/_core/assertions";

import {
  parseRequiredLeadText,
  type RequiredLeadText,
} from "~/server/workflow/parsers";

export function requiredLeadText(value: string): RequiredLeadText {
  return expectOk(
    parseRequiredLeadText(value, "required_text", "Text is required"),
  );
}
