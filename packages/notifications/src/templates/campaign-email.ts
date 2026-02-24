import { html as template } from "./compiled/campaign.js";

export interface CampaignEmailParams {
  title?: string | null;
  bodyText: string;
}

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const TITLE_BLOCK_RE = /<!-- crm-title-start -->[\s\S]*?<!-- crm-title-end -->/;

export function renderCampaignEmail(params: CampaignEmailParams): {
  html: string;
  text: string;
} {
  let html = template.replaceAll(
    "{{bodyText}}",
    esc(params.bodyText).replace(/\n/g, "<br/>"),
  );

  if (params.title?.trim()) {
    html = html.replaceAll("{{title}}", esc(params.title));
  } else {
    html = html.replace(TITLE_BLOCK_RE, "");
  }

  return { html, text: params.bodyText };
}
