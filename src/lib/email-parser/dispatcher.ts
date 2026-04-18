import type {
  CharterParser,
  CharterPlatform,
  ExtractedCharterBooking,
  ParsableEmail,
} from "./booking-extractor";
import { samboatParser } from "./samboat";
import { clickandboatParser } from "./clickandboat";
import { nautalParser } from "./nautal";

const PARSERS: CharterParser[] = [samboatParser, clickandboatParser, nautalParser];

export interface DispatchResult {
  platform: CharterPlatform | null;
  extracted: ExtractedCharterBooking | null;
}

/**
 * Seleziona il parser in base al dominio del mittente e tenta l'estrazione.
 * Ritorna `{ platform: null }` se nessun parser corrisponde al dominio.
 * Ritorna `{ platform, extracted: null }` se il parser matcha il dominio ma
 * il template ha fallito il parse.
 */
export function dispatch(email: ParsableEmail & { from: string }): DispatchResult {
  const domain = email.from.split("@")[1]?.toLowerCase() ?? "";
  for (const parser of PARSERS) {
    if (parser.senderDomains.some((d) => domain === d || domain.endsWith(`.${d}`))) {
      return {
        platform: parser.platform,
        extracted: parser.parse(email),
      };
    }
  }
  return { platform: null, extracted: null };
}
