import { describe, expect, it } from "vitest";

import { esc } from "../src/utils";

describe("esc", () => {
  it("escapes all HTML-significant characters", () => {
    expect(esc("&<>\"'")).toBe("&amp;&lt;&gt;&quot;&#39;");
  });

  it("neutralizes script injection in element content", () => {
    const payload = '<script>alert("xss")</script>';
    const result = esc(payload);
    expect(result).not.toContain("<script");
    expect(result).toBe("&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;");
  });

  it("neutralizes attribute breakout via double quotes", () => {
    const payload = '" onmouseover="alert(1)"';
    const result = esc(payload);
    expect(result).not.toContain('"');
    expect(result).toBe("&quot; onmouseover=&quot;alert(1)&quot;");
  });

  it("neutralizes attribute breakout via single quotes", () => {
    const payload = "' onmouseover='alert(1)'";
    const result = esc(payload);
    expect(result).not.toContain("'");
    expect(result).toBe("&#39; onmouseover=&#39;alert(1)&#39;");
  });
});
