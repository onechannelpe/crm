import { normalizeWhitespace } from "./utils";

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&nbsp;/g, " ")
    .replace(/&aacute;/g, "a")
    .replace(/&Aacute;/g, "A")
    .replace(/&eacute;/g, "e")
    .replace(/&Eacute;/g, "E")
    .replace(/&iacute;/g, "i")
    .replace(/&Iacute;/g, "I")
    .replace(/&oacute;/g, "o")
    .replace(/&Oacute;/g, "O")
    .replace(/&uacute;/g, "u")
    .replace(/&Uacute;/g, "U")
    .replace(/&ntilde;/g, "n")
    .replace(/&Ntilde;/g, "N");
}

export function parseRucHtml(html: string): Record<string, string> {
  const data: Record<string, string> = {};
  const rows = html.match(/<div class="row">[\s\S]*?<\/div>\s*<\/div>/gi) ?? [];

  for (const row of rows) {
    const headings = [
      ...row.matchAll(/<h4 class="list-group-item-heading">([\s\S]*?)<\/h4>/gi),
    ].map((match) =>
      normalizeWhitespace(decodeHtmlEntities(match[1].replace(/<[^>]+>/g, ""))),
    );
    const texts = [
      ...row.matchAll(/<p class="list-group-item-text">([\s\S]*?)<\/p>/gi),
    ].map((match) =>
      normalizeWhitespace(decodeHtmlEntities(match[1].replace(/<[^>]+>/g, ""))),
    );

    if (headings.length === 2 && texts.length === 0) {
      const [label, value] = headings;
      if (label && value && !label.includes("-") && label.length < 100) {
        data[label] = value;
      }
      continue;
    }

    if (headings.length === 1 && texts.length === 1) {
      data[headings[0]] = texts[0];
    }
  }

  return data;
}
