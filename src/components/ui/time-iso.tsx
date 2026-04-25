import { formatItDateTime, formatItDay } from "@/lib/dates";

export interface TimeIsoProps {
  datetime: Date | string;
  /** Display format (default datetime). */
  format?: "date" | "datetime";
  className?: string;
}

/**
 * Componente <time> SEO/i18n/screen-reader friendly. Render datetime ISO
 * nell'attributo + label localizzato Europe/Rome.
 *
 * Esempi:
 *   <TimeIso datetime={booking.createdAt} />            // 24/04/2026 15:30
 *   <TimeIso datetime={booking.startDate} format="date" />  // 24/04/2026
 */
export function TimeIso({ datetime, format = "datetime", className }: TimeIsoProps) {
  const d = typeof datetime === "string" ? new Date(datetime) : datetime;
  const iso = d.toISOString();
  const label = format === "date" ? formatItDay(d) : formatItDateTime(d);
  return (
    <time dateTime={iso} className={className}>
      {label}
    </time>
  );
}
