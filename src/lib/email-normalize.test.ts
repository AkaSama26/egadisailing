import { describe, test, expect } from "vitest";
import { normalizeEmail } from "./email-normalize";

describe("normalizeEmail", () => {
  test("lowercases everything", () => {
    expect(normalizeEmail("Mario.Rossi@Gmail.COM")).toBe("mariorossi@gmail.com");
  });

  test("Gmail: strips dots in local-part", () => {
    expect(normalizeEmail("m.a.r.i.o@gmail.com")).toBe("mario@gmail.com");
  });

  test("Gmail: strips +alias", () => {
    expect(normalizeEmail("mario+egadi@gmail.com")).toBe("mario@gmail.com");
    expect(normalizeEmail("mario+any.thing+here@gmail.com")).toBe("mario@gmail.com");
  });

  test("Gmail: googlemail.com mapped to gmail.com", () => {
    expect(normalizeEmail("user@googlemail.com")).toBe("user@gmail.com");
  });

  test("non-Gmail: only lowercase (preserve dots, no +alias strip)", () => {
    expect(normalizeEmail("Mario.Rossi+work@outlook.com")).toBe(
      "mario.rossi+work@outlook.com",
    );
  });

  test("trims whitespace", () => {
    expect(normalizeEmail("  mario@gmail.com  ")).toBe("mario@gmail.com");
  });
});
