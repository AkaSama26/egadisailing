import { cn } from "@/lib/utils";

type FlagCode = string;

const FLAGCDN_UNSUPPORTED_CODES = new Set(["AC", "TA"]);

function flagSrc(code: string): string {
  const normalized = code.toLowerCase();
  if (FLAGCDN_UNSUPPORTED_CODES.has(code.toUpperCase())) {
    return `https://hatscripts.github.io/circle-flags/flags/${normalized}.svg`;
  }
  return `https://flagcdn.com/${normalized}.svg`;
}

export function CountryFlag({
  code,
  className,
}: {
  code: FlagCode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-4 w-6 shrink-0 overflow-hidden rounded-[2px] shadow-[0_0_0_1px_rgba(15,23,42,0.16)]",
        className,
      )}
      aria-hidden="true"
    >
      <img
        src={flagSrc(code)}
        alt=""
        loading="lazy"
        className="h-full w-full object-cover"
      />
    </span>
  );
}

export type { FlagCode };
