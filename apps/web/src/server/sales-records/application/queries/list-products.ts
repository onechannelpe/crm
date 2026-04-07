import type { SalesRecordReadContext } from "../../infrastructure/read-context";
import type { SalesRecordProductOptionView } from "../contracts";

export async function listProducts(
  deps: SalesRecordReadContext,
): Promise<SalesRecordProductOptionView[]> {
  return deps.repos.products.findActive();
}
