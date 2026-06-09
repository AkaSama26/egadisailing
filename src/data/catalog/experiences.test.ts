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
  const locales = ["it", "en", "es", "fr", "de"] as const;

  it("resolves localized public slugs for every supported locale", () => {
    expect(getExperiencePublicSlug("fishing-full-day", "it")).toBe("charter-pesca-egadi-da-trapani");
    expect(getExperiencePublicSlug("fishing-full-day", "en")).toBe("egadi-fishing-charter-from-trapani");
    expect(getExperiencePublicSlug("fishing-full-day", "es")).toBe("charter-pesca-egadi-desde-trapani");
    expect(getExperiencePublicSlug("fishing-full-day", "fr")).toBe("charter-peche-egades-depuis-trapani");
    expect(getExperiencePublicSlug("fishing-full-day", "de")).toBe("angelcharter-aegadische-inseln-ab-trapani");

    expect(resolveExperienceServiceIdFromSlug("charter-pesca-egadi")).toBe("fishing-full-day");
    expect(resolveExperienceServiceIdFromSlug("egadi-fishing-charter")).toBe("fishing-full-day");
    expect(resolveExperienceServiceIdFromSlug("egadi-fishing-charter-from-trapani")).toBe("fishing-full-day");
    expect(resolveExperienceServiceIdFromSlug("angelcharter-aegadische-inseln")).toBe("fishing-full-day");
  });

  it("publishes the fishing package last with localized hrefs", () => {
    const italianPackages = getExperiencePackageContents("it");
    const englishPackages = getExperiencePackageContents("en");

    expect(italianPackages.at(-1)?.key).toBe("charter-pesca-egadi");
    expect(italianPackages.at(-1)?.primaryHref).toBe("/esperienze/charter-pesca-egadi-da-trapani");
    expect(englishPackages.at(-1)?.primaryHref).toBe("/experiences/egadi-fishing-charter-from-trapani");
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

  it("does not expose placeholder alt text in fishing media", () => {
    for (const locale of locales) {
      const experience = getExperienceContent("fishing-full-day", locale);
      const boat = getBoatContent("fishing-rib", locale);

      const mediaText = [
        ...(experience?.media.map((item) => item.alt) ?? []),
        boat?.imageAlt,
        ...(boat?.gallery.map((item) => item.alt) ?? []),
      ]
        .filter(Boolean)
        .join(" ");

      expect(mediaText).not.toMatch(/placeholder|provisional|provisoire|platzhalter/i);
    }
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
      "/esperienze/charter-pesca-egadi-da-trapani",
    );
  });

  it("publishes SEO-first slugs for the 8-hour Favignana and Levanzo tours", () => {
    expect(getExperiencePublicSlug("boat-shared-full-day", "it")).toBe(
      "escursione-barca-favignana-levanzo-da-trapani",
    );
    expect(getExperiencePublicSlug("boat-exclusive-full-day", "it")).toBe(
      "tour-privato-favignana-levanzo-da-trapani",
    );
    expect(getExperiencePublicSlug("boat-shared-full-day", "en")).toBe(
      "favignana-levanzo-boat-tour-from-trapani",
    );
    expect(getExperiencePublicSlug("boat-exclusive-full-day", "en")).toBe(
      "private-favignana-levanzo-boat-tour-from-trapani",
    );
    expect(resolveExperienceServiceIdFromSlug("boat-shared-full-day")).toBe(
      "boat-shared-full-day",
    );
    expect(resolveExperienceServiceIdFromSlug("escursione-barca-favignana-levanzo-da-trapani")).toBe(
      "boat-shared-full-day",
    );
    expect(resolveExperienceServiceIdFromSlug("tour-privato-favignana-levanzo-da-trapani")).toBe(
      "boat-exclusive-full-day",
    );
  });

  it("keeps package variant labels in the current locale", () => {
    const italianEightHour = getExperiencePackageContents("it").find(
      (item) => item.key === "tour-barca-egadi-8-ore",
    );
    const englishEightHour = getExperiencePackageContents("en").find(
      (item) => item.key === "tour-barca-egadi-8-ore",
    );
    const spanishEightHour = getExperiencePackageContents("es").find(
      (item) => item.key === "tour-barca-egadi-8-ore",
    );

    expect(italianEightHour?.variants.map((variant) => variant.label)).toEqual([
      "Condiviso",
      "Privato",
    ]);
    expect(englishEightHour?.variants.map((variant) => variant.label)).toEqual([
      "Shared",
      "Private",
    ]);
    expect(spanishEightHour?.variants.map((variant) => variant.label)).toEqual([
      "Compartido",
      "Privado",
    ]);
  });

  it("publishes SEO-first slugs for non-8-hour experiences", () => {
    expect(getExperiencePublicSlug("exclusive-experience", "it")).toBe(
      "chef-a-bordo-egadi-trimarano-da-trapani",
    );
    expect(getExperiencePublicSlug("cabin-charter", "it")).toBe(
      "charter-egadi-trimarano-da-trapani",
    );
    expect(getExperiencePublicSlug("boat-exclusive-morning", "it")).toBe(
      "tour-privato-egadi-4-ore-mattina-da-trapani",
    );
    expect(getExperiencePublicSlug("boat-exclusive-afternoon", "it")).toBe(
      "tour-privato-egadi-4-ore-pomeriggio-da-trapani",
    );

    expect(getExperiencePublicSlug("exclusive-experience", "en")).toBe(
      "chef-on-board-egadi-trimaran-from-trapani",
    );
    expect(getExperiencePublicSlug("cabin-charter", "en")).toBe(
      "egadi-trimaran-charter-from-trapani",
    );
    expect(getExperiencePublicSlug("boat-exclusive-afternoon", "en")).toBe(
      "private-egadi-4-hour-afternoon-boat-tour-from-trapani",
    );

    expect(resolveExperienceServiceIdFromSlug("chef-a-bordo-neel-47")).toBe(
      "exclusive-experience",
    );
    expect(resolveExperienceServiceIdFromSlug("charter")).toBe("cabin-charter");
    expect(resolveExperienceServiceIdFromSlug("charter-egadi-trimarano-da-trapani")).toBe(
      "cabin-charter",
    );
  });

  it("uses SEO-first package titles on the experiences hub", () => {
    const italianPackages = getExperiencePackageContents("it");

    expect(italianPackages[0]?.title).toBe(
      "Escursione in barca Favignana e Levanzo 8 ore da Trapani",
    );
    expect(italianPackages[1]?.title).toBe("Tour privato alle Egadi 4 ore da Trapani");
    expect(italianPackages[2]?.title).toBe("Chef a bordo alle Egadi in trimarano");
  });

  it("localizes new trimaran gallery captions and alt text beyond English", () => {
    const boatSaloonSrc = "/images/boats/neel-47/trimarano-salotto.webp";
    const charterCabinSrc = "/images/boats/neel-47/trimarano-camera3.webp";

    expect(
      getBoatContent("trimarano", "es")?.gallery.find((item) => item.src === boatSaloonSrc),
    ).toMatchObject({
      caption: "Salón con vistas al mar",
      alt: "Salón del trimarán abierto hacia la bañera y el mar",
    });
    expect(
      getBoatContent("trimarano", "fr")?.gallery.find((item) => item.src === boatSaloonSrc),
    ).toMatchObject({
      caption: "Salon vue mer",
      alt: "Salon du trimaran ouvert sur le cockpit et la mer",
    });
    expect(
      getBoatContent("trimarano", "de")?.gallery.find((item) => item.src === boatSaloonSrc),
    ).toMatchObject({
      caption: "Salon mit Meerblick",
      alt: "Salon des Trimarans mit offenem Übergang zum Cockpit und Meer",
    });

    expect(
      getExperienceContent("exclusive-experience", "es")?.media.find(
        (item) => item.src === boatSaloonSrc,
      ),
    ).toMatchObject({
      caption: "Salón con vistas al mar",
      alt: "Salón con vistas al mar durante la experiencia chef a bordo en trimarán por las Islas Egadi",
    });
    expect(
      getExperienceContent("cabin-charter", "fr")?.media.find(
        (item) => item.src === charterCabinSrc,
      ),
    ).toMatchObject({
      caption: "Cabine panoramique",
      alt: "Cabine panoramique pendant le charter en trimaran aux îles Égades",
    });
    expect(
      getExperienceContent("cabin-charter", "de")?.media.find(
        (item) => item.src === charterCabinSrc,
      ),
    ).toMatchObject({
      caption: "Panoramakabine",
      alt: "Panoramakabine während des Trimaran-Charters auf den Ägadischen Inseln",
    });
  });

  it("localizes fishing charter slugs from any known slug", () => {
    expect(localizedPathWithoutLocale("it", "/experiences/egadi-fishing-charter")).toBe(
      "/esperienze/charter-pesca-egadi-da-trapani",
    );
    expect(localizedPathWithoutLocale("es", "/experiences/egadi-fishing-charter")).toBe(
      "/experiencias/charter-pesca-egadi-desde-trapani",
    );
    expect(localizedPathWithoutLocale("fr", "/experiences/egadi-fishing-charter")).toBe(
      "/experiences/charter-peche-egades-depuis-trapani",
    );
    expect(localizedPathWithoutLocale("de", "/experiences/egadi-fishing-charter")).toBe(
      "/erlebnisse/angelcharter-aegadische-inseln-ab-trapani",
    );
  });
});
