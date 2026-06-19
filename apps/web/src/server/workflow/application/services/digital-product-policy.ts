import { fail, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";
import type {
  VenueDigitalConfig,
  CollectionMode,
  ProductScope,
} from "~/server/workflow/types";

type LinkConfig = { url: string };
type OnlineConfig = { url: string; collectionMode: CollectionMode };

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
  linkUrl: string | null;
  onlineUrl: string | null;
  onlineCollectionMode: CollectionMode | null;
};

export function parseDigitalPolicy(raw: {
  linkScope: ProductScope;
  linkUrl: string | null;
  onlineScope: ProductScope;
  onlineUrl: string | null;
  onlineCollectionMode: CollectionMode | null;
}): Result<DigitalPolicy, DomainError> {
  const linkUrl = raw.linkUrl?.trim() || null;
  const onlineUrl = raw.onlineUrl?.trim() || null;

  let link: LinkPolicy;
  if (raw.linkScope === "none") {
    if (linkUrl !== null) {
      return Err(fail("invalid_link_policy"));
    }
    link = { scope: "none" };
  } else if (raw.linkScope === "shared") {
    if (!linkUrl) {
      return Err(fail("missing_link_shared_url"));
    }
    link = { scope: "shared", config: { url: linkUrl } };
  } else {
    if (linkUrl !== null) {
      return Err(fail("invalid_link_policy"));
    }
    link = { scope: "per_venue" };
  }

  let online: OnlinePolicy;
  if (raw.onlineScope === "none") {
    if (onlineUrl !== null || raw.onlineCollectionMode !== null) {
      return Err(fail("invalid_online_policy"));
    }
    online = { scope: "none" };
  } else if (raw.onlineScope === "shared") {
    if (!onlineUrl || raw.onlineCollectionMode === null) {
      return Err(fail("missing_online_shared_config"));
    }
    online = {
      scope: "shared",
      config: { url: onlineUrl, collectionMode: raw.onlineCollectionMode },
    };
  } else {
    if (onlineUrl !== null || raw.onlineCollectionMode !== null) {
      return Err(fail("invalid_online_policy"));
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
  const onlineCollectionMode = raw?.onlineCollectionMode ?? null;

  if (scopes.linkScope !== "per_venue" && linkUrl !== null) {
    return Err(fail("invalid_link_venue_config"));
  }
  if (scopes.linkScope === "per_venue" && linkUrl === null) {
    return Err(fail("missing_link_venue_url"));
  }

  if (
    scopes.onlineScope !== "per_venue" &&
    (onlineUrl !== null || onlineCollectionMode !== null)
  ) {
    return Err(fail("invalid_online_venue_config"));
  }
  if (
    scopes.onlineScope === "per_venue" &&
    (onlineUrl === null || onlineCollectionMode === null)
  ) {
    return Err(fail("missing_online_venue_config"));
  }

  return Ok({
    link: linkUrl !== null ? { url: linkUrl } : null,
    online:
      onlineUrl !== null && onlineCollectionMode !== null
        ? { url: onlineUrl, collectionMode: onlineCollectionMode }
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
      onlineCollectionMode: venue.onlineCollectionMode,
    });
    if (!check.ok) {
      return Err(
        fail("invalid_existing_venue_digital_config", {
          details: { venueId: venue.id, cause: check.error.code },
        }),
      );
    }
  }
  return Ok(undefined);
}

export function toDigitalPolicyFields(policy: DigitalPolicy): {
  linkScope: ProductScope;
  linkUrl: string | null;
  onlineScope: ProductScope;
  onlineUrl: string | null;
  onlineCollectionMode: CollectionMode | null;
} {
  return {
    linkScope: policy.link.scope,
    linkUrl: policy.link.scope === "shared" ? policy.link.config.url : null,
    onlineScope: policy.online.scope,
    onlineUrl:
      policy.online.scope === "shared" ? policy.online.config.url : null,
    onlineCollectionMode:
      policy.online.scope === "shared"
        ? policy.online.config.collectionMode
        : null,
  };
}

export function toVenueDigitalInsert(fields: VenueDigitalFields): {
  linkUrl: string | null;
  onlineUrl: string | null;
  onlineCollectionMode: CollectionMode | null;
} {
  return {
    linkUrl: fields.link?.url ?? null,
    onlineUrl: fields.online?.url ?? null,
    onlineCollectionMode: fields.online?.collectionMode ?? null,
  };
}
