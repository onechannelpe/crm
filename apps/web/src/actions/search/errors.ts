import { throwDomainError } from "~/actions/throw-domain-error";
import type { DomainError } from "~/server/shared/domain-error";

export function mapSearchError(error: DomainError): never {
  throwDomainError(error);
}
