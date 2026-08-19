import { daysBetween, parseIsoDay } from "@/lib/dates";

export const CHARTER_MIN_DURATION_DAYS = 3;
export const CHARTER_MAX_DURATION_DAYS = 7;

interface CalendarDateSelectionInput {
  isCharter: boolean;
  fixedDurationDays?: number;
  startDate: string;
  endDate: string;
  candidateDate: string;
  availabilityLoaded: boolean;
  daySelectable: boolean;
}

export interface CalendarDateSelection {
  selectable: boolean;
  isCharterEndCandidate: boolean;
  isCharterIntermediateDay: boolean;
}

export interface CalendarDateGroup {
  dates: string[];
  isSelectedRange: boolean;
}

/**
 * Raggruppa le date selezionate del charter in blocchi contigui, senza mai
 * attraversare il limite domenica/lunedi'. Ogni blocco puo' cosi' occupare
 * una sola cella CSS Grid estesa, come il charter nel calendario admin.
 */
export function groupCalendarDaysBySelectedRange(
  days: string[],
  startDate: string,
  endDate: string,
): CalendarDateGroup[] {
  const groups: CalendarDateGroup[] = [];
  const hasSelectedRange = Boolean(startDate && endDate && endDate >= startDate);
  let index = 0;

  while (index < days.length) {
    const date = days[index];
    const isSelectedRange = hasSelectedRange && date >= startDate && date <= endDate;

    if (!isSelectedRange) {
      groups.push({ dates: [date], isSelectedRange: false });
      index += 1;
      continue;
    }

    const dates = [date];
    const weekEndExclusive = Math.min(days.length, index + (7 - (index % 7)));
    let cursor = index + 1;
    while (
      cursor < weekEndExclusive &&
      days[cursor] >= startDate &&
      days[cursor] <= endDate
    ) {
      dates.push(days[cursor]);
      cursor += 1;
    }

    groups.push({ dates, isSelectedRange: true });
    index = cursor;
  }

  return groups;
}

/**
 * Decide se una cella del calendario puo' essere cliccata nel passo corrente.
 *
 * Lo stato API di un giorno descrive se quel giorno puo' essere una partenza.
 * Durante la scelta del ritorno charter, invece, la stessa cella rappresenta
 * una data finale: l'intero intervallo verra' validato dal server dopo il click.
 */
export function resolveCalendarDateSelection(
  input: CalendarDateSelectionInput,
): CalendarDateSelection {
  if (!input.availabilityLoaded) {
    return {
      selectable: false,
      isCharterEndCandidate: false,
      isCharterIntermediateDay: false,
    };
  }

  const isChoosingCharterEnd =
    input.isCharter &&
    !input.fixedDurationDays &&
    Boolean(input.startDate) &&
    !input.endDate;

  if (!isChoosingCharterEnd || input.candidateDate < input.startDate) {
    return {
      selectable: input.daySelectable,
      isCharterEndCandidate: false,
      isCharterIntermediateDay: false,
    };
  }

  const durationDays = daysBetween(
    parseIsoDay(input.startDate),
    parseIsoDay(input.candidateDate),
  );
  const isCharterEndCandidate =
    durationDays >= CHARTER_MIN_DURATION_DAYS &&
    durationDays <= CHARTER_MAX_DURATION_DAYS;
  const isCharterIntermediateDay =
    input.candidateDate > input.startDate &&
    durationDays < CHARTER_MIN_DURATION_DAYS;

  return {
    selectable: isCharterEndCandidate,
    isCharterEndCandidate,
    isCharterIntermediateDay,
  };
}
