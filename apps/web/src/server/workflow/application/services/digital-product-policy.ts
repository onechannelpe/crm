import { domainError, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";
import type {
  ModalidadCobro,
  ProductScope,
  VenueDigitalConfig,
} from "~/workflow/contracts/lead-schema";

type LinkConfig = { url: string };
type OnlineConfig = { url: string; modalidad: ModalidadCobro };

export type LinkPolicy =
  | { scope: "none" }
  | { scope: "shared"; config: LinkConfig }
  | { scope: "per_venue" };

export type OnlinePolicy =
  | { scope: "none" }
  | { scope: "shared"; config: OnlineConfig }
  | { scope: "per_venue" };

export type DigitalPolicy = {
  link: LinkPolicy;
  online: OnlinePolicy;
};

export type VenueDigitalFields = {
  link: LinkConfig | null;
  online: OnlineConfig | null;
};

type VenueSnapshot = {
  id: string;
  nombreComercial: string;
  linkUrl: string | null;
  onlineUrl: string | null;
  onlineModalidad: ModalidadCobro | null;
};

export function parseDigitalPolicy(raw: {
  linkScope: ProductScope;
  linkUrl: string | null;
  onlineScope: ProductScope;
  onlineUrl: string | null;
  onlineModalidad: ModalidadCobro | null;
}): Result<DigitalPolicy, DomainError> {
  const linkUrl = raw.linkUrl?.trim() || null;
  const onlineUrl = raw.onlineUrl?.trim() || null;

  let link: LinkPolicy;
  if (raw.linkScope === "none") {
    if (linkUrl !== null) {
      return Err(
        domainError(
          "validation",
          "invalid_link_policy",
          "Link URL must be empty when link scope is none",
        ),
      );
    }
    link = { scope: "none" };
  } else if (raw.linkScope === "shared") {
    if (!linkUrl) {
      return Err(
        domainError(
          "validation",
          "missing_link_shared_url",
          "Link URL is required when link scope is shared",
        ),
      );
    }
    link = { scope: "shared", config: { url: linkUrl } };
  } else {
    if (linkUrl !== null) {
      return Err(
        domainError(
          "validation",
          "invalid_link_policy",
          "Link shared URL must be empty when link scope is per_venue",
        ),
      );
    }
    link = { scope: "per_venue" };
  }

  let online: OnlinePolicy;
  if (raw.onlineScope === "none") {
    if (onlineUrl !== null || raw.onlineModalidad !== null) {
      return Err(
        domainError(
          "validation",
          "invalid_online_policy",
          "Online shared fields must be empty when online scope is none",
        ),
      );
    }
    online = { scope: "none" };
  } else if (raw.onlineScope === "shared") {
    if (!onlineUrl || raw.onlineModalidad === null) {
      return Err(
        domainError(
          "validation",
          "missing_online_shared_config",
          "Online shared URL and modalidad are required when online scope is shared",
        ),
      );
    }
    online = {
      scope: "shared",
      config: { url: onlineUrl, modalidad: raw.onlineModalidad },
    };
  } else {
    if (onlineUrl !== null || raw.onlineModalidad !== null) {
      return Err(
        domainError(
          "validation",
          "invalid_online_policy",
          "Online shared fields must be empty when online scope is per_venue",
        ),
      );
    }
    online = { scope: "per_venue" };
  }

  return Ok({ link, online });
}

export function parseVenueDigitalFields(
  scopes: { linkScope: ProductScope; onlineScope: ProductScope },
  raw?: VenueDigitalConfig,
): Result<VenueDigitalFields, DomainError> {
  const linkUrl = raw?.linkUrl?.trim() || null;
  const onlineUrl = raw?.onlineUrl?.trim() || null;
  const onlineModalidad = raw?.onlineModalidad ?? null;

  if (scopes.linkScope !== "per_venue" && linkUrl !== null) {
    return Err(
      domainError(
        "validation",
        "invalid_link_venue_config",
        "Venue link URL is only allowed when link scope is per_venue",
      ),
    );
  }
  if (scopes.linkScope === "per_venue" && linkUrl === null) {
    return Err(
      domainError(
        "validation",
        "missing_link_venue_url",
        "Venue link URL is required when link scope is per_venue",
      ),
    );
  }

  if (
    scopes.onlineScope !== "per_venue" &&
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
    scopes.onlineScope === "per_venue" &&
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

  return Ok({
    link: linkUrl !== null ? { url: linkUrl } : null,
    online:
      onlineUrl !== null && onlineModalidad !== null
        ? { url: onlineUrl, modalidad: onlineModalidad }
        : null,
  });
}

export function validateDigitalAggregate(input: {
  policy: DigitalPolicy;
  venues: VenueSnapshot[];
}): Result<void, DomainError> {
  const scopes = {
    linkScope: input.policy.link.scope,
    onlineScope: input.policy.online.scope,
  };
  for (const venue of input.venues) {
    const check = parseVenueDigitalFields(scopes, {
      linkUrl: venue.linkUrl,
      onlineUrl: venue.onlineUrl,
      onlineModalidad: venue.onlineModalidad,
    });
    if (!check.ok) {
      return Err(
        domainError(
          "validation",
          "invalid_existing_venue_digital_config",
          `Venue "${venue.nombreComercial}" is incompatible with the selected digital scope policy`,
          { venueId: venue.id, cause: check.error.code },
        ),
      );
    }
  }
  return Ok(undefined);
}

export function toProfileDigitalFields(policy: DigitalPolicy): {
  linkScope: ProductScope;
  linkUrl: string | null;
  onlineScope: ProductScope;
  onlineUrl: string | null;
  onlineModalidad: ModalidadCobro | null;
} {
  return {
    linkScope: policy.link.scope,
    linkUrl: policy.link.scope === "shared" ? policy.link.config.url : null,
    onlineScope: policy.online.scope,
    onlineUrl:
      policy.online.scope === "shared" ? policy.online.config.url : null,
    onlineModalidad:
      policy.online.scope === "shared" ? policy.online.config.modalidad : null,
  };
}

export function toVenueDigitalInsert(fields: VenueDigitalFields): {
  linkUrl: string | null;
  onlineUrl: string | null;
  onlineModalidad: ModalidadCobro | null;
} {
  return {
    linkUrl: fields.link?.url ?? null,
    onlineUrl: fields.online?.url ?? null,
    onlineModalidad: fields.online?.modalidad ?? null,
  };
}
