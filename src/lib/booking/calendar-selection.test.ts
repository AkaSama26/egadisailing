import { describe, expect, it } from "vitest";
import { resolveCalendarDateSelection } from "@/lib/booking/calendar-selection";

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
    ).toEqual({ selectable: true, isCharterEndCandidate: true });
  });

  it("non consente un ritorno prima della durata minima di 3 giorni", () => {
    expect(
      resolveCalendarDateSelection({
        ...baseInput,
        candidateDate: "2026-08-27",
      }),
    ).toEqual({ selectable: false, isCharterEndCandidate: false });
  });

  it("non consente un ritorno oltre la durata massima di 7 giorni", () => {
    expect(
      resolveCalendarDateSelection({
        ...baseInput,
        candidateDate: "2026-09-02",
      }),
    ).toEqual({ selectable: false, isCharterEndCandidate: false });
  });

  it("continua a usare lo stato API per scegliere una nuova partenza precedente", () => {
    expect(
      resolveCalendarDateSelection({
        ...baseInput,
        candidateDate: "2026-08-25",
        daySelectable: true,
      }),
    ).toEqual({ selectable: true, isCharterEndCandidate: false });
  });

  it("non abilita celle prima che la disponibilita' sia caricata", () => {
    expect(
      resolveCalendarDateSelection({
        ...baseInput,
        candidateDate: "2026-08-29",
        availabilityLoaded: false,
      }),
    ).toEqual({ selectable: false, isCharterEndCandidate: false });
  });

  it("per servizi non charter conserva la selezionabilita' restituita dall'API", () => {
    expect(
      resolveCalendarDateSelection({
        ...baseInput,
        isCharter: false,
        candidateDate: "2026-08-29",
      }),
    ).toEqual({ selectable: false, isCharterEndCandidate: false });
  });
});
