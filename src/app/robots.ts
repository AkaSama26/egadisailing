import type { MetadataRoute } from "next";
import { env } from "@/lib/env";

/**
 * robots.txt dinamico. Blocca rotte privte/tech:
 *   - /admin: dashboard operativa
 *   - /api: endpoint server (webhook, cron, internal)
 *   - /b: booking area cliente (solo via session recovery)
 *   - /prenota/success: pagina post-payment (no SEO value, contiene codici)
 *
 * Round 11 SEO-A1.
 */
export default function robots(): MetadataRoute.Robots {
  const baseUrl = env.APP_URL;
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api", "/b", "/*/prenota/success", "/*/recupera-prenotazione"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
