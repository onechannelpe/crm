import { parseJsonOrTextPayload } from "./utils";

const REQUEST_TIMEOUT_MS = 6000;

async function fetchResponseWithTimeout(
  url: string,
  init?: RequestInit,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fetchTextWithTimeout(
  url: string,
  init?: RequestInit,
): Promise<string> {
  const response = await fetchResponseWithTimeout(url, init);
  return await response.text();
}

async function fetchJsonWithTimeout(
  url: string,
  init?: RequestInit,
): Promise<unknown> {
  const response = await fetchResponseWithTimeout(url, init);
  return (await response.json().catch(() => null)) as unknown;
}

export async function fetchDniFromItfisdenreg(dni: string): Promise<unknown> {
  const payloadText = await fetchTextWithTimeout(
    `https://ww1.sunat.gob.pe/ol-ti-itfisdenreg/itfisdenreg.htm?accion=obtenerDatosDni&numDocumento=${encodeURIComponent(dni)}`,
  );
  return parseJsonOrTextPayload(payloadText);
}

export async function fetchRucFromItfisdenreg(ruc: string): Promise<unknown> {
  const payloadText = await fetchTextWithTimeout(
    `https://ww1.sunat.gob.pe/ol-ti-itfisdenreg/itfisdenreg.htm?accion=obtenerDatosRuc&nroRuc=${encodeURIComponent(ruc)}`,
  );
  return parseJsonOrTextPayload(payloadText);
}

export async function fetchDniFromAtencion(dni: string): Promise<unknown> {
  return fetchJsonWithTimeout(
    "https://ww1.sunat.gob.pe/ol-ti-itatencionf5030/registro/solicitante",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tipDocu: "1",
        numDocu: dni,
        tipPers: "1",
        token: Math.random().toString(36).substring(2, 57),
      }),
    },
  );
}

export async function fetchRucFromConsultaRuc(ruc: string): Promise<unknown> {
  const url =
    "https://e-consultaruc.sunat.gob.pe/cl-ti-itmrconsruc/jcrS00Alias";

  const sessionResponse = await fetchResponseWithTimeout(url);
  const sessionResponseText = await sessionResponse.text();
  if (sessionResponseText.length < 1) return null;

  const cookies = sessionResponse.headers
    .getSetCookie()
    .map((cookie) => cookie.split(";")[0])
    .join("; ");
  if (cookies.length < 1) return null;

  const tokenHtml = await fetchTextWithTimeout(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: cookies,
    },
    body: new URLSearchParams({
      accion: "consPorRazonSoc",
      razSoc: "BVA FOODS",
    }),
  });

  const numRnd = tokenHtml.match(
    /<input type="hidden" name="numRnd" value="([^"]+)"/,
  )?.[1];
  if (!numRnd) return null;

  return await fetchTextWithTimeout(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: cookies,
    },
    body: new URLSearchParams({
      accion: "consPorRuc",
      nroRuc: ruc,
      numRnd,
      actReturn: "1",
      modo: "1",
    }),
  });
}
