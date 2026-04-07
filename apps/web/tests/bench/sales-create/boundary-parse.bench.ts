import { bench, describe } from "vitest";

import { parseCreateSalesRecordDraftInput } from "~/actions/sales-records/input";

import { COMPONENT_ITERATIONS } from "../_shared/constants";
import { fixedIterations } from "../_shared/options";
import { SALES_CREATE_BASE_DRAFT_INPUT } from "./fixtures";

describe("sales create boundary parse benchmark", () => {
  bench(
    "boundary path: parse sales draft input",
    () => {
      const parsedInput = parseCreateSalesRecordDraftInput(
        SALES_CREATE_BASE_DRAFT_INPUT,
      );

      if (
        parsedInput.client.companyName !==
        SALES_CREATE_BASE_DRAFT_INPUT.client.companyName
      ) {
        throw new Error("expected parsed sales draft input");
      }
    },
    fixedIterations(COMPONENT_ITERATIONS),
  );
});
