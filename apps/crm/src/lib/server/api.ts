"use server";

import { getCookie } from "vinxi/http";
import {
  ChargeNote,
  Product,
  RejectionLog,
  User,
  LeadAssignment,
} from "../shared/types";

const API_URL = "http://127.0.0.1:3001/api";

class ApiError extends Error {
  constructor(
    public message: string,
    public status?: number,
  ) {
    super(message);
  }
}

async function serverFetch(path: string, options?: RequestInit) {
  const sessionCookie = getCookie("session");

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Cookie: sessionCookie ? `session=${sessionCookie}` : "",
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ error: "Request failed" }));
    throw new ApiError(error.error || "Request failed", response.status);
  }

  return response.json();
}

export async function login(email: string, password: string) {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ error: "Invalid credentials" }));
    throw new ApiError(error.error, response.status);
  }

  const setCookieHeader = response.headers.get("set-cookie");
  return { success: true, sessionCookie: setCookieHeader };
}

export async function getMe() {
  return serverFetch("/auth/me");
}

export async function logout() {
  return serverFetch("/auth/logout", { method: "POST" });
}

export async function getActiveLeads() {
  return serverFetch("/leads/active");
}

export async function requestLeads(bufferSize: number) {
  return serverFetch("/leads/request", {
    method: "POST",
    body: JSON.stringify({ bufferSize }),
  });
}

export async function completeLead(id: number) {
  return serverFetch(`/leads/${id}/complete`, { method: "POST" });
}

export async function getProducts(): Promise<Product[]> {
  return serverFetch("/sales/products");
}

export async function createChargeNote(contactId: number) {
  return serverFetch("/sales", {
    method: "POST",
    body: JSON.stringify({ contactId }),
  });
}

export async function addChargeNoteItem(
  noteId: number,
  productId: number,
  quantity: number,
) {
  return serverFetch(`/sales/${noteId}/items`, {
    method: "POST",
    body: JSON.stringify({ productId, quantity }),
  });
}

export async function submitChargeNote(noteId: number): Promise<void> {
  return serverFetch(`/sales/${noteId}/submit`, { method: "POST" });
}

export async function getPendingSales() {
  return serverFetch("/sales/pending");
}

export async function getChargeNote(id: number): Promise<ChargeNote> {
  return serverFetch(`/sales/${id}`);
}

export async function approveChargeNote(id: number) {
  return serverFetch(`/sales/${id}/approve`, { method: "POST" });
}

export async function rejectChargeNote(
  id: number,
  rejections: Array<{ fieldId: string; note: string }>,
) {
  return serverFetch(`/sales/${id}/reject`, {
    method: "POST",
    body: JSON.stringify({ rejections }),
  });
}

export async function getRejectedSales() {
  return serverFetch("/sales/my-rejected");
}

export async function getChargeNoteRejections(
  id: number,
): Promise<RejectionLog[]> {
  return serverFetch(`/sales/${id}/rejections`);
}

export async function logInteraction(
  contactId: number,
  outcome: string,
  notes?: string,
  durationSeconds?: number,
) {
  return serverFetch("/interactions", {
    method: "POST",
    body: JSON.stringify({ contactId, outcome, notes, durationSeconds }),
  });
}

export async function getTeamUsers() {
  return serverFetch("/team/users");
}
