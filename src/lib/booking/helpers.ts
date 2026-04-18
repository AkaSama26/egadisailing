import crypto from "node:crypto";
import { addDays, addHours } from "@/lib/dates";
import type { DurationType } from "@/generated/prisma/enums";

const CONFIRMATION_CODE_ALPHABET = "ABCDEFGHIJKLMNPQRSTUVWXYZ23456789";
const CONFIRMATION_CODE_LENGTH = 7;

/**
 * Genera un confirmation code con formato "ES-XXXXXXX".
 * Alfabeto 32 chars (no 0/O/1/I/L ambigui), ~34B combinazioni.
 */
export function generateConfirmationCode(): string {
  let code = "ES-";
  for (let i = 0; i < CONFIRMATION_CODE_LENGTH; i++) {
    code += CONFIRMATION_CODE_ALPHABET[crypto.randomInt(0, CONFIRMATION_CODE_ALPHABET.length)];
  }
  return code;
}

/**
 * Normalizza un confirmation code per lookup case-insensitive.
 * I codici ES-... sono uppercase, ma email client o condivisioni manuali
 * possono averli lowercase.
 */
export function normalizeConfirmationCode(input: string): string {
  return input.trim().toUpperCase();
}

/**
 * Deriva endDate server-side da service.durationType + durationHours.
 * NON usa endDate fornito dal client (DoS: un cliente potrebbe bloccare
 * calendario per mesi al prezzo di una giornata).
 */
export function deriveEndDate(
  startDate: Date,
  durationType: DurationType,
  durationHours: number,
): Date {
  switch (durationType) {
    case "WEEK":
      // Cabin charter: 7 giorni, cambio sabato
      return addDays(startDate, 6);
    case "FULL_DAY":
    case "HALF_DAY_MORNING":
    case "HALF_DAY_AFTERNOON":
      return addHours(startDate, durationHours);
    default:
      return addHours(startDate, durationHours);
  }
}
