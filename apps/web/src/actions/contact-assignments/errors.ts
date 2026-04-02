import { throwDomainError } from "~/actions/throw-domain-error";
import type { DomainError } from "~/server/shared/domain-error";

export function mapContactAssignmentError(error: DomainError): never {
  throwDomainError(error);
}
