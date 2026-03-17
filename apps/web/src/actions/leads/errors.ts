import { throwDomainError } from "~/actions/throw-domain-error";
import type { DomainError } from "~/server/shared/domain-error";

export function mapLeadError(error: DomainError): never {
  throwDomainError(error);
}
