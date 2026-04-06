import type { SalesRecordReadContext } from "../../infrastructure/read-context";
import type { SalesRecordProductOptionView } from "./views/sales-record-view";

export async function listProducts(
  deps: SalesRecordReadContext,
): Promise<SalesRecordProductOptionView[]> {
  return deps.repos.products.findActive();
}
