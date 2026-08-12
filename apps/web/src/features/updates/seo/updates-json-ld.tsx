import type { UpdateEntry } from "~/features/updates/model/types";

type JsonLdValue =
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

export function buildUpdateListJsonLd(
  updates: readonly UpdateEntry[],
): JsonLdValue {
  const updatesUrl = "/updates";

  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Updates",
    url: updatesUrl,
    itemListOrder: "https://schema.org/ItemListOrderDescending",
    numberOfItems: updates.length,
    itemListElement: updates.map((entry, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: `${updatesUrl}#${entry.id}`,
      item: {
        "@type": "TechArticle",
        "@id": `${updatesUrl}#${entry.id}`,
        headline: entry.title,
        name: entry.title,
        url: `${updatesUrl}#${entry.id}`,
        datePublished: entry.date,
        ...(entry.tags.length > 0 ? { keywords: entry.tags.join(", ") } : {}),
      },
    })),
  };
}
