"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight, Clock, Ship, Users } from "lucide-react";
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
}

const weekDays = {
  it: ["L", "M", "M", "G", "V", "S", "D"],
  en: ["M", "T", "W", "T", "F", "S", "S"],
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
  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "it-IT", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function iconForInfo(icon: BookingInfoItem["icon"]) {
  if (icon === "users") return Users;
  if (icon === "ship") return Ship;
  return Clock;
}

function dayClass(day: CalendarDay | undefined, selected: boolean, loading: boolean): string {
  return cn(
    "flex aspect-square min-h-9 items-center justify-center rounded-md border text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-[var(--color-gold)] disabled:cursor-not-allowed sm:min-h-10 sm:text-sm",
    loading && "animate-pulse border-slate-200 bg-slate-100 text-slate-300",
    !loading && !day && "border-slate-200 bg-slate-50 text-slate-300",
    !selected &&
      day?.status === "available" &&
      "border-emerald-200 bg-white text-slate-900 hover:bg-emerald-50",
    !selected &&
      day?.status === "request" &&
      "border-amber-200 bg-amber-50 text-amber-950 hover:bg-amber-100",
    !selected &&
      day?.status === "unavailable" &&
      "border-slate-200 bg-slate-100 text-slate-400",
    selected && "border-[var(--color-ocean)] bg-[var(--color-ocean)] text-white shadow-sm",
  );
}

function buildBookingHref({
  locale,
  bookingServiceParam,
  charterDurationDays,
  selectedDate,
}: Pick<ExperienceBookingCardProps, "locale" | "bookingServiceParam" | "charterDurationDays"> & {
  selectedDate?: string;
}): string {
  const params = new URLSearchParams({ service: bookingServiceParam });
  if (selectedDate) {
    params.set("date", selectedDate);
    if (charterDurationDays) {
      params.set("durationDays", String(charterDurationDays));
      params.set("endDate", addIsoDays(selectedDate, charterDurationDays - 1));
    }
  }

  return `/${locale}/prenota?${params.toString()}`;
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
  ...cardProps
}: ExperienceBookingCardProps & {
  label: string;
  className?: string;
  showIcon?: boolean;
}) {
  const bookingHref = buildBookingHref(cardProps);

  return (
    <>
      <Button
        size="lg"
        nativeButton={false}
        className={cn("hidden lg:inline-flex", className)}
        render={<Link href={bookingHref} />}
      >
        {showIcon && <CalendarDays className="h-5 w-5" />}
        {label}
      </Button>

      <Sheet>
        <SheetTrigger
          render={
            <Button
              size="lg"
              className={cn("lg:hidden", className)}
            />
          }
        >
          {showIcon && <CalendarDays className="h-5 w-5" />}
          {label}
        </SheetTrigger>
        <SheetContent
          side="bottom"
          className="max-h-[92dvh] overflow-y-auto rounded-t-2xl border-t border-white/70 bg-[#f7f2e8] p-3 pt-10 shadow-2xl sm:mx-auto sm:mb-4 sm:max-w-md sm:rounded-2xl sm:border sm:p-4 sm:pt-10 lg:hidden"
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
  className,
}: ExperienceBookingCardProps & { className?: string }) {
  const hydrated = useHydrated();
  const [visibleMonth, setVisibleMonth] = useState(() => monthKey());
  const [selectedDate, setSelectedDate] = useState("");
  const [days, setDays] = useState<Record<string, CalendarDay>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const range = useMemo(() => (visibleMonth ? calendarRange(visibleMonth) : null), [visibleMonth]);
  const currentMonth = hydrated ? monthKey() : "";
  const selectedDay = selectedDate ? days[selectedDate] : undefined;
  const vatLabel = vatIncludedLabel(locale);
  const displayedPriceLabel = selectedDay?.priceLabel ?? priceLabel;
  const displayedPriceHasVat = displayedPriceLabel.includes(vatLabel);

  useEffect(() => {
    if (!hydrated || !range) return;

    const controller = new AbortController();
    const params = new URLSearchParams({
      serviceId,
      start: range.start,
      end: range.end,
      locale,
    });
    if (charterDurationDays) params.set("durationDays", String(charterDurationDays));

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
            locale === "en"
              ? "Calendar temporarily unavailable."
              : "Calendario temporaneamente non disponibile.",
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [charterDurationDays, hydrated, locale, range, serviceId]);

  const bookingHref = useMemo(
    () => buildBookingHref({ bookingServiceParam, charterDurationDays, locale, selectedDate }),
    [bookingServiceParam, charterDurationDays, locale, selectedDate],
  );

  return (
    <div className={cn("rounded-lg border border-white/70 bg-white p-4 shadow-xl sm:p-6", className)}>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-gold)] sm:text-sm sm:tracking-[0.18em]">
        {title}
      </p>
      <p className="mt-3 text-2xl font-bold text-[var(--color-ocean)] sm:mt-4 sm:text-3xl">
        {displayedPriceLabel}
      </p>
      <p className="mt-1 text-sm text-slate-500">
        {priceUnit}
        {!displayedPriceHasVat && ` · ${vatLabel}`}
      </p>
      <p className="mt-4 text-sm leading-6 text-slate-600 sm:mt-5">{text}</p>

      <div className="mt-5 rounded-lg border border-slate-200 bg-[#f7f2e8]/45 p-2 sm:mt-6 sm:p-3">
        <div className="mb-3 flex items-center justify-between gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => setVisibleMonth((month) => shiftMonth(month, -1))}
            disabled={!hydrated || visibleMonth <= currentMonth}
            className="inline-flex size-7 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700 disabled:opacity-35 sm:size-8"
            aria-label={locale === "en" ? "Previous month" : "Mese precedente"}
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
          </button>
          <p className="text-xs font-bold capitalize text-[var(--color-ocean)] sm:text-sm">
            {hydrated && visibleMonth
              ? monthLabel(visibleMonth, locale)
              : locale === "en"
                ? "Calendar"
                : "Calendario"}
          </p>
          <button
            type="button"
            onClick={() => setVisibleMonth((month) => shiftMonth(month, 1))}
            disabled={!hydrated}
            className="inline-flex size-7 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700 sm:size-8"
            aria-label={locale === "en" ? "Next month" : "Mese successivo"}
          >
            <ChevronRight className="size-4" aria-hidden="true" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-0.5 text-center text-[9px] font-bold uppercase text-slate-500 sm:gap-1 sm:text-[10px]">
          {(locale === "en" ? weekDays.en : weekDays.it).map((day, index) => (
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
                const selectable = Boolean(day?.selectable);
                const selected = selectedDate === date;
                return (
                  <button
                    key={date}
                    type="button"
                    disabled={!selectable}
                    aria-pressed={selected}
                    aria-label={`${date}, ${day?.reasonLabel ?? ""}`}
                    onClick={() => setSelectedDate(date)}
                    className={dayClass(day, selected, loading && !day)}
                  >
                    {Number(date.slice(8, 10))}
                  </button>
                );
              })}
        </div>

        <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold text-slate-600">
          <span className="inline-flex items-center gap-1">
            <span className="size-2 rounded-full bg-emerald-500" aria-hidden="true" />
            {locale === "en" ? "Free" : "Libera"}
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="size-2 rounded-full bg-amber-500" aria-hidden="true" />
            {locale === "en" ? "On request" : "Su richiesta"}
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="size-2 rounded-full bg-slate-300" aria-hidden="true" />
            {locale === "en" ? "Unavailable" : "Non disponibile"}
          </span>
        </div>
        {selectedDate && (
          <p className="mt-3 rounded-md bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">
            {locale === "en" ? "Selected date" : "Data selezionata"}: {selectedDate}
          </p>
        )}
        {error && <p className="mt-3 text-xs font-semibold text-red-700">{error}</p>}
      </div>

      <div className="mt-5 space-y-3 border-y border-slate-200 py-4 text-sm sm:mt-6 sm:py-5">
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

      {selectedDate ? (
        <Button
          size="lg"
          nativeButton={false}
          className="mt-6 w-full bg-[var(--color-gold)] py-6 text-base font-semibold text-white hover:bg-[var(--color-gold)]/90"
          render={<a href={bookingHref} />}
        >
          <CalendarDays className="h-5 w-5" />
          {bookNowLabel}
        </Button>
      ) : (
        <Button
          size="lg"
          disabled
          className="mt-6 w-full bg-[var(--color-gold)] py-6 text-base font-semibold text-white hover:bg-[var(--color-gold)]/90 disabled:opacity-45"
        >
          <CalendarDays className="h-5 w-5" />
          {bookNowLabel}
        </Button>
      )}
    </div>
  );
}
