"use server";

import { action } from "@solidjs/router";
import { requireRole } from "~/server/auth/session";
import {
  searchByDNI,
  searchByPhone,
  searchByRUC,
  type SearchResult,
} from "./client";

export const searchPhoneAction = action(async (formData: FormData) => {
  "use server";
  await requireRole(["executive", "admin"]);

  const searchType = formData.get("searchType") as string;
  const searchValue = formData.get("searchValue") as string;

  if (!searchValue || !searchType) {
    return { error: "Missing search parameters" };
  }

  let result: SearchResult | null = null;

  if (searchType === "dni") {
    result = await searchByDNI(searchValue);
  } else if (searchType === "ruc") {
    result = await searchByRUC(searchValue);
  } else if (searchType === "phone") {
    result = await searchByPhone(searchValue);
  }

  if (!result) {
    return { error: "Search service unavailable" };
  }

  return { result };
}, "searchPhone");
