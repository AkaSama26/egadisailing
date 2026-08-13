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
