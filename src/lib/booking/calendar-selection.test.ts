import { describe, expect, it } from "vitest";
import {
  groupCalendarDaysBySelectedRange,
  resolveCalendarDateSelection,
} from "@/lib/booking/calendar-selection";

const baseInput = {
  isCharter: true,
  startDate: "2026-08-26",
  endDate: "",
  availabilityLoaded: true,
  daySelectable: false,
};

describe("resolveCalendarDateSelection", () => {
  it("consente il 29 come ritorno del charter iniziato il 26 anche se il 29 non e' una partenza valida", () => {
    expect(
      resolveCalendarDateSelection({
        ...baseInput,
        candidateDate: "2026-08-29",
      }),
    ).toEqual({
      selectable: true,
      isCharterEndCandidate: true,
      isCharterIntermediateDay: false,
    });
  });

  it("mostra il 28 come giorno intermedio libero dopo una partenza il 27", () => {
    expect(
      resolveCalendarDateSelection({
        ...baseInput,
        startDate: "2026-08-27",
        candidateDate: "2026-08-28",
      }),
    ).toEqual({
      selectable: false,
      isCharterEndCandidate: false,
      isCharterIntermediateDay: true,
    });
  });

  it("non classifica la data di partenza stessa come giorno intermedio", () => {
    expect(
      resolveCalendarDateSelection({
        ...baseInput,
        startDate: "2026-08-27",
        candidateDate: "2026-08-27",
      }),
    ).toEqual({
      selectable: false,
      isCharterEndCandidate: false,
      isCharterIntermediateDay: false,
    });
  });

  it("mostra il 29 come primo rientro valido dopo una partenza il 27", () => {
    expect(
      resolveCalendarDateSelection({
        ...baseInput,
        startDate: "2026-08-27",
        candidateDate: "2026-08-29",
      }),
    ).toEqual({
      selectable: true,
      isCharterEndCandidate: true,
      isCharterIntermediateDay: false,
    });
  });

  it("non consente un ritorno oltre la durata massima di 7 giorni", () => {
    expect(
      resolveCalendarDateSelection({
        ...baseInput,
        candidateDate: "2026-09-02",
      }),
    ).toEqual({
      selectable: false,
      isCharterEndCandidate: false,
      isCharterIntermediateDay: false,
    });
  });

  it("continua a usare lo stato API per scegliere una nuova partenza precedente", () => {
    expect(
      resolveCalendarDateSelection({
        ...baseInput,
        candidateDate: "2026-08-25",
        daySelectable: true,
      }),
    ).toEqual({
      selectable: true,
      isCharterEndCandidate: false,
      isCharterIntermediateDay: false,
    });
  });

  it("non abilita celle prima che la disponibilita' sia caricata", () => {
    expect(
      resolveCalendarDateSelection({
        ...baseInput,
        candidateDate: "2026-08-29",
        availabilityLoaded: false,
      }),
    ).toEqual({
      selectable: false,
      isCharterEndCandidate: false,
      isCharterIntermediateDay: false,
    });
  });

  it("per servizi non charter conserva la selezionabilita' restituita dall'API", () => {
    expect(
      resolveCalendarDateSelection({
        ...baseInput,
        isCharter: false,
        candidateDate: "2026-08-29",
      }),
    ).toEqual({
      selectable: false,
      isCharterEndCandidate: false,
      isCharterIntermediateDay: false,
    });
  });
});

describe("groupCalendarDaysBySelectedRange", () => {
  const days = Array.from({ length: 14 }, (_, index) => {
    const date = new Date(Date.UTC(2026, 7, 17 + index));
    return date.toISOString().slice(0, 10);
  });

  it("unisce le date selezionate del charter in un solo blocco", () => {
    const groups = groupCalendarDaysBySelectedRange(days, "2026-08-18", "2026-08-21");
    const selectedGroups = groups.filter((group) => group.isSelectedRange);

    expect(selectedGroups).toEqual([
      {
        dates: ["2026-08-18", "2026-08-19", "2026-08-20", "2026-08-21"],
        isSelectedRange: true,
      },
    ]);
  });

  it("spezza il blocco tra domenica e lunedi'", () => {
    const groups = groupCalendarDaysBySelectedRange(days, "2026-08-21", "2026-08-24");
    const selectedGroups = groups.filter((group) => group.isSelectedRange);

    expect(selectedGroups.map((group) => group.dates)).toEqual([
      ["2026-08-21", "2026-08-22", "2026-08-23"],
      ["2026-08-24"],
    ]);
  });

  it("lascia separate le date quando non esiste un intervallo valido", () => {
    const groups = groupCalendarDaysBySelectedRange(days, "2026-08-21", "");

    expect(groups).toHaveLength(days.length);
    expect(groups.every((group) => !group.isSelectedRange && group.dates.length === 1)).toBe(true);
  });
});
