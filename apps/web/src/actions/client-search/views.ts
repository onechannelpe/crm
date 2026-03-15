"use server";

import {
  conflictError,
  notFoundError,
  validationError,
} from "~/lib/app-errors";
import { requirePermission } from "~/lib/auth/access/session";
import {
  assertNonEmptyString,
  assertPositiveInt,
} from "~/lib/contracts/guards";
import { repos } from "~/server/shared/context";
import { SEARCH_TYPES, type SearchType } from "~/server/shared/engine/types";

export interface ClientSearchView {
  id: number;
  name: string;
  searchType: SearchType;
  queryValue: string;
  limitValue: number;
  isDefault: boolean;
}

function isSearchType(value: string): value is SearchType {
  return SEARCH_TYPES.some((type) => type === value);
}

function validateLimit(limitValue: number): number {
  if (!Number.isInteger(limitValue) || limitValue < 1 || limitValue > 100) {
    throw validationError("limitValue must be an integer between 1 and 100");
  }
  return limitValue;
}

function mapView(
  view: Awaited<ReturnType<typeof repos.clientSearchViews.listByUser>>[number],
): ClientSearchView {
  return {
    id: view.id,
    name: view.name,
    searchType: view.search_type,
    queryValue: view.query_value,
    limitValue: view.limit_value,
    isDefault: view.is_default === 1,
  };
}

export async function listClientSearchViews(): Promise<ClientSearchView[]> {
  const session = await requirePermission("search:use");
  const views = await repos.clientSearchViews.listByUser(session.userId);
  return views.map(mapView);
}

export async function createClientSearchView(
  name: string,
  searchType: string,
  queryValue: string,
  limitValue: number,
  isDefault: boolean,
): Promise<ClientSearchView> {
  const safeName = assertNonEmptyString(name, "name");
  const safeQuery = assertNonEmptyString(queryValue, "queryValue");
  const safeLimit = validateLimit(limitValue);
  if (!isSearchType(searchType)) {
    throw validationError("searchType is invalid");
  }

  const session = await requirePermission("search:use");
  const existingViews = await repos.clientSearchViews.listByUser(
    session.userId,
  );
  const hasDuplicateName = existingViews.some(
    (view) => view.name.toLowerCase() === safeName.toLowerCase(),
  );
  if (hasDuplicateName) {
    throw conflictError("A view with this name already exists");
  }

  if (isDefault) {
    await repos.clientSearchViews.clearDefaultForUser(session.userId);
  }

  const created = await repos.clientSearchViews.create({
    user_id: session.userId,
    name: safeName,
    search_type: searchType,
    query_value: safeQuery,
    limit_value: safeLimit,
    is_default: isDefault ? 1 : 0,
  });
  return mapView(created);
}

export async function updateClientSearchView(
  id: number,
  name: string,
  searchType: string,
  queryValue: string,
  limitValue: number,
): Promise<ClientSearchView> {
  const safeId = assertPositiveInt(id, "id");
  const safeName = assertNonEmptyString(name, "name");
  const safeQuery = assertNonEmptyString(queryValue, "queryValue");
  const safeLimit = validateLimit(limitValue);
  if (!isSearchType(searchType)) {
    throw validationError("searchType is invalid");
  }

  const session = await requirePermission("search:use");

  const updated = await repos.clientSearchViews.update(safeId, session.userId, {
    name: safeName,
    search_type: searchType,
    query_value: safeQuery,
    limit_value: safeLimit,
  });
  if (!updated) throw notFoundError("View not found");
  return mapView(updated);
}

export async function deleteClientSearchView(id: number): Promise<void> {
  const safeId = assertPositiveInt(id, "id");
  const session = await requirePermission("search:use");

  await repos.clientSearchViews.delete(safeId, session.userId);
}

export async function setDefaultClientSearchView(id: number): Promise<void> {
  const safeId = assertPositiveInt(id, "id");
  const session = await requirePermission("search:use");

  const existing = await repos.clientSearchViews.findByIdForUser(
    safeId,
    session.userId,
  );
  if (!existing) throw notFoundError("View not found");

  await repos.clientSearchViews.setDefault(safeId, session.userId);
}
