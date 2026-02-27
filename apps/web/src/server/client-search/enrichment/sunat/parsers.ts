import { normalizeWhitespace } from "./utils";

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&aacute;/g, "a")
    .replace(/&eacute;/g, "e")
    .replace(/&iacute;/g, "i")
    .replace(/&oacute;/g, "o")
    .replace(/&uacute;/g, "u")
    .replace(/&ntilde;/g, "n");
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
