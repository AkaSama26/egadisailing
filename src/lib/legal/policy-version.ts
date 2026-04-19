/**
 * R18-REG-ALTA: versione del consenso legale (Privacy Policy + T&C).
 *
 * Singola fonte di verita' per evitare drift tra pagine /privacy, /terms,
 * wizard consent submission e Zod allowlist server-side.
 *
 * BUMP PROTOCOL (quando il testo legale cambia):
 *   1. Bump `CURRENT_POLICY_VERSION` (es. "1.0" → "1.1" minor; "2.0" major).
 *   2. Aggiungere la nuova versione a `ACCEPTED_POLICY_VERSIONS` PRIMA di
 *      rimuovere la vecchia (retrocompatibilita' wizard cached client).
 *   3. Aggiornare `EFFECTIVE_DATE` con la data di messa in vigore.
 *   4. Dopo 30gg (quando i wizard cached sono expired), rimuovere la
 *      versione vecchia da `ACCEPTED_POLICY_VERSIONS` per rigorousness.
 *
 * I ConsentRecord storici mantengono la `policyVersion` al momento della
 * creazione — prova probatoria GDPR art. 7.3.
 */

export const CURRENT_POLICY_VERSION = "1.0" as const;

/**
 * Versioni ancora accettate server-side (Zod enum). Include la versione
 * corrente + eventuali versioni precedenti in transition window.
 *
 * R19-REG-MEDIA-2: array MANUALE, non derivato da `CURRENT_POLICY_VERSION`.
 * Se fosse `[CURRENT]`, ogni bump di CURRENT rimuoveva istantaneamente il
 * supporto per la versione precedente → wizard cached dei clienti con
 * vecchia versione submit → 400 ValidationError. Con array manuale,
 * devi **aggiungere** la nuova prima del bump, **rimuovere** la vecchia
 * 30gg dopo (quando tutti i cache lato client sono scaduti).
 */
export const ACCEPTED_POLICY_VERSIONS = ["1.0"] as const;

export type PolicyVersion = (typeof ACCEPTED_POLICY_VERSIONS)[number];

/** Data di messa in vigore della `CURRENT_POLICY_VERSION`. */
export const EFFECTIVE_DATE = "18 aprile 2026";
