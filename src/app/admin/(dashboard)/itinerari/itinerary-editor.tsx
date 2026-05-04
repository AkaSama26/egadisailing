"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Copy, Plus, Save, Trash2 } from "lucide-react";
import { copyExperienceItinerary, saveExperienceItinerary } from "./actions";

const ALL_LANGUAGES = "all";

export interface ItineraryServiceOption {
  id: string;
  name: string;
  boatName: string;
  durationLabel: string;
  configuredSteps: number;
}

export interface ItineraryLocaleOption {
  code: string;
  label: string;
  isDefault: boolean;
}

export interface ItineraryEditorTranslation {
  locale: string;
  time: string;
  title: string;
  location: string;
  text: string;
}

export interface ItineraryEditorStep {
  translations: ItineraryEditorTranslation[];
}

interface LocalStep {
  key: string;
  translations: Record<string, ItineraryEditorTranslation>;
}

interface ItineraryEditorProps {
  services: ItineraryServiceOption[];
  localeOptions: ItineraryLocaleOption[];
  selectedServiceId: string;
  initialSteps: ItineraryEditorStep[];
}

function emptyTranslation(locale: string): ItineraryEditorTranslation {
  return {
    locale,
    time: "",
    title: "",
    location: "",
    text: "",
  };
}

function toTranslationRecord(
  translations: ItineraryEditorTranslation[],
  localeOptions: ItineraryLocaleOption[],
): Record<string, ItineraryEditorTranslation> {
  const byLocale = new Map(translations.map((translation) => [translation.locale, translation]));
  return Object.fromEntries(
    localeOptions.map((locale) => [locale.code, byLocale.get(locale.code) ?? emptyTranslation(locale.code)]),
  );
}

function newStep(localeOptions: ItineraryLocaleOption[]): LocalStep {
  return {
    key: crypto.randomUUID(),
    translations: toTranslationRecord([], localeOptions),
  };
}

function withKeys(
  steps: ItineraryEditorStep[],
  localeOptions: ItineraryLocaleOption[],
): LocalStep[] {
  return steps.length > 0
    ? steps.map((step) => ({
        key: crypto.randomUUID(),
        translations: toTranslationRecord(step.translations, localeOptions),
      }))
    : [newStep(localeOptions)];
}

function fieldLabels(locale: string) {
  if (locale === "it") {
    return {
      time: "Orario",
      title: "Titolo",
      location: "Luogo",
      text: "Descrizione",
    };
  }

  return {
    time: "Time",
    title: "Title",
    location: "Location",
    text: "Description",
  };
}

function successMessage(message: string): boolean {
  return message.includes("salvato") || message.includes("copiato");
}

