export interface RucData {
  [key: string]: string;
}

export async function getRucInfo(ruc: string): Promise<RucData | null> {
  const url =
    "https://e-consultaruc.sunat.gob.pe/cl-ti-itmrconsruc/jcrS00Alias";

  const sessionRes = await fetch(url);
  const cookies = sessionRes.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");

  const tokenRes = await fetch(url, {
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

  const numRnd = (await tokenRes.text()).match(
    /<input type="hidden" name="numRnd" value="([^"]+)"/,
  )?.[1];
  if (!numRnd) return null;

  const rucRes = await fetch(url, {
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

  return parseRucHtml(await rucRes.text());
}

function parseRucHtml(html: string): RucData {
  const data: RucData = {};

  const decode = (s: string) =>
    s
      .replace(/&nbsp;/g, " ")
      .replace(/&aacute;/g, "á")
      .replace(/&eacute;/g, "é")
      .replace(/&iacute;/g, "í")
      .replace(/&oacute;/g, "ó")
      .replace(/&uacute;/g, "ú")
      .replace(/&ntilde;/g, "ñ")
      .replace(/\s+/g, " ")
      .trim();

  const rows = html.match(/<div class="row">[\s\S]*?<\/div>\s*<\/div>/gi) || [];

  for (const row of rows) {
    const headings = [
      ...row.matchAll(/<h4 class="list-group-item-heading">([\s\S]*?)<\/h4>/gi),
    ].map((m) => decode(m[1].replace(/<[^>]+>/g, "")));
    const texts = [
      ...row.matchAll(/<p class="list-group-item-text">([\s\S]*?)<\/p>/gi),
    ].map((m) => decode(m[1].replace(/<[^>]+>/g, "")));

    if (headings.length === 2 && texts.length === 0) {
      const [label, value] = headings;
      if (label && value && !label.includes("-") && label.length < 100) {
        data[label] = value;
      }
    } else if (headings.length === 1 && texts.length === 1) {
      data[headings[0]] = texts[0];
    }
  }

  return data;
}
