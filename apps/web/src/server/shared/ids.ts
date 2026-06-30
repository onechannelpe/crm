import type { ColumnType } from "kysely";

declare const idBrand: unique symbol;

export type BrandedId<Name extends string> = string & {
  readonly [idBrand]: Name;
};

export type GeneratedId<TId extends string> = ColumnType<
  TId,
  TId | string | undefined,
  TId | string
>;

export type IdColumn<TId extends string> = ColumnType<
  TId,
  TId | string,
  TId | string
>;
export type NullableIdColumn<TId extends string> = ColumnType<
  TId | null,
  TId | string | null,
  TId | string | null
>;

export type UserId = BrandedId<"UserId">;
export type TeamId = BrandedId<"TeamId">;
export type BranchId = BrandedId<"BranchId">;
export type OrganizationId = BrandedId<"OrganizationId">;
export type PersonId = BrandedId<"PersonId">;
export type OrganizationPersonId = BrandedId<"OrganizationPersonId">;
export type ContactAssignmentId = BrandedId<"ContactAssignmentId">;
export type InteractionLogId = BrandedId<"InteractionLogId">;
export type CapacityRequestId = BrandedId<"CapacityRequestId">;
export type SearchReservationId = BrandedId<"SearchReservationId">;
export type LeadReservationId = BrandedId<"LeadReservationId">;
export type EventId = BrandedId<"EventId">;
export type WorkflowLeadId = BrandedId<"WorkflowLeadId">;
export type WorkflowRateProposalId = BrandedId<"WorkflowRateProposalId">;
export type WorkflowRateRevisionId = BrandedId<"WorkflowRateRevisionId">;
export type WorkflowArtifactId = BrandedId<"WorkflowArtifactId">;
export type FileAssetId = BrandedId<"FileAssetId">;
export type ArtifactDownloadTokenId = BrandedId<"ArtifactDownloadTokenId">;
export type WorkflowVenueId = BrandedId<"WorkflowVenueId">;
export type FulfillmentOrderId = BrandedId<"FulfillmentOrderId">;
export type IntegrationJobId = BrandedId<"IntegrationJobId">;
export type NotificationIntentId = BrandedId<"NotificationIntentId">;
export type NotificationDeliveryId = BrandedId<"NotificationDeliveryId">;
export type AppNotificationId = BrandedId<"AppNotificationId">;
export type CompanyRegistryRecordId = BrandedId<"CompanyRegistryRecordId">;
export type ExtensionHandoffId = BrandedId<"ExtensionHandoffId">;
export type UserInviteId = BrandedId<"UserInviteId">;

function assertNonEmptyStringId<Name extends string>(
  value: string,
  name: Name,
): BrandedId<Name> {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${name} must be a non-empty string`);
  }
  return value as BrandedId<Name>;
}

export function asSearchReservationId(value: string): SearchReservationId {
  return assertNonEmptyStringId(value, "SearchReservationId");
}

export function asLeadReservationId(value: string): LeadReservationId {
  return assertNonEmptyStringId(value, "LeadReservationId");
}

export function asUserId(value: string): UserId {
  return assertNonEmptyStringId(value, "UserId");
}

export function asTeamId(value: string): TeamId {
  return assertNonEmptyStringId(value, "TeamId");
}

export function asBranchId(value: string): BranchId {
  return assertNonEmptyStringId(value, "BranchId");
}

export function asContactAssignmentId(value: string): ContactAssignmentId {
  return assertNonEmptyStringId(value, "ContactAssignmentId");
}

export function asCapacityRequestId(value: string): CapacityRequestId {
  return assertNonEmptyStringId(value, "CapacityRequestId");
}

export function asUserInviteId(value: string): UserInviteId {
  return assertNonEmptyStringId(value, "UserInviteId");
}

export function asOrganizationPersonId(value: string): OrganizationPersonId {
  return assertNonEmptyStringId(value, "OrganizationPersonId");
}

export function asOrganizationId(value: string): OrganizationId {
  return assertNonEmptyStringId(value, "OrganizationId");
}

export function asEventId(value: string): EventId {
  return assertNonEmptyStringId(value, "EventId");
}
