import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";

/**
 * Mock Service Worker per intercettare chiamate HTTP outbound nei test
 * integration:
 * - Stripe API (api.stripe.com)
 * - Brevo (api.brevo.com)
 * - Bokun (api.bokun.io)
 * - Boataround (api.boataround.com)
 * - Open-Meteo (api.open-meteo.com, marine-api.open-meteo.com)
 * - Telegram (api.telegram.org)
 *
 * Default handlers ritornano 200 con payload minimale. Singoli test possono
 * override con `server.use(http.post(url, handler))` per scenari specifici.
 *
 * Usage:
 * ```ts
 * import { server } from "../helpers/msw-server";
 * beforeAll(() => server.listen({ onUnhandledRequest: "warn" }));
 * afterEach(() => server.resetHandlers());
 * afterAll(() => server.close());
 * ```
 */

export const defaultHandlers = [
  // Stripe — handlers minimali per test, override nei singoli test per scenari
  http.post("https://api.stripe.com/v1/payment_intents", () =>
    HttpResponse.json({
      id: "pi_test_default",
      client_secret: "pi_test_default_secret_x",
      status: "requires_payment_method",
    }),
  ),
  http.post("https://api.stripe.com/v1/refunds", () =>
    HttpResponse.json({ id: "re_test_default", object: "refund", status: "succeeded" }),
  ),
  http.post("https://api.stripe.com/v1/payment_intents/:id/cancel", ({ params }) =>
    HttpResponse.json({ id: params.id, status: "canceled" }),
  ),

  // Brevo — email send
  http.post("https://api.brevo.com/v3/smtp/email", () =>
    HttpResponse.json({ messageId: "msg-test-default" }, { status: 201 }),
  ),

  // Telegram — bot message
  http.post(/https:\/\/api\.telegram\.org\/bot.*\/sendMessage/, () =>
    HttpResponse.json({ ok: true, result: { message_id: 1 } }),
  ),

  // Turnstile — siteverify
  http.post("https://challenges.cloudflare.com/turnstile/v0/siteverify", () =>
    HttpResponse.json({ success: true }),
  ),

  // Open-Meteo — forecast
  http.get("https://api.open-meteo.com/v1/forecast", () =>
    HttpResponse.json({
      daily: {
        time: ["2026-07-15"],
        temperature_2m_max: [28],
        temperature_2m_min: [22],
        wind_speed_10m_max: [12],
        wind_gusts_10m_max: [18],
        wind_direction_10m_dominant: [180],
        precipitation_probability_max: [10],
        precipitation_sum: [0],
        weather_code: [0],
      },
    }),
  ),
  http.get("https://marine-api.open-meteo.com/v1/marine", () =>
    HttpResponse.json({ daily: { wave_height_max: [0.4] } }),
  ),
];

export const server = setupServer(...defaultHandlers);
