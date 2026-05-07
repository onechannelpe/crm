import type { LocalReleaseNote } from "~/lib/releases/types";

export type JsonLdValue =
  | boolean
  | number
  | string
  | null
  | JsonLdValue[]
  | { [key: string]: JsonLdValue | undefined };

function serializeJsonLd(data: JsonLdValue): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export function JsonLd(props: { data: JsonLdValue }) {
  return (
    <script type="application/ld+json">{serializeJsonLd(props.data)}</script>
  );
}

function extractReleaseHeadline(note: LocalReleaseNote): string {
  return `Release ${note.release}`;
}

export function buildReleaseListJsonLd(
  notes: readonly LocalReleaseNote[],
): JsonLdValue {
  const releasesUrl = "/releases";

  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Releases",
    url: releasesUrl,
    itemListOrder: "https://schema.org/ItemListOrderDescending",
    numberOfItems: notes.length,
    itemListElement: notes.map((note, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: `${releasesUrl}#${note.release}`,
      item: {
        "@type": "TechArticle",
        "@id": `${releasesUrl}#${note.release}`,
        headline: extractReleaseHeadline(note),
        name: note.release,
        url: `${releasesUrl}#${note.release}`,
        ...(note.date ? { datePublished: note.date } : {}),
      },
    })),
  };
}
