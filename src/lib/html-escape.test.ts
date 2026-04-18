import { describe, test, expect } from "vitest";
import { escapeHtml, safeUrl } from "./html-escape";

describe("escapeHtml", () => {
  test("escapes < > & \" '", () => {
    expect(escapeHtml("<script>alert('x')</script>")).toBe(
      "&lt;script&gt;alert(&#39;x&#39;)&lt;/script&gt;",
    );
    expect(escapeHtml('a & b "c"')).toBe("a &amp; b &quot;c&quot;");
  });

  test("null/undefined return empty", () => {
    expect(escapeHtml(null)).toBe("");
    expect(escapeHtml(undefined)).toBe("");
  });
});

describe("safeUrl", () => {
  test("blocks javascript: scheme", () => {
    expect(safeUrl("javascript:alert(1)")).toBe("#");
    expect(safeUrl("JavaScript:void(0)")).toBe("#");
  });

  test("blocks data: scheme", () => {
    expect(safeUrl("data:text/html,<script>")).toBe("#");
  });

  test("allows http/https/mailto/tel", () => {
    expect(safeUrl("https://example.com")).toBe("https://example.com");
    expect(safeUrl("mailto:x@y.com")).toBe("mailto:x@y.com");
    expect(safeUrl("tel:+391234")).toBe("tel:+391234");
  });

  test("allows relative URLs", () => {
    expect(safeUrl("/path/to/resource")).toBe("/path/to/resource");
    expect(safeUrl("?query=1")).toBe("?query=1");
  });
});
