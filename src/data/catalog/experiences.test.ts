import { describe, expect, it } from "vitest";
import {
  getExperienceContent,
  getExperiencePackageContents,
  getExperiencePackageServiceIds,
  getExperiencePublicSlug,
  resolveExperienceServiceIdFromSlug,
} from "./experiences";
import { getBoatContent, getPublicBoatIds } from "./boats";
import { localizedPathWithoutLocale } from "@/lib/i18n/paths";

describe("fishing charter catalog", () => {
  it("resolves localized public slugs for every supported locale", () => {
    expect(getExperiencePublicSlug("fishing-full-day", "it")).toBe("charter-pesca-egadi");
    expect(getExperiencePublicSlug("fishing-full-day", "en")).toBe("egadi-fishing-charter");
    expect(getExperiencePublicSlug("fishing-full-day", "es")).toBe("charter-pesca-islas-egadi");
    expect(getExperiencePublicSlug("fishing-full-day", "fr")).toBe("charter-peche-iles-egades");
    expect(getExperiencePublicSlug("fishing-full-day", "de")).toBe("angelcharter-aegadische-inseln");

    expect(resolveExperienceServiceIdFromSlug("charter-pesca-egadi")).toBe("fishing-full-day");
    expect(resolveExperienceServiceIdFromSlug("egadi-fishing-charter")).toBe("fishing-full-day");
    expect(resolveExperienceServiceIdFromSlug("angelcharter-aegadische-inseln")).toBe("fishing-full-day");
  });

  it("publishes the fishing package last with localized hrefs", () => {
    const italianPackages = getExperiencePackageContents("it");
    const englishPackages = getExperiencePackageContents("en");

    expect(italianPackages.at(-1)?.key).toBe("charter-pesca-egadi");
    expect(italianPackages.at(-1)?.primaryHref).toBe("/esperienze/charter-pesca-egadi");
    expect(englishPackages.at(-1)?.primaryHref).toBe("/experiences/egadi-fishing-charter");
    expect(getExperiencePackageServiceIds()).toContain("fishing-full-day");
  });

  it("keeps fishing copy legal-safe and fully localized", () => {
    const italian = getExperienceContent("fishing-full-day", "it");
    const german = getExperienceContent("fishing-full-day", "de");

    expect(italian?.detailDescription).toContain("AMP/MASAF");
    expect(italian?.detailDescription).toContain("limiti di legge");
    expect(german?.title).toBe("Angelcharter Ägadische Inseln");
    expect(german?.includes.some((item) => item.includes("Professionelle Ruten"))).toBe(true);
  });

  it("keeps the dedicated fishing RIB available without listing it in the public fleet", () => {
    const boat = getBoatContent("fishing-rib", "fr");

    expect(getPublicBoatIds()).not.toContain("fishing-rib");
    expect(boat?.title).toBe("Semi-rigide de pêche");
    expect(boat?.serviceIds).toEqual(["fishing-full-day"]);
    expect(boat?.specs.find((spec) => spec.value === "4")?.label).toBe("Personnes");
  });

  it("uses /esperienze as the Italian canonical experiences path", () => {
    expect(localizedPathWithoutLocale("it", "/experiences/fishing-full-day")).toBe(
      "/esperienze/charter-pesca-egadi",
    );
  });
});
