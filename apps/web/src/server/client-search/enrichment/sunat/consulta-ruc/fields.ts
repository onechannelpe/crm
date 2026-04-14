import { decodeHtmlEntities, normalizeWhitespace } from "../text";

export function readFields(html: string): Record<string, string> {
  const fields: Record<string, string> = {};
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

    const tableCells = [
      ...row.matchAll(/<tr[^>]*>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<\/tr>/gi),
    ].map((match) =>
      normalizeWhitespace(decodeHtmlEntities(match[1].replace(/<[^>]+>/g, ""))),
    );

    if (headings.length === 2 && texts.length === 0) {
      const [label, value] = headings;
      if (label && value && !label.includes("-") && label.length < 100) {
        fields[label] = value;
      }
      continue;
    }

    if (headings.length === 1 && texts.length === 1) {
      fields[headings[0]] = texts[0];
      continue;
    }

    if (headings.length === 1 && tableCells.length > 0) {
      fields[headings[0]] = tableCells.join("\n");
    }
  }

  return fields;
}
