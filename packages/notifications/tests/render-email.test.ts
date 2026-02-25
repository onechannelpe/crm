import { describe, expect, it } from "vitest";

import { renderCampaignEmail } from "../src/templates/compiled/campaign";
import { renderInviteEmail } from "../src/templates/compiled/invite";

describe("renderInviteEmail", () => {
  const baseParams = {
    fullName: "María López",
    role: "vendedor",
    inviteUrl: "https://crm.example.com/auth/invite/abc123",
    expiresAt: "28 de febrero de 2026",
  };

  it("produces html and text with all params interpolated", () => {
    const { html, text } = renderInviteEmail(baseParams);

    expect(html).toContain("María López");
    expect(html).toContain("vendedor");
    expect(html).toContain("https://crm.example.com/auth/invite/abc123");
    expect(html).toContain("28 de febrero de 2026");

    expect(text).toContain("María López");
    expect(text).toContain("vendedor");
    expect(text).toContain("https://crm.example.com/auth/invite/abc123");
    expect(text).toContain("28 de febrero de 2026");
  });

  it("produces valid HTML document structure", () => {
    const { html } = renderInviteEmail(baseParams);
    expect(html).toContain("<!doctype html>");
    expect(html).toContain("</html>");
  });

  it("escapes HTML-significant characters in params", () => {
    const { html } = renderInviteEmail({
      ...baseParams,
      fullName: '<img src=x onerror="alert(1)">',
      role: '"><script>alert("xss")</script>',
    });

    expect(html).not.toContain("<img src=x");
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;img src=x");
    expect(html).toContain("&quot;&gt;&lt;script&gt;");
  });

  it("escapes inviteUrl to prevent href attribute injection", () => {
    const { html } = renderInviteEmail({
      ...baseParams,
      inviteUrl: '" onclick="alert(1)" data-x="',
    });

    expect(html).not.toContain('onclick="alert(1)"');
    expect(html).toContain("&quot;");
  });

  it("does not escape text fallback (plain text is safe as-is)", () => {
    const { text } = renderInviteEmail({
      ...baseParams,
      fullName: "O'Brien & Associates",
    });

    // Text part should be raw — it's not HTML
    expect(text).toContain("O'Brien & Associates");
  });
});

describe("renderCampaignEmail", () => {
  it("renders with title and body", () => {
    const { html, text } = renderCampaignEmail({
      title: "Alerta de seguridad",
      bodyText: "Se detectó un acceso inusual.",
    });

    expect(html).toContain("Alerta de seguridad");
    expect(html).toContain("Se detectó un acceso inusual.");
    expect(text).toContain("Alerta de seguridad");
    expect(text).toContain("Se detectó un acceso inusual.");
  });

  it("omits title section when title is undefined", () => {
    const { html, text } = renderCampaignEmail({
      bodyText: "Mensaje sin título.",
    });

    expect(html).toContain("Mensaje sin título.");
    expect(text).toContain("Mensaje sin título.");
    // The title block should be empty-string — no crash, no "undefined"
    expect(html).not.toContain("undefined");
    expect(text).not.toContain("undefined");
  });

  it("omits title section when title is empty string", () => {
    const { html, text } = renderCampaignEmail({
      title: "",
      bodyText: "Solo cuerpo.",
    });

    expect(html).not.toContain("undefined");
    expect(text).not.toContain("undefined");
    expect(html).toContain("Solo cuerpo.");
  });

  it("omits title section when title is whitespace-only", () => {
    const { html, text } = renderCampaignEmail({
      title: "   ",
      bodyText: "Content here.",
    });

    expect(html).not.toContain("undefined");
    expect(text).not.toContain("undefined");
  });

  it("converts newlines to <br/> in bodyText for HTML", () => {
    const { html, text } = renderCampaignEmail({
      bodyText: "Línea uno\nLínea dos\nLínea tres",
    });

    expect(html).toContain("Línea uno<br/>Línea dos<br/>Línea tres");
    // text version keeps newlines as-is
    expect(text).toContain("Línea uno\nLínea dos\nLínea tres");
  });

  it("escapes HTML in bodyText even with multiline conversion", () => {
    const { html } = renderCampaignEmail({
      bodyText: '<script>alert("xss")</script>\nNormal line',
    });

    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("<br/>");
  });

  it("escapes HTML in title", () => {
    const { html } = renderCampaignEmail({
      title: '<img src=x onerror="alert(1)">',
      bodyText: "Safe body.",
    });

    expect(html).not.toContain("<img src=x");
    expect(html).toContain("&lt;img");
  });
});
