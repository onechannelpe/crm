import { domainError, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";
import type {
  ModalidadCobro,
  ProductScope,
  VenueDigitalConfig,
} from "~/workflow/contracts/lead-schema";

type LeadDigitalPolicy = {
  linkScope: ProductScope;
  linkUrl: string | null;
  onlineScope: ProductScope;
  onlineUrl: string | null;
  onlineModalidad: ModalidadCobro | null;
};

export type NormalizedVenueDigitalConfig = {
  linkUrl: string | null;
  onlineUrl: string | null;
  onlineModalidad: ModalidadCobro | null;
};

export function validateLeadDigitalPolicy(
  policy: LeadDigitalPolicy,
): Result<void, DomainError> {
  if (policy.linkScope === "none" && policy.linkUrl !== null) {
    return Err(
      domainError(
        "validation",
        "invalid_link_policy",
        "Link URL must be empty when link scope is none",
      ),
    );
  }
  if (policy.linkScope === "shared" && !policy.linkUrl?.trim()) {
    return Err(
      domainError(
        "validation",
        "missing_link_shared_url",
        "Link URL is required when link scope is shared",
      ),
    );
  }
  if (policy.linkScope === "per_venue" && policy.linkUrl !== null) {
    return Err(
      domainError(
        "validation",
        "invalid_link_policy",
        "Link shared URL must be empty when link scope is per_venue",
      ),
    );
  }

  if (
    policy.onlineScope === "none" &&
    (policy.onlineUrl !== null || policy.onlineModalidad !== null)
  ) {
    return Err(
      domainError(
        "validation",
        "invalid_online_policy",
        "Online shared fields must be empty when online scope is none",
      ),
    );
  }
  if (
    policy.onlineScope === "shared" &&
    (!policy.onlineUrl?.trim() || policy.onlineModalidad === null)
  ) {
    return Err(
      domainError(
        "validation",
        "missing_online_shared_config",
        "Online shared URL and modalidad are required when online scope is shared",
      ),
    );
  }
  if (
    policy.onlineScope === "per_venue" &&
    (policy.onlineUrl !== null || policy.onlineModalidad !== null)
  ) {
    return Err(
      domainError(
        "validation",
        "invalid_online_policy",
        "Online shared fields must be empty when online scope is per_venue",
      ),
    );
  }

  return Ok(undefined);
}

export function validateVenueDigitalConfig(input: {
  policy: Pick<LeadDigitalPolicy, "linkScope" | "onlineScope">;
  config?: VenueDigitalConfig;
}): Result<NormalizedVenueDigitalConfig, DomainError> {
  const linkUrl = input.config?.linkUrl?.trim() || null;
  const onlineUrl = input.config?.onlineUrl?.trim() || null;
  const onlineModalidad = input.config?.onlineModalidad ?? null;

  if (input.policy.linkScope !== "per_venue" && linkUrl !== null) {
    return Err(
      domainError(
        "validation",
        "invalid_link_venue_config",
        "Venue link URL is only allowed when link scope is per_venue",
      ),
    );
  }
  if (input.policy.linkScope === "per_venue" && linkUrl === null) {
    return Err(
      domainError(
        "validation",
        "missing_link_venue_url",
        "Venue link URL is required when link scope is per_venue",
      ),
    );
  }

  if (
    input.policy.onlineScope !== "per_venue" &&
    (onlineUrl !== null || onlineModalidad !== null)
  ) {
    return Err(
      domainError(
        "validation",
        "invalid_online_venue_config",
        "Venue online config is only allowed when online scope is per_venue",
      ),
    );
  }
  if (
    input.policy.onlineScope === "per_venue" &&
    (onlineUrl === null || onlineModalidad === null)
  ) {
    return Err(
      domainError(
        "validation",
        "missing_online_venue_config",
        "Venue online URL and modalidad are required when online scope is per_venue",
      ),
    );
  }

  return Ok({ linkUrl, onlineUrl, onlineModalidad });
}
