"use server";

import { revalidate } from "@solidjs/router";
import { createSale as createSaleCommand } from "~/application/sales/create-sale";
import { addItem as addItemCommand } from "~/application/sales/add-item";
import { submitSale as submitSaleCommand } from "~/application/sales/submit-sale";
import { approveSale as approveSaleCommand } from "~/application/sales/approve-sale";
import { rejectSale as rejectSaleCommand } from "~/application/sales/reject-sale";
import { SalesRepository } from "~/infrastructure/db/repositories/sales";
import { getAuthSession } from "~/infrastructure/auth/session";

export async function getProducts() {
  return await SalesRepository.getActiveProducts();
}

export async function createSale(contactId: number): Promise<number> {
  const session = await getAuthSession();
  const userId = session.data.userId;

  if (!userId) {
    throw new Error("Usuario no autenticado");
  }

  return await createSaleCommand({ userId, contactId });
}

export async function addSaleItem(saleId: number, productId: number, quantity: number) {
  await addItemCommand({ chargeNoteId: saleId, productId, quantity });
}

export async function submitSale(saleId: number) {
  const session = await getAuthSession();
  const userId = session.data.userId;

  if (!userId) {
    throw new Error("Usuario no autenticado");
  }

  await submitSaleCommand({ chargeNoteId: saleId, userId });
}

export async function getPendingSales() {
  return await SalesRepository.getPendingSales();
}

export async function getSale(id: number) {
  return await SalesRepository.findById(id);
}

export async function getSaleRejections(id: number) {
  return await SalesRepository.getRejections(id);
}

export async function approveSale(id: number) {
  const session = await getAuthSession();
  const userId = session.data.userId;

  if (!userId) {
    throw new Error("Usuario no autenticado");
  }

  await approveSaleCommand({ chargeNoteId: id, reviewerId: userId });
  revalidate(getPendingSales.key);
}

export async function rejectSale(id: number, rejections: any[]) {
  const session = await getAuthSession();
  const userId = session.data.userId;

  if (!userId) {
    throw new Error("Usuario no autenticado");
  }

  await rejectSaleCommand({ chargeNoteId: id, reviewerId: userId, rejections });
  revalidate(getPendingSales.key);
}

export async function resubmitSale(id: number) {
  const session = await getAuthSession();
  const userId = session.data.userId;

  if (!userId) {
    throw new Error("Usuario no autenticado");
  }

  await submitSaleCommand({ chargeNoteId: id, userId });
}
