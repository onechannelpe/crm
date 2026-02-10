"use server";

import { getCookie } from "vinxi/http";
import {
  type ChargeNote,
  Contact,
  type LeadAssignment,
  type Product,
  type RejectionLog,
  type User,
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

async function serverFetch<T>(path: string, options?: RequestInit): Promise<T> {
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

  const text = await response.text();
  return text ? JSON.parse(text) : (null as T);
}

export async function login(
  email: string,
  password: string,
): Promise<{ success: true; token: string; user: User }> {
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

  const data = await response.json();

  return data;
}

export async function getMe(): Promise<User> {
  return serverFetch<User>("/auth/me");
}

export async function logout(): Promise<void> {
  return serverFetch<void>("/auth/logout", { method: "POST" });
}

export async function getActiveLeads(): Promise<LeadAssignment[]> {
  return serverFetch<LeadAssignment[]>("/leads/active");
}

export async function requestLeads(
  bufferSize: number,
): Promise<LeadAssignment[]> {
  return serverFetch<LeadAssignment[]>("/leads/request", {
    method: "POST",
    body: JSON.stringify({ bufferSize }),
  });
}

export async function completeLead(id: number): Promise<void> {
  return serverFetch<void>(`/leads/${id}/complete`, { method: "POST" });
}

export async function getProducts(): Promise<Product[]> {
  return serverFetch<Product[]>("/sales/products");
}

export async function createChargeNote(contactId: number): Promise<ChargeNote> {
  return serverFetch<ChargeNote>("/sales", {
    method: "POST",
    body: JSON.stringify({ contactId }),
  });
}

export async function addChargeNoteItem(
  noteId: number,
  productId: number,
  quantity: number,
): Promise<void> {
  return serverFetch<void>(`/sales/${noteId}/items`, {
    method: "POST",
    body: JSON.stringify({ productId, quantity }),
  });
}

export async function submitChargeNote(noteId: number): Promise<void> {
  return serverFetch<void>(`/sales/${noteId}/submit`, { method: "POST" });
}

export async function getPendingSales(): Promise<ChargeNote[]> {
  return serverFetch<ChargeNote[]>("/sales/pending");
}

export async function getChargeNote(id: number): Promise<ChargeNote> {
  return serverFetch<ChargeNote>(`/sales/${id}`);
}

export async function approveChargeNote(id: number): Promise<void> {
  return serverFetch<void>(`/sales/${id}/approve`, { method: "POST" });
}

export async function rejectChargeNote(
  id: number,
  rejections: Array<{ fieldId: string; note: string }>,
): Promise<void> {
  return serverFetch<void>(`/sales/${id}/reject`, {
    method: "POST",
    body: JSON.stringify({ rejections }),
  });
}

export async function getRejectedSales(): Promise<ChargeNote[]> {
  return serverFetch<ChargeNote[]>("/sales/my-rejected");
}

export async function getChargeNoteRejections(
  id: number,
): Promise<RejectionLog[]> {
  return serverFetch<RejectionLog[]>(`/sales/${id}/rejections`);
}

export async function logInteraction(
  contactId: number,
  outcome: string,
  notes?: string,
  durationSeconds?: number,
): Promise<void> {
  return serverFetch<void>("/interactions", {
    method: "POST",
    body: JSON.stringify({ contactId, outcome, notes, durationSeconds }),
  });
}

export async function getTeamUsers(): Promise<User[]> {
  return serverFetch<User[]>("/team/users");
}
