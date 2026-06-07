"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { CalendarDays, Check, ChevronLeft, ChevronRight, Clock, Ship, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { vatIncludedLabel } from "@/lib/pricing/vat-label";
import { localizedStaticPath } from "@/lib/i18n/static-paths";

type CalendarStatus = "available" | "request" | "unavailable";

interface CalendarDay {
  date: string;
  status: CalendarStatus;
  selectable: boolean;
  priceLabel: string | null;
  reasonLabel: string | null;
}

interface BookingInfoItem {
  label: string;
  value: string | number;
  icon: "clock" | "users" | "ship";
}

interface ExperienceBookingCardProps {
  locale: string;
  serviceId: string;
  bookingServiceParam: string;
  charterDurationDays?: number;
  title: string;
  text: string;
  priceLabel: string;
  priceUnit: string;
  bookNowLabel: string;
  infoItems: BookingInfoItem[];
  includedItems?: string[];
}

const weekDays = {
  it: ["L", "M", "M", "G", "V", "S", "D"],
  en: ["M", "T", "W", "T", "F", "S", "S"],
  es: ["L", "M", "X", "J", "V", "S", "D"],
  fr: ["L", "M", "M", "J", "V", "S", "D"],
  de: ["M", "D", "M", "D", "F", "S", "S"],
};

function subscribeHydration() {
  return () => {};
}

function useHydrated(): boolean {
  return useSyncExternalStore(subscribeHydration, () => true, () => false);
}

function toIsoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addIsoDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return toIsoDay(date);
}

function inclusiveDaysBetween(startDate: string, endDate: string): number | null {
  if (!startDate || !endDate) return null;
  const start = new Date(`${startDate}T00:00:00.000Z`).getTime();
  const end = new Date(`${endDate}T00:00:00.000Z`).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return null;
  return Math.round((end - start) / (24 * 60 * 60 * 1000)) + 1;
}

function monthKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function shiftMonth(key: string, offset: number): string {
  const [year, month] = key.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1 + offset, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function calendarRange(key: string) {
  const [year, month] = key.split("-").map(Number);
  const first = new Date(Date.UTC(year, month - 1, 1));
  const last = new Date(Date.UTC(year, month, 0));
  const leadingBlanks = (first.getUTCDay() + 6) % 7;
  const dates: Array<string | null> = Array.from({ length: leadingBlanks }, () => null);

  for (let day = 1; day <= last.getUTCDate(); day += 1) {
    dates.push(toIsoDay(new Date(Date.UTC(year, month - 1, day))));
  }

  while (dates.length % 7 !== 0) dates.push(null);

  return {
    start: toIsoDay(first),
    end: toIsoDay(last),
    dates,
  };
}

function monthLabel(key: string, locale: string): string {
  const date = new Date(`${key}-01T00:00:00.000Z`);
  return new Intl.DateTimeFormat(
    locale === "es"
      ? "es-ES"
      : locale === "fr"
        ? "fr-FR"
        : locale === "de"
          ? "de-DE"
          : locale === "en"
            ? "en-US"
            : "it-IT",
    {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
    },
  ).format(date);
}

function formatIsoDateLabel(isoDate: string, locale: string): string {
  const date = new Date(`${isoDate}T00:00:00.000Z`);
  return new Intl.DateTimeFormat(
    locale === "es"
      ? "es-ES"
      : locale === "fr"
        ? "fr-FR"
        : locale === "de"
          ? "de-DE"
          : locale === "en"
            ? "en-US"
            : "it-IT",
    {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    },
  ).format(date);
}

function iconForInfo(icon: BookingInfoItem["icon"]) {
  if (icon === "users") return Users;
  if (icon === "ship") return Ship;
  return Clock;
}

function includedBadgeLabel(locale: string, hasConditionalItems: boolean) {
  if (!hasConditionalItems) return "ALL INCLUSIVE";
  if (locale === "es") return "Incluido en el precio";
  if (locale === "fr") return "Inclus dans le prix";
  if (locale === "de") return "Im Preis enthalten";
  if (locale === "en") return "Included in the price";
  return "Incluso nel prezzo";
}

function includedHeading(locale: string) {
  if (locale === "es") return "Qué incluye";
  if (locale === "fr") return "Ce qui est inclus";
  if (locale === "de") return "Was inklusive ist";
  if (locale === "en") return "What's included";
  return "Cosa c'è incluso";
}

function isConditionalIncludedItem(item: string) {
  return /esclus|not included|extra|request|richiesta|su richiesta|sur demande|auf Anfrage|bajo petición|exclu|excluido/i.test(
    item,
  );
}

function dayClass({
  day,
  selected,
  rangeSelected,
  rangeStart,
  rangeEnd,
  loading,
}: {
  day: CalendarDay | undefined;
  selected: boolean;
  rangeSelected: boolean;
  rangeStart: boolean;
  rangeEnd: boolean;
  loading: boolean;
}): string {
  return cn(
    "flex aspect-square min-h-9 items-center justify-center rounded-md border text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-[var(--color-gold)] disabled:cursor-not-allowed sm:min-h-10 sm:text-sm",
    loading && "animate-pulse border-slate-200 bg-slate-100 text-slate-300",
    !loading && !day && "border-slate-200 bg-slate-50 text-slate-300",
    !selected &&
      !rangeSelected &&
      day?.status === "available" &&
      "border-emerald-200 bg-white text-slate-900 hover:bg-emerald-50",
    !selected &&
      !rangeSelected &&
      day?.status === "request" &&
      "border-amber-200 bg-amber-50 text-amber-950 hover:bg-amber-100",
    !selected &&
      !rangeSelected &&
      day?.status === "unavailable" &&
      "border-slate-200 bg-slate-100 text-slate-400",
    rangeSelected &&
      !rangeStart &&
      !rangeEnd &&
      "border-[var(--color-ocean)] bg-[var(--color-ocean)] text-white shadow-sm",
    selected && "border-[var(--color-ocean)] bg-[var(--color-ocean)] text-white shadow-sm",
    (rangeStart || rangeEnd) &&
      "border-[var(--color-ocean)] bg-[var(--color-ocean)] text-white shadow-sm",
  );
}

function buildBookingHref({
  locale,
  bookingServiceParam,
  selectedDate,
  selectedEndDate,
  selectedDurationDays,
}: Pick<ExperienceBookingCardProps, "locale" | "bookingServiceParam" | "charterDurationDays"> & {
  selectedDate?: string;
  selectedEndDate?: string;
  selectedDurationDays?: number;
}): string {
  const params = new URLSearchParams({ service: bookingServiceParam });
  if (selectedDate) {
    params.set("date", selectedDate);
    if (selectedDurationDays) {
      params.set("durationDays", String(selectedDurationDays));
      params.set("endDate", selectedEndDate ?? addIsoDays(selectedDate, selectedDurationDays - 1));
    }
  }

  return `${localizedStaticPath(locale, "/prenota")}?${params.toString()}`;
}

export function SmoothAnchorLink({
  targetId,
  children,
  className,
}: {
  targetId: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <a
      href={`#${targetId}`}
      className={className}
      onClick={(event) => {
        const target = document.getElementById(targetId);
        if (!target) return;

        event.preventDefault();
        target.scrollIntoView({ behavior: "smooth", block: "start" });
        window.history.replaceState(null, "", `#${targetId}`);
      }}
    >
      {children}
    </a>
  );
}

export function ExperienceBookingDialogButton({
  label,
  className,
  showIcon = true,
  dialogMode = "mobile",
  ...cardProps
}: ExperienceBookingCardProps & {
  label: string;
  className?: string;
  showIcon?: boolean;
  dialogMode?: "mobile" | "all";
}) {
  const bookingHref = buildBookingHref(cardProps);
  const dialogAll = dialogMode === "all";

  return (
    <>
      {!dialogAll && (
        <Button
          size="lg"
          nativeButton={false}
          className={cn("hidden lg:inline-flex", className)}
          render={<Link href={bookingHref} />}
        >
          {showIcon && <CalendarDays className="h-5 w-5" />}
          {label}
        </Button>
      )}

      <Sheet>
        <SheetTrigger
          render={
            <Button
              size="lg"
              className={cn(!dialogAll && "lg:hidden", className)}
            />
          }
        >
          {showIcon && <CalendarDays className="h-5 w-5" />}
          {label}
        </SheetTrigger>
        <SheetContent
          side="bottom"
          className={cn(
            "max-h-[92dvh] overflow-y-auto rounded-t-2xl border-t border-white/70 bg-[#f7f2e8] p-3 pt-10 shadow-2xl sm:mx-auto sm:mb-4 sm:w-[min(calc(100vw-2rem),68rem)] sm:max-w-none sm:rounded-2xl sm:border sm:p-4 sm:pt-10 lg:max-h-[88dvh] lg:p-5 lg:pt-10",
            !dialogAll && "lg:hidden",
          )}
        >
          <SheetTitle className="sr-only">{cardProps.title}</SheetTitle>
          <SheetDescription className="sr-only">{cardProps.text}</SheetDescription>
          <ExperienceBookingCard
            {...cardProps}
            className="border-white bg-white shadow-none"
          />
        </SheetContent>
      </Sheet>
    </>
  );
}

export function ExperienceBookingCard({
  locale,
  serviceId,
  bookingServiceParam,
  charterDurationDays,
  title,
  text,
  priceLabel,
  priceUnit,
  bookNowLabel,
  infoItems,
  includedItems,
  className,
}: ExperienceBookingCardProps & { className?: string }) {
  const hydrated = useHydrated();
  const [visibleMonth, setVisibleMonth] = useState(() => monthKey());
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedEndDate, setSelectedEndDate] = useState("");
  const [days, setDays] = useState<Record<string, CalendarDay>>({});
  const [selectedRangeDay, setSelectedRangeDay] = useState<CalendarDay | null>(null);
  const [rangeQuoteLoading, setRangeQuoteLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const range = useMemo(() => (visibleMonth ? calendarRange(visibleMonth) : null), [visibleMonth]);
  const currentMonth = hydrated ? monthKey() : "";
  const isCharter = Boolean(charterDurationDays);
  const selectedDurationDays = isCharter
    ? inclusiveDaysBetween(selectedDate, selectedEndDate)
    : null;
  const effectiveCalendarDurationDays =
    isCharter && selectedDurationDays && selectedDurationDays >= 3 && selectedDurationDays <= 7
      ? selectedDurationDays
      : isCharter
        ? 3
        : undefined;
  const selectedDay = selectedDate ? (selectedRangeDay ?? days[selectedDate]) : undefined;
  const charterTooShort =
    isCharter &&
    Boolean(selectedDate && selectedEndDate) &&
    (selectedDurationDays === null || selectedDurationDays < 3);
  const charterTooLong = isCharter && selectedDurationDays !== null && selectedDurationDays > 7;
  const charterRangeReady =
    isCharter &&
    Boolean(selectedDate && selectedEndDate) &&
    selectedDurationDays !== null &&
    selectedDurationDays >= 3 &&
    selectedDurationDays <= 7;
  const canBook =
    !isCharter
      ? Boolean(selectedDate)
      : Boolean(charterRangeReady && selectedRangeDay?.selectable && !rangeQuoteLoading);
  const vatLabel = vatIncludedLabel(locale);
  const displayedPriceStatusLabel =
    isCharter && selectedEndDate && (charterTooShort || charterTooLong)
      ? locale === "es"
        ? "Rango no válido"
        : locale === "fr"
          ? "Période non valide"
          : locale === "de"
            ? "Ungültiger Zeitraum"
            : locale === "en"
              ? "Invalid range"
              : "Intervallo non valido"
      : isCharter && charterRangeReady && rangeQuoteLoading
      ? locale === "es"
        ? "Calculando precio..."
        : locale === "fr"
          ? "Calcul du prix..."
          : locale === "de"
            ? "Preis wird berechnet..."
            : locale === "en"
              ? "Calculating price..."
              : "Calcolo prezzo..."
      : null;
  const displayedPriceLabel = displayedPriceStatusLabel ?? selectedDay?.priceLabel ?? priceLabel;
  const displayedPriceHasVat = displayedPriceLabel.includes(vatLabel);
  const includedPreviewItems = useMemo(
    () => (includedItems ?? []).filter((item) => !isConditionalIncludedItem(item)).slice(0, 4),
    [includedItems],
  );
  const hasConditionalIncludedItems = Boolean(
    includedItems?.some((item) => isConditionalIncludedItem(item)),
  );

  useEffect(() => {
    if (!hydrated || !range) return;

    const controller = new AbortController();
    const params = new URLSearchParams({
      serviceId,
      start: range.start,
      end: range.end,
      locale,
    });
    if (effectiveCalendarDurationDays) {
      params.set("durationDays", String(effectiveCalendarDurationDays));
    }

    queueMicrotask(() => {
      if (!controller.signal.aborted) {
        setLoading(true);
        setError(null);
      }
    });
    fetch(`/api/booking-calendar?${params.toString()}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("calendar");
        const body = (await res.json()) as { data?: { days?: CalendarDay[] } };
        const next: Record<string, CalendarDay> = {};
        for (const day of body.data?.days ?? []) next[day.date] = day;
        setDays(next);
      })
      .catch((err) => {
        if ((err as Error).name !== "AbortError") {
          setError(
            locale === "es"
              ? "Calendario temporalmente no disponible."
              : locale === "fr"
                ? "Calendrier temporairement indisponible."
                : locale === "de"
                  ? "Kalender vorübergehend nicht verfügbar."
                  : locale === "en"
                    ? "Calendar temporarily unavailable."
                    : "Calendario temporaneamente non disponibile.",
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [effectiveCalendarDurationDays, hydrated, locale, range, serviceId]);

  useEffect(() => {
    if (!isCharter || !selectedDate || !selectedDurationDays) {
      queueMicrotask(() => {
        setSelectedRangeDay(null);
        setRangeQuoteLoading(false);
      });
      return;
    }

    if (selectedDurationDays < 3 || selectedDurationDays > 7) {
      queueMicrotask(() => {
        setSelectedRangeDay(null);
        setRangeQuoteLoading(false);
      });
      return;
    }

    const controller = new AbortController();
    const params = new URLSearchParams({
      serviceId,
      start: selectedDate,
      end: selectedDate,
      locale,
      durationDays: String(selectedDurationDays),
    });

    queueMicrotask(() => {
      if (!controller.signal.aborted) setRangeQuoteLoading(true);
    });
    fetch(`/api/booking-calendar?${params.toString()}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("range");
        const body = (await res.json()) as { data?: { days?: CalendarDay[] } };
        setSelectedRangeDay(body.data?.days?.[0] ?? null);
      })
      .catch((err) => {
        if ((err as Error).name !== "AbortError") {
          setSelectedRangeDay(null);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setRangeQuoteLoading(false);
      });

    return () => controller.abort();
  }, [isCharter, locale, selectedDate, selectedDurationDays, serviceId]);

  const bookingHref = useMemo(
    () =>
      buildBookingHref({
        bookingServiceParam,
        locale,
        selectedDate,
        selectedEndDate,
        selectedDurationDays: isCharter ? selectedDurationDays ?? undefined : undefined,
      }),
    [bookingServiceParam, isCharter, locale, selectedDate, selectedDurationDays, selectedEndDate],
  );

  function handleDaySelect(date: string) {
    if (!isCharter) {
      setSelectedDate(date);
      return;
    }

    if (!selectedDate || selectedEndDate || date < selectedDate) {
      setSelectedDate(date);
      setSelectedEndDate("");
      setSelectedRangeDay(null);
      return;
    }

    setSelectedEndDate(date);
  }

  return (
    <div className={cn("rounded-lg border border-white/70 bg-white p-4 shadow-xl sm:p-6 lg:grid lg:grid-cols-[minmax(0,0.92fr)_minmax(25rem,1.08fr)] lg:items-start lg:gap-x-6 lg:gap-y-4", className)}>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-gold)] sm:text-sm sm:tracking-[0.18em] lg:col-start-1">
        {title}
      </p>
      {includedPreviewItems.length > 0 && (
        <div className="mt-4 rounded-lg border border-[var(--color-gold)]/35 bg-[#fff8ea] p-3 lg:col-start-1">
          <div className="flex items-center justify-between gap-3">
            <span className="rounded-full bg-[var(--color-ocean)] px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-white">
              {includedBadgeLabel(locale, hasConditionalIncludedItems)}
            </span>
            <span className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--color-gold)]">
              {includedHeading(locale)}
            </span>
          </div>
          <ul className="mt-3 grid gap-2 text-xs font-semibold leading-5 text-slate-700 sm:grid-cols-2">
            {includedPreviewItems.map((item) => (
              <li key={item} className="flex items-start gap-2">
                <Check className="mt-0.5 size-3.5 shrink-0 text-[var(--color-gold)]" aria-hidden="true" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-3 text-2xl font-bold text-[var(--color-ocean)] sm:mt-4 sm:text-3xl lg:col-start-1">
        {displayedPriceLabel}
      </p>
      <p className="mt-1 text-sm text-slate-500 lg:col-start-1">
        {priceUnit}
        {!displayedPriceStatusLabel && !displayedPriceHasVat && ` · ${vatLabel}`}
      </p>
      <p className="mt-4 text-sm leading-6 text-slate-600 sm:mt-5 lg:col-start-1">{text}</p>

      <div className="mt-5 rounded-lg border border-slate-200 bg-[#f7f2e8]/45 p-2 sm:mt-6 sm:p-3 lg:col-start-2 lg:row-span-8 lg:row-start-1 lg:mt-0">
        <div className="mb-3 flex items-center justify-between gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => setVisibleMonth((month) => shiftMonth(month, -1))}
            disabled={!hydrated || visibleMonth <= currentMonth}
            className="inline-flex size-7 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700 disabled:opacity-35 sm:size-8"
            aria-label={
              locale === "es"
                ? "Mes anterior"
                : locale === "fr"
                  ? "Mois précédent"
                  : locale === "de"
                    ? "Vorheriger Monat"
                    : locale === "en"
                      ? "Previous month"
                      : "Mese precedente"
            }
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
          </button>
          <p className="text-xs font-bold capitalize text-[var(--color-ocean)] sm:text-sm">
            {hydrated && visibleMonth
              ? monthLabel(visibleMonth, locale)
              : locale === "es"
                ? "Calendario"
                : locale === "fr"
                  ? "Calendrier"
                  : locale === "de"
                    ? "Kalender"
                    : locale === "en"
                      ? "Calendar"
                      : "Calendario"}
          </p>
          <button
            type="button"
            onClick={() => setVisibleMonth((month) => shiftMonth(month, 1))}
            disabled={!hydrated}
            className="inline-flex size-7 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700 sm:size-8"
            aria-label={
              locale === "es"
                ? "Mes siguiente"
                : locale === "fr"
                  ? "Mois suivant"
                  : locale === "de"
                    ? "Nächster Monat"
                    : locale === "en"
                      ? "Next month"
                      : "Mese successivo"
            }
          >
            <ChevronRight className="size-4" aria-hidden="true" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-0.5 text-center text-[9px] font-bold uppercase text-slate-500 sm:gap-1 sm:text-[10px]">
          {(locale === "es"
            ? weekDays.es
            : locale === "fr"
              ? weekDays.fr
              : locale === "de"
                ? weekDays.de
                : locale === "en"
                  ? weekDays.en
                  : weekDays.it
          ).map((day, index) => (
            <div key={`${day}-${index}`} className="py-1">
              {day}
            </div>
          ))}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-0.5 sm:gap-1">
          {!hydrated || !range
            ? Array.from({ length: 42 }, (_, index) => (
                <span
                  key={`placeholder-${index}`}
                  className="aspect-square min-h-9 rounded-md border border-slate-200 bg-slate-100 sm:min-h-10"
                />
              ))
            : range.dates.map((date, index) => {
                if (!date) {
                  return <span key={`blank-${index}`} className="aspect-square min-h-9 sm:min-h-10" />;
                }

                const day = days[date];
                const isPast = date < toIsoDay(new Date());
                const pickingCharterEnd = isCharter && Boolean(selectedDate) && !selectedEndDate;
                const selectable = pickingCharterEnd
                  ? !isPast
                  : Boolean(day?.selectable);
                const selected = selectedDate === date || selectedEndDate === date;
                const rangeSelected = Boolean(
                  isCharter &&
                    selectedDate &&
                    selectedEndDate &&
                    date >= selectedDate &&
                    date <= selectedEndDate,
                );
                const rangeStart = isCharter && selectedDate === date;
                const rangeEnd = isCharter && selectedEndDate === date;
                return (
                  <button
                    key={date}
                    type="button"
                    disabled={!selectable}
                    aria-pressed={selected}
                    aria-label={`${date}, ${day?.reasonLabel ?? ""}`}
                    onClick={() => handleDaySelect(date)}
                    className={dayClass({
                      day,
                      selected,
                      rangeSelected,
                      rangeStart,
                      rangeEnd,
                      loading: loading && !day,
                    })}
                  >
                    {Number(date.slice(8, 10))}
                  </button>
                );
              })}
        </div>

        <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold text-slate-600">
          <span className="inline-flex items-center gap-1">
            <span className="size-2 rounded-full bg-emerald-500" aria-hidden="true" />
            {locale === "es"
              ? "Libre"
              : locale === "fr"
                ? "Libre"
                : locale === "de"
                  ? "Frei"
                  : locale === "en"
                    ? "Free"
                    : "Libera"}
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="size-2 rounded-full bg-amber-500" aria-hidden="true" />
            {locale === "es"
              ? "Bajo petición"
              : locale === "fr"
                ? "Sur demande"
                : locale === "de"
                  ? "Auf Anfrage"
                  : locale === "en"
                    ? "On request"
                    : "Su richiesta"}
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="size-2 rounded-full bg-slate-300" aria-hidden="true" />
            {locale === "es"
              ? "No disponible"
              : locale === "fr"
                ? "Indisponible"
                : locale === "de"
                  ? "Nicht verfügbar"
                  : locale === "en"
                    ? "Unavailable"
                    : "Non disponibile"}
          </span>
        </div>
        {isCharter && !selectedDate && (
          <p className="mt-3 rounded-md bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-900">
            {locale === "es"
              ? "Selecciona primero la salida y luego el regreso."
              : locale === "fr"
                ? "Sélectionnez d'abord le départ, puis le retour."
                : locale === "de"
                  ? "Wählen Sie zuerst die Abfahrt und dann die Rückkehr."
                  : locale === "en"
                    ? "Select the departure date first, then the return date."
                    : "Seleziona prima la partenza, poi il ritorno."}
          </p>
        )}
        {selectedDate && (
          <div className="mt-3 rounded-md bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-900">
            {isCharter ? (
              <div className="space-y-1">
                <p>
                  {locale === "es"
                    ? "Salida"
                    : locale === "fr"
                      ? "Départ"
                      : locale === "de"
                        ? "Abfahrt"
                        : locale === "en"
                          ? "Departure"
                          : "Partenza"}: {formatIsoDateLabel(selectedDate, locale)}
                </p>
                <p>
                  {locale === "es"
                    ? "Regreso"
                    : locale === "fr"
                      ? "Retour"
                      : locale === "de"
                        ? "Rückkehr"
                        : locale === "en"
                          ? "Return"
                          : "Ritorno"}:{" "}
                  {selectedEndDate
                    ? formatIsoDateLabel(selectedEndDate, locale)
                    : locale === "es"
                      ? "selecciona una fecha"
                      : locale === "fr"
                        ? "sélectionnez une date"
                        : locale === "de"
                          ? "Datum auswählen"
                          : locale === "en"
                            ? "select a date"
                            : "seleziona una data"}
                </p>
                {selectedDurationDays && selectedEndDate ? (
                  <p>
                    {selectedDurationDays}{" "}
                    {locale === "es"
                      ? "días seleccionados"
                      : locale === "fr"
                        ? "jours sélectionnés"
                        : locale === "de"
                          ? "Tage ausgewählt"
                          : locale === "en"
                            ? "selected days"
                            : "giornate selezionate"}
                  </p>
                ) : null}
                {charterTooShort && (
                  <p className="text-amber-800">
                    {locale === "es"
                      ? "El charter requiere al menos 3 días."
                      : locale === "fr"
                        ? "Le charter nécessite au moins 3 jours."
                        : locale === "de"
                          ? "Der Charter erfordert mindestens 3 Tage."
                          : locale === "en"
                            ? "Charter requires at least 3 days."
                            : "Il charter richiede almeno 3 giornate."}
                  </p>
                )}
                {charterTooLong && (
                  <p className="text-sky-800">
                    {locale === "es"
                      ? "Para más de 7 días, contacta con la tripulación."
                      : locale === "fr"
                        ? "Pour plus de 7 jours, contactez l'équipe."
                        : locale === "de"
                          ? "Für mehr als 7 Tage kontaktieren Sie bitte die Crew."
                          : locale === "en"
                            ? "For more than 7 days, contact the crew."
                            : "Per più di 7 giornate contatta la crew."}
                  </p>
                )}
                {charterRangeReady && selectedRangeDay && !selectedRangeDay.selectable && (
                  <p className="text-red-700">
                    {selectedRangeDay.reasonLabel ??
                      (locale === "en"
                        ? "Selected range is not available."
                        : "Intervallo non disponibile.")}
                  </p>
                )}
              </div>
            ) : (
              <p>
                {locale === "es"
                  ? "Fecha seleccionada"
                  : locale === "fr"
                    ? "Date sélectionnée"
                    : locale === "de"
                      ? "Ausgewähltes Datum"
                      : locale === "en"
                        ? "Selected date"
                        : "Data selezionata"}: {selectedDate}
              </p>
            )}
          </div>
        )}
        {error && <p className="mt-3 text-xs font-semibold text-red-700">{error}</p>}
      </div>

      <div className="mt-5 space-y-3 border-y border-slate-200 py-4 text-sm sm:mt-6 sm:py-5 lg:col-start-1">
        {infoItems.map((item) => {
          const Icon = iconForInfo(item.icon);
          return (
            <div key={item.label} className="flex items-center justify-between gap-4">
              <span className="inline-flex items-center gap-2 text-slate-500">
                <Icon className="h-4 w-4" />
                {item.label}
              </span>
              <strong className="text-right text-[var(--color-ocean)]">{item.value}</strong>
            </div>
          );
        })}
      </div>

      {canBook ? (
        <Button
          size="lg"
          nativeButton={false}
          className="mt-6 w-full !bg-[var(--color-gold)] py-6 text-base font-semibold !text-white hover:!bg-[#b86504] hover:!text-white lg:col-start-1"
          render={<a href={bookingHref} />}
        >
          <CalendarDays className="h-5 w-5" />
          {bookNowLabel}
        </Button>
      ) : (
        <Button
          size="lg"
          disabled
          className="mt-6 w-full !bg-[var(--color-gold)] py-6 text-base font-semibold !text-white hover:!bg-[#b86504] hover:!text-white disabled:opacity-45 lg:col-start-1"
        >
          <CalendarDays className="h-5 w-5" />
          {bookNowLabel}
        </Button>
      )}
    </div>
  );
}
