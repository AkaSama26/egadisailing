"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { auditLog } from "@/lib/audit/log";
import { AUDIT_ACTIONS } from "@/lib/audit/actions";
import { ValidationError } from "@/lib/errors";
import { withAdminAction } from "@/lib/admin/with-admin-action";
import { routing } from "@/i18n/routing";
import { getExperiencePublicSlug } from "@/data/catalog/experiences";
import {
  DEFAULT_ITINERARY_LOCALE,
  getCopyableItinerarySteps,
  getItineraryLocales,
} from "@/lib/experiences/itineraries";

const emptyToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const optionalTextField = (max: number) =>
  z.preprocess(
    emptyToUndefined,
    z
      .string()
      .transform((s) => s.trim())
      .pipe(z.string().max(max))
      .optional(),
  );

const localeField = z
  .string()
  .trim()
  .min(2)
  .max(16)
  .regex(/^[a-z]{2,3}(?:-[A-Z]{2})?$/);

const itineraryTranslationSchema = z.object({
  locale: localeField,
  time: optionalTextField(40),
  title: optionalTextField(120),
  location: optionalTextField(120),
  text: optionalTextField(1200),
});

const itineraryStepSchema = z.object({
  translations: z.array(itineraryTranslationSchema).min(1).max(20),
});

const saveExperienceItinerarySchema = z.object({
  serviceId: z.string().min(1),
  steps: z.array(itineraryStepSchema).min(1).max(30),
});

const copyExperienceItinerarySchema = z.object({
  targetServiceId: z.string().min(1),
  sourceServiceId: z.string().min(1),
});

type SaveExperienceItineraryInput = z.infer<typeof saveExperienceItinerarySchema>;
type ItineraryTranslationInput = z.infer<typeof itineraryTranslationSchema>;

interface NormalizedItineraryTranslation {
  locale: string;
  time?: string;
  title?: string;
  location?: string;
  text?: string;
}

interface NormalizedItineraryStep {
  translations: NormalizedItineraryTranslation[];
}

function itineraryRevalidatePaths(serviceId: string): string[] {
  const slug = getExperiencePublicSlug(serviceId);
  return [
    "/admin/itinerari",
    ...routing.locales.map((locale) => `/${locale}/experiences/${slug}`),
  ];
}

async function assertServiceExists(serviceId: string): Promise<void> {
  const exists = await db.service.findUnique({
    where: { id: serviceId },
    select: { id: true },
  });
  if (!exists) throw new ValidationError(`Servizio non trovato: ${serviceId}`);
}

function hasTranslationContent(translation: NormalizedItineraryTranslation): boolean {
  return Boolean(translation.time || translation.title || translation.location || translation.text);
}

function normalizeTranslation(translation: ItineraryTranslationInput): NormalizedItineraryTranslation {
  return {
    locale: translation.locale,
    time: translation.time,
    title: translation.title,
    location: translation.location,
    text: translation.text,
  };
}

function normalizeItinerarySteps(steps: SaveExperienceItineraryInput["steps"]): NormalizedItineraryStep[] {
  const supportedLocales = getItineraryLocales();
  const supportedSet = new Set(supportedLocales);

  return steps.map((step, index) => {
    const translations = step.translations.map(normalizeTranslation);
    const unsupported = translations.find((translation) => !supportedSet.has(translation.locale));
    if (unsupported) {
      throw new ValidationError(`Locale itinerario non supportata: ${unsupported.locale}`);
    }

    const byLocale = new Map(translations.map((translation) => [translation.locale, translation]));
    const defaultTranslation = byLocale.get(DEFAULT_ITINERARY_LOCALE);
    if (!defaultTranslation?.time || !defaultTranslation.text) {
      throw new ValidationError(
        `Tappa ${index + 1}: compila orario e descrizione in ${DEFAULT_ITINERARY_LOCALE.toUpperCase()}`,
      );
    }

    return {
      translations: supportedLocales
        .map((locale) => byLocale.get(locale) ?? { locale })
        .filter(
          (translation) =>
            translation.locale === DEFAULT_ITINERARY_LOCALE || hasTranslationContent(translation),
        ),
    };
  });
}

async function replaceItinerary(serviceId: string, steps: NormalizedItineraryStep[]) {
  await db.$transaction(async (tx) => {
    await tx.experienceItineraryStep.deleteMany({
      where: { serviceId },
    });

    for (const [index, step] of steps.entries()) {
      await tx.experienceItineraryStep.create({
        data: {
          serviceId,
          sortOrder: index,
          active: true,
          translations: {
            create: step.translations.map((translation) => ({
              locale: translation.locale,
              time: translation.time ?? null,
              title: translation.title ?? null,
              location: translation.location ?? null,
              text: translation.text ?? null,
            })),
          },
        },
      });
    }
  });
}

function copyableStepsToActionInput(
  steps: Awaited<ReturnType<typeof getCopyableItinerarySteps>>,
): SaveExperienceItineraryInput["steps"] {
  return steps.map((step) => ({
    translations: step.translations.map((translation) => ({
      locale: translation.locale,
      time: translation.time || undefined,
      title: translation.title || undefined,
      location: translation.location || undefined,
      text: translation.text || undefined,
    })),
  }));
}

export const saveExperienceItinerary = withAdminAction(
  {
    schema: saveExperienceItinerarySchema,
    revalidatePaths: (input) => itineraryRevalidatePaths(input.serviceId),
  },
  async (input, { userId }) => {
    await assertServiceExists(input.serviceId);
    const steps = normalizeItinerarySteps(input.steps);
    await replaceItinerary(input.serviceId, steps);

    await auditLog({
      userId,
      action: AUDIT_ACTIONS.UPDATE,
      entity: "ExperienceItinerary",
      entityId: input.serviceId,
      after: {
        serviceId: input.serviceId,
        stepCount: steps.length,
        locales: getItineraryLocales(),
      },
    });

    return { stepCount: steps.length };
  },
);

export const copyExperienceItinerary = withAdminAction(
  {
    schema: copyExperienceItinerarySchema,
    revalidatePaths: (input) => itineraryRevalidatePaths(input.targetServiceId),
  },
  async (input, { userId }) => {
    if (input.targetServiceId === input.sourceServiceId) {
      throw new ValidationError("Scegli un servizio sorgente diverso da quello da modificare");
    }

    await Promise.all([
      assertServiceExists(input.targetServiceId),
      assertServiceExists(input.sourceServiceId),
    ]);

    const sourceSteps = await getCopyableItinerarySteps(input.sourceServiceId);
    if (sourceSteps.length === 0) {
      throw new ValidationError("Il servizio sorgente non ha un itinerario copiabile");
    }

    const steps = normalizeItinerarySteps(copyableStepsToActionInput(sourceSteps));

    await replaceItinerary(input.targetServiceId, steps);

    await auditLog({
      userId,
      action: AUDIT_ACTIONS.UPDATE,
      entity: "ExperienceItinerary",
      entityId: input.targetServiceId,
      after: {
        serviceId: input.targetServiceId,
        copiedFromServiceId: input.sourceServiceId,
        stepCount: steps.length,
        locales: getItineraryLocales(),
      },
    });

    return { stepCount: steps.length };
  },
);
