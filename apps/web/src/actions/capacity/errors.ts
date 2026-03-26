import { throwDomainError } from "~/actions/throw-domain-error";
import type { DomainError } from "~/server/shared/domain-error";

export function mapCapacityError(error: DomainError): never {
  throwDomainError(error);
}
