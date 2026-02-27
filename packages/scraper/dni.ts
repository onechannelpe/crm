export interface DniData {
  dni: string;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  codVerifica: string;
}

export async function getDniInfo(dni: string): Promise<DniData | null> {
  const body = JSON.stringify({
    tipDocu: "1",
    numDocu: dni,
    tipPers: "1",
    token: Math.random().toString(36).substring(2, 57),
  });

  const res = await fetch(
    "https://ww1.sunat.gob.pe/ol-ti-itatencionf5030/registro/solicitante",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    },
  );

  const json = await res.json().catch(() => null);
  if (!json || typeof json !== "object") {
    return null;
  }

  const data = json as {
    apeMatSoli?: string;
    apePatSoli?: string;
    nombreSoli?: string;
  };
  if (!data.nombreSoli || !data.apePatSoli || !data.apeMatSoli) {
    return null;
  }

  return {
    dni,
    nombres: data.nombreSoli,
    apellidoPaterno: data.apePatSoli,
    apellidoMaterno: data.apeMatSoli,
    codVerifica: String(getVerifyCode(dni)),
  };
}

function getVerifyCode(dni: string): number {
  const hash = [3, 2, 7, 6, 5, 4, 3, 2];
  let suma = 5;

  for (let i = 0; i < dni.length; i += 1) {
    suma += Number(dni[i]) * hash[i];
  }

  const entero = Math.floor(suma / 11);
  const digito = 11 - (suma - entero * 11);

  return digito > 9 ? digito - 10 : digito;
}
