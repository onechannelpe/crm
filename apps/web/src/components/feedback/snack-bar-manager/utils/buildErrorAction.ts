export interface BuildErrorActionParams {
  apolloError?: unknown;
}

export function buildErrorAction(_params: BuildErrorActionParams): {
  actionText?: string;
  actionTo?: string;
} | null {
  const conflictingRecordId = getConflictingRecordId(_params.apolloError);
  if (!conflictingRecordId) {
    return null;
  }

  return {
    actionText: "Ver registro existente",
    actionTo: `/records/${conflictingRecordId}`,
  };
}

function getConflictingRecordId(error: unknown): string | null {
  if (!error || typeof error !== "object") {
    return null;
  }

  const fromDirect = readRecordIdFromNode(error as Record<string, unknown>);
  if (fromDirect) {
    return fromDirect;
  }

  const graphQLErrors = (error as { graphQLErrors?: unknown }).graphQLErrors;
  if (Array.isArray(graphQLErrors)) {
    for (const graphQLError of graphQLErrors) {
      if (graphQLError && typeof graphQLError === "object") {
        const fromGraphQLError = readRecordIdFromNode(
          graphQLError as Record<string, unknown>,
        );
        if (fromGraphQLError) {
          return fromGraphQLError;
        }
      }
    }
  }

  return null;
}

function readRecordIdFromNode(node: Record<string, unknown>): string | null {
  const extensions = node.extensions;
  if (extensions && typeof extensions === "object") {
    const recordId = readRecordIdFromConflictNode(
      extensions as Record<string, unknown>,
    );
    if (recordId) {
      return recordId;
    }
  }

  const recordId = readRecordIdFromConflictNode(node);
  return recordId ?? null;
}

function readRecordIdFromConflictNode(
  node: Record<string, unknown>,
): string | null {
  const conflictNode = (node.conflict ??
    node.conflictingRecord ??
    node.conflicting_record ??
    node.conflicting) as unknown;

  if (conflictNode && typeof conflictNode === "object") {
    const fromNested = readStringKey(conflictNode as Record<string, unknown>, [
      "id",
      "recordId",
      "record_id",
      "conflictingRecordId",
      "conflicting_record_id",
    ]);
    if (fromNested) {
      return fromNested;
    }
  }

  return readStringKey(node, [
    "conflictingRecordId",
    "conflicting_record_id",
    "recordId",
    "record_id",
  ]);
}

function readStringKey(
  source: Record<string, unknown>,
  keys: string[],
): string | null {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.length > 0) {
      return value;
    }
  }
  return null;
}
