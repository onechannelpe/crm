import { randomUUIDv7 } from "bun";
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
export type AuthLoginFlowId = BrandedId<"AuthLoginFlowId">;
export type WebauthnChallengeId = BrandedId<"WebauthnChallengeId">;

function assertNonEmptyStringId<Name extends string>(
  value: string,
  name: Name,
): BrandedId<Name> {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${name} must be a non-empty string`);
  }
  // The sole brand cast in the codebase: every branded id is born here or via
  // the newXxxId generators below. Keeping the cast in one place lets
  // no-unsafe-type-assertion flag every other `as XxxId` site as a leak.
  // oxlint-disable-next-line typescript-eslint/no-unsafe-type-assertion
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

export function asPersonId(value: string): PersonId {
  return assertNonEmptyStringId(value, "PersonId");
}

export function asEventId(value: string): EventId {
  return assertNonEmptyStringId(value, "EventId");
}

export function asWorkflowLeadId(value: string): WorkflowLeadId {
  return assertNonEmptyStringId(value, "WorkflowLeadId");
}

export function asWorkflowRateProposalId(
  value: string,
): WorkflowRateProposalId {
  return assertNonEmptyStringId(value, "WorkflowRateProposalId");
}

export function asWorkflowRateRevisionId(
  value: string,
): WorkflowRateRevisionId {
  return assertNonEmptyStringId(value, "WorkflowRateRevisionId");
}

export function asWorkflowArtifactId(value: string): WorkflowArtifactId {
  return assertNonEmptyStringId(value, "WorkflowArtifactId");
}

export function asArtifactDownloadTokenId(
  value: string,
): ArtifactDownloadTokenId {
  return assertNonEmptyStringId(value, "ArtifactDownloadTokenId");
}

export function asFileAssetId(value: string): FileAssetId {
  return assertNonEmptyStringId(value, "FileAssetId");
}

export function asWorkflowVenueId(value: string): WorkflowVenueId {
  return assertNonEmptyStringId(value, "WorkflowVenueId");
}

export function asFulfillmentOrderId(value: string): FulfillmentOrderId {
  return assertNonEmptyStringId(value, "FulfillmentOrderId");
}

export function asIntegrationJobId(value: string): IntegrationJobId {
  return assertNonEmptyStringId(value, "IntegrationJobId");
}

export function asNotificationIntentId(value: string): NotificationIntentId {
  return assertNonEmptyStringId(value, "NotificationIntentId");
}

export function asNotificationDeliveryId(
  value: string,
): NotificationDeliveryId {
  return assertNonEmptyStringId(value, "NotificationDeliveryId");
}

export function asAppNotificationId(value: string): AppNotificationId {
  return assertNonEmptyStringId(value, "AppNotificationId");
}

export function asAuthLoginFlowId(value: string): AuthLoginFlowId {
  return assertNonEmptyStringId(value, "AuthLoginFlowId");
}

export function asWebauthnChallengeId(value: string): WebauthnChallengeId {
  return assertNonEmptyStringId(value, "WebauthnChallengeId");
}

// Generators for repo-generated ids. Routing UUIDv7 through the validating
// constructor means a freshly minted id passes the same non-empty check as
// a parsed one, so there is a single mint path per kind.
export function newWorkflowLeadId(): WorkflowLeadId {
  return asWorkflowLeadId(randomUUIDv7());
}

export function newFulfillmentOrderId(): FulfillmentOrderId {
  return asFulfillmentOrderId(randomUUIDv7());
}
