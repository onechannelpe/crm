import { parseJsonOrTextPayload } from "./utils";

const REQUEST_TIMEOUT_MS = 6000;

class HttpStatusError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function withTimeoutSignal(signal: AbortSignal): AbortSignal {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  const abort = () => {
    clearTimeout(timeoutId);
    controller.abort();
  };

  if (signal.aborted) {
    abort();
  } else {
    signal.addEventListener("abort", abort, { once: true });
  }

  return controller.signal;
}

async function fetchResponseWithTimeout(
  url: string,
  signal: AbortSignal,
  init?: RequestInit,
): Promise<Response> {
  const response = await fetch(url, {
    ...init,
    signal: withTimeoutSignal(signal),
  });

  if (!response.ok) {
    throw new HttpStatusError(response.status, `HTTP ${response.status}`);
  }

  return response;
}

async function fetchTextWithTimeout(
  url: string,
  signal: AbortSignal,
  init?: RequestInit,
): Promise<string> {
  const response = await fetchResponseWithTimeout(url, signal, init);
  return await response.text();
}

async function fetchJsonWithTimeout(
  url: string,
  signal: AbortSignal,
  init?: RequestInit,
): Promise<unknown> {
  const response = await fetchResponseWithTimeout(url, signal, init);
  return (await response.json().catch(() => null)) as unknown;
}

export async function fetchDniFromItfisdenreg(
  dni: string,
  signal: AbortSignal,
): Promise<unknown> {
  const payloadText = await fetchTextWithTimeout(
    `https://ww1.sunat.gob.pe/ol-ti-itfisdenreg/itfisdenreg.htm?accion=obtenerDatosDni&numDocumento=${encodeURIComponent(dni)}`,
    signal,
  );
  return parseJsonOrTextPayload(payloadText);
}

export async function fetchRucFromItfisdenreg(
  ruc: string,
  signal: AbortSignal,
): Promise<unknown> {
  const payloadText = await fetchTextWithTimeout(
    `https://ww1.sunat.gob.pe/ol-ti-itfisdenreg/itfisdenreg.htm?accion=obtenerDatosRuc&nroRuc=${encodeURIComponent(ruc)}`,
    signal,
  );
  return parseJsonOrTextPayload(payloadText);
}

export async function fetchDniFromAtencion(
  dni: string,
  signal: AbortSignal,
): Promise<unknown> {
  return fetchJsonWithTimeout(
    "https://ww1.sunat.gob.pe/ol-ti-itatencionf5030/registro/solicitante",
    signal,
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

export async function fetchRucFromConsultaRuc(
  ruc: string,
  signal: AbortSignal,
): Promise<unknown> {
  const url =
    "https://e-consultaruc.sunat.gob.pe/cl-ti-itmrconsruc/jcrS00Alias";

  const sessionResponse = await fetchResponseWithTimeout(url, signal);
  const sessionResponseText = await sessionResponse.text();
  if (sessionResponseText.length < 1) {
    return null;
  }

  const cookies = sessionResponse.headers
    .getSetCookie()
    .map((cookie) => cookie.split(";")[0])
    .join("; ");
  if (cookies.length < 1) {
    return null;
  }

  const tokenHtml = await fetchTextWithTimeout(url, signal, {
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
  if (!numRnd) {
    return null;
  }

  return await fetchTextWithTimeout(url, signal, {
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

export function isHttpStatusError(error: unknown): error is HttpStatusError {
  return error instanceof HttpStatusError;
}