export function ItineraryEditor({
  services,
  localeOptions,
  selectedServiceId,
  initialSteps,
}: ItineraryEditorProps) {
  const router = useRouter();
  const defaultLocale = localeOptions.find((locale) => locale.isDefault)?.code ?? localeOptions[0]?.code ?? "it";
  const [steps, setSteps] = useState<LocalStep[]>(() => withKeys(initialSteps, localeOptions));
  const [copySourceId, setCopySourceId] = useState("");
  const [activeLanguage, setActiveLanguage] = useState<string>(defaultLocale);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedService = useMemo(
    () => services.find((service) => service.id === selectedServiceId),
    [services, selectedServiceId],
  );
  const copyOptions = services.filter((service) => service.id !== selectedServiceId);
  const visibleLocales =
    activeLanguage === ALL_LANGUAGES
      ? localeOptions
      : localeOptions.filter((locale) => locale.code === activeLanguage);

  useEffect(() => {
    setSteps(withKeys(initialSteps, localeOptions));
    setCopySourceId("");
    setMessage(null);
  }, [initialSteps, localeOptions, selectedServiceId]);

  useEffect(() => {
    if (
      activeLanguage !== ALL_LANGUAGES &&
      !localeOptions.some((locale) => locale.code === activeLanguage)
    ) {
      setActiveLanguage(defaultLocale);
    }
  }, [activeLanguage, defaultLocale, localeOptions]);

  function updateTranslation(
    index: number,
    locale: string,
    field: keyof Omit<ItineraryEditorTranslation, "locale">,
    value: string,
  ) {
    setSteps((current) =>
      current.map((step, i) => {
        if (i !== index) return step;
        const translation = step.translations[locale] ?? emptyTranslation(locale);
        return {
          ...step,
          translations: {
            ...step.translations,
            [locale]: { ...translation, [field]: value },
          },
        };
      }),
    );
  }

  function moveStep(index: number, direction: -1 | 1) {
    setSteps((current) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= current.length) return current;
      const next = [...current];
      const [item] = next.splice(index, 1);
      next.splice(nextIndex, 0, item);
      return next;
    });
  }

  function removeStep(index: number) {
    setSteps((current) => {
      if (current.length === 1) return current;
      return current.filter((_, i) => i !== index);
    });
  }

  function addStep() {
    setSteps((current) => [...current, newStep(localeOptions)]);
  }

  function save() {
    setMessage(null);
    startTransition(async () => {
      const result = await saveExperienceItinerary({
        serviceId: selectedServiceId,
        steps: steps.map((step) => ({
          translations: localeOptions.map((locale) => step.translations[locale.code] ?? emptyTranslation(locale.code)),
        })),
      });
      if (!result.ok) {
        setMessage(result.message);
        return;
      }
      setMessage(`Itinerario salvato (${result.data?.stepCount ?? steps.length} tappe).`);
      router.refresh();
    });
  }

  function copyFromSource() {
    if (!copySourceId) {
      setMessage("Scegli un itinerario sorgente da copiare.");
      return;
    }
    setMessage(null);
    startTransition(async () => {
      const result = await copyExperienceItinerary({
        targetServiceId: selectedServiceId,
        sourceServiceId: copySourceId,
      });
      if (!result.ok) {
        setMessage(result.message);
        return;
      }
      setMessage(`Itinerario copiato (${result.data?.stepCount ?? 0} tappe). Ora puoi modificarlo.`);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)]">
        <label className="block text-sm font-medium text-slate-700">
          Esperienza da modificare
          <select
            value={selectedServiceId}
            onChange={(event) => router.push(`/admin/itinerari?service=${event.target.value}`)}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
          >
            {services.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name} · {service.boatName} · {service.durationLabel}
              </option>
            ))}
          </select>
        </label>

        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
          <label className="block text-sm font-medium text-slate-700">
            Copia da
            <select
              value={copySourceId}
              onChange={(event) => setCopySourceId(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
            >
              <option value="">Scegli barca/esperienza</option>
              {copyOptions.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name} · {service.boatName}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={copyFromSource}
            disabled={isPending}
            className="inline-flex h-10 items-center justify-center gap-2 self-end rounded-lg bg-slate-900 px-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
          >
            <Copy className="h-4 w-4" />
            Copia
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white p-1">
        <span className="px-2 text-sm font-medium text-slate-600">Lingua itinerario</span>
        {localeOptions.map((locale) => (
          <button
            key={locale.code}
            type="button"
            aria-pressed={activeLanguage === locale.code}
            onClick={() => setActiveLanguage(locale.code)}
            className={`rounded-md px-3 py-1.5 text-sm font-semibold transition ${
              activeLanguage === locale.code
                ? "bg-slate-900 text-white"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            {locale.label}
          </button>
        ))}
        <button
          type="button"
          aria-pressed={activeLanguage === ALL_LANGUAGES}
          onClick={() => setActiveLanguage(ALL_LANGUAGES)}
          className={`rounded-md px-3 py-1.5 text-sm font-semibold transition ${
            activeLanguage === ALL_LANGUAGES
              ? "bg-slate-900 text-white"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          }`}
        >
          Tutte
        </button>
      </div>

      {selectedService && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          <span className="font-semibold text-slate-900">{selectedService.name}</span> su{" "}
          {selectedService.boatName}. Tappe DB configurate:{" "}
          <span className="font-semibold tabular-nums">{selectedService.configuredSteps}</span>.
        </div>
      )}

      <div className="space-y-6">
        {steps.map((step, index) => (
          <section key={step.key} className="border-t border-slate-200 pt-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Tappa {index + 1}
              </h3>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  aria-label="Sposta su"
                  title="Sposta su"
                  onClick={() => moveStep(index, -1)}
                  disabled={index === 0 || isPending}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label="Sposta giu"
                  title="Sposta giu"
                  onClick={() => moveStep(index, 1)}
                  disabled={index === steps.length - 1 || isPending}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                >
                  <ArrowDown className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label="Elimina tappa"
                  title="Elimina tappa"
                  onClick={() => removeStep(index)}
                  disabled={steps.length === 1 || isPending}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-100 text-red-600 hover:bg-red-50 disabled:opacity-40"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div
              className={`grid gap-4 ${
                activeLanguage === ALL_LANGUAGES ? "lg:grid-cols-2" : "lg:grid-cols-1"
              }`}
            >
              {visibleLocales.map((locale) => {
                const translation = step.translations[locale.code] ?? emptyTranslation(locale.code);
                const labels = fieldLabels(locale.code);
                const isRequired = locale.isDefault;

                return (
                  <div key={locale.code} className="space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      {locale.label}
                    </p>
                    <label className="block text-sm font-medium text-slate-700">
                      {labels.time}
                      <input
                        value={translation.time}
                        onChange={(event) =>
                          updateTranslation(index, locale.code, "time", event.target.value)
                        }
                        required={isRequired}
                        maxLength={40}
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="block text-sm font-medium text-slate-700">
                      {labels.title}
                      <input
                        value={translation.title}
                        onChange={(event) =>
                          updateTranslation(index, locale.code, "title", event.target.value)
                        }
                        maxLength={120}
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="block text-sm font-medium text-slate-700">
                      {labels.location}
                      <input
                        value={translation.location}
                        onChange={(event) =>
                          updateTranslation(index, locale.code, "location", event.target.value)
                        }
                        maxLength={120}
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="block text-sm font-medium text-slate-700">
                      {labels.text}
                      <textarea
                        value={translation.text}
                        onChange={(event) =>
                          updateTranslation(index, locale.code, "text", event.target.value)
                        }
                        required={isRequired}
                        maxLength={1200}
                        rows={4}
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      />
                    </label>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      {message && (
        <p
          className={`rounded-lg px-4 py-3 text-sm ${
            successMessage(message) ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"
          }`}
        >
          {message}
        </p>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={addStep}
          disabled={isPending || steps.length >= 30}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          Aggiungi tappa
        </button>
        <button
          type="button"
          onClick={save}
          disabled={isPending}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--color-ocean)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--color-ocean)]/90 disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {isPending ? "Salvataggio..." : "Salva itinerario"}
        </button>
      </div>
    </div>
  );
}
