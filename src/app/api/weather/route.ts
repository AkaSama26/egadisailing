import { NextResponse } from "next/server";
import { z } from "zod";
import { parseIsoDay } from "@/lib/dates";
import { getWeatherForDate } from "@/lib/weather/service";
import { buildPublicWeatherSummary } from "@/lib/weather/public-format";
import { withErrorHandler } from "@/lib/http/with-error-handler";
import { getClientIp, normalizeIpForRateLimit } from "@/lib/http/client-ip";
import { enforceRateLimit } from "@/lib/rate-limit/service";
import { RATE_LIMIT_SCOPES } from "@/lib/channels";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  locale: z.enum(["it", "en"]).optional(),
});

export const GET = withErrorHandler(async (req: Request) => {
  const ip = normalizeIpForRateLimit(getClientIp(req.headers));
  await enforceRateLimit({
    identifier: ip,
    scope: RATE_LIMIT_SCOPES.PUBLIC_WEATHER_IP,
    limit: 90,
    windowSeconds: 60,
    failOpen: true,
  });

  const input = querySchema.parse(Object.fromEntries(new URL(req.url).searchParams));
  const weather = await getWeatherForDate(parseIsoDay(input.date));

  return NextResponse.json(
    {
      data: {
        weather: weather
          ? buildPublicWeatherSummary(weather, input.locale ?? "it")
          : null,
      },
    },
    { headers: { "cache-control": "private, max-age=300" } },
  );
});
