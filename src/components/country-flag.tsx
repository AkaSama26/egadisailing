import { cn } from "@/lib/utils";

type FlagCode = "IT" | "GB" | "FR" | "DE" | "ES" | "US" | "CH" | "NL" | "BE" | "AT";

const flagTitles: Record<FlagCode, string> = {
  IT: "Italy",
  GB: "United Kingdom",
  FR: "France",
  DE: "Germany",
  ES: "Spain",
  US: "United States",
  CH: "Switzerland",
  NL: "Netherlands",
  BE: "Belgium",
  AT: "Austria",
};

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
      <svg viewBox="0 0 24 16" role="img" aria-label={flagTitles[code]} className="h-full w-full">
        {code === "IT" && (
          <>
            <rect width="8" height="16" fill="#009246" />
            <rect x="8" width="8" height="16" fill="#fff" />
            <rect x="16" width="8" height="16" fill="#ce2b37" />
          </>
        )}
        {code === "FR" && (
          <>
            <rect width="8" height="16" fill="#0055a4" />
            <rect x="8" width="8" height="16" fill="#fff" />
            <rect x="16" width="8" height="16" fill="#ef4135" />
          </>
        )}
        {code === "DE" && (
          <>
            <rect width="24" height="5.333" fill="#000" />
            <rect y="5.333" width="24" height="5.334" fill="#dd0000" />
            <rect y="10.667" width="24" height="5.333" fill="#ffce00" />
          </>
        )}
        {code === "ES" && (
          <>
            <rect width="24" height="16" fill="#aa151b" />
            <rect y="4" width="24" height="8" fill="#f1bf00" />
          </>
        )}
        {code === "NL" && (
          <>
            <rect width="24" height="5.333" fill="#ae1c28" />
            <rect y="5.333" width="24" height="5.334" fill="#fff" />
            <rect y="10.667" width="24" height="5.333" fill="#21468b" />
          </>
        )}
        {code === "BE" && (
          <>
            <rect width="8" height="16" fill="#000" />
            <rect x="8" width="8" height="16" fill="#ffd90c" />
            <rect x="16" width="8" height="16" fill="#ef3340" />
          </>
        )}
        {code === "AT" && (
          <>
            <rect width="24" height="16" fill="#ed2939" />
            <rect y="5.333" width="24" height="5.334" fill="#fff" />
          </>
        )}
        {code === "CH" && (
          <>
            <rect width="24" height="16" fill="#d52b1e" />
            <rect x="10" y="3" width="4" height="10" fill="#fff" />
            <rect x="6.5" y="6" width="11" height="4" fill="#fff" />
          </>
        )}
        {code === "GB" && (
          <>
            <rect width="24" height="16" fill="#012169" />
            <path d="M0 0 24 16M24 0 0 16" stroke="#fff" strokeWidth="3.2" />
            <path d="M0 0 24 16M24 0 0 16" stroke="#c8102e" strokeWidth="1.6" />
            <path d="M12 0v16M0 8h24" stroke="#fff" strokeWidth="5" />
            <path d="M12 0v16M0 8h24" stroke="#c8102e" strokeWidth="3" />
          </>
        )}
        {code === "US" && (
          <>
            <rect width="24" height="16" fill="#b22234" />
            {Array.from({ length: 6 }).map((_, index) => (
              <rect key={index} y={1.23 + index * 2.46} width="24" height="1.23" fill="#fff" />
            ))}
            <rect width="10.6" height="8.6" fill="#3c3b6e" />
          </>
        )}
      </svg>
    </span>
  );
}

export type { FlagCode };
