# Plan 3: Sito Pubblico

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Costruire il sito pubblico con landing page dinamica scroll-driven (frame video su scroll + animazioni), pagine servizi, dettaglio barche, dettaglio isole, navbar, footer, SEO, e font/tipografia del branding kit.

**Architecture:** Pagine pubbliche sotto `src/app/[locale]/`. Landing page con sezioni animate via Framer Motion e video frame playback su scroll via canvas. Lenis per smooth scrolling. Dati dinamici dal database (servizi, prezzi, barche). Contenuti statici da i18n messages.

**Tech Stack:** Next.js 16 App Router, Framer Motion, Lenis (smooth scroll), Canvas API (video frames), next-intl, Prisma, Tailwind CSS v4, Playfair Display + Inter (Google Fonts)

**Spec di riferimento:** `docs/superpowers/specs/2026-04-10-egadisailing-platform-design.md`

**Contesto tecnico:**
- Prisma singleton: `import { db } from "@/lib/db"`
- i18n: `import { useTranslations } from "next-intl"` (client) o `import { getTranslations } from "next-intl/server"` (server)
- Locale layout: `src/app/[locale]/layout.tsx` wraps with NextIntlClientProvider
- Root layout: `src/app/layout.tsx` has html/body tags
- shadcn components: `@/components/ui/*`
- Message files: `src/i18n/messages/it.json`, `en.json`

---

## File Structure

```
src/
├── app/
│   ├── layout.tsx                        (MODIFY: fonts Playfair Display + Inter)
│   └── [locale]/
│       ├── layout.tsx                    (MODIFY: add Navbar + Footer)
│       ├── page.tsx                      (REWRITE: landing page scroll-driven)
│       ├── experiences/
│       │   ├── page.tsx                  (lista esperienze)
│       │   └── [slug]/
│       │       └── page.tsx              (dettaglio esperienza)
│       ├── boats/
│       │   └── page.tsx                  (le barche)
│       ├── islands/
│       │   ├── page.tsx                  (le isole)
│       │   └── [slug]/
│       │       └── page.tsx              (dettaglio isola)
│       ├── about/
│       │   └── page.tsx                  (chi siamo)
│       ├── contacts/
│       │   └── page.tsx                  (contatti + form + WhatsApp)
│       └── faq/
│           └── page.tsx                  (FAQ)
├── components/
│   ├── navbar.tsx                        (navigazione pubblica)
│   ├── footer.tsx                        (footer)
│   ├── scroll-video.tsx                  (canvas video frames su scroll)
│   ├── scroll-section.tsx                (sezione con animazione on scroll)
│   ├── service-card.tsx                  (card servizio)
│   ├── island-card.tsx                   (card isola)
│   ├── testimonial-carousel.tsx          (carousel recensioni)
│   ├── pricing-display.tsx              (tabella prezzi pubblica)
│   ├── availability-calendar.tsx         (calendario disponibilità)
│   └── language-switcher.tsx             (selettore lingua)
├── lib/
│   └── scroll-utils.ts                  (utilities scroll position)
└── i18n/messages/
    ├── it.json                           (EXPAND: aggiungere sezioni)
    └── en.json                           (EXPAND: aggiungere sezioni)
```

---

### Task 1: Dipendenze + Font Branding

**Files:**
- Modify: `src/app/layout.tsx`, `package.json`

- [ ] **Step 1: Installa dipendenze**

```bash
npm install framer-motion lenis
```

- [ ] **Step 2: Aggiorna font in `src/app/layout.tsx`**

Sostituire Geist con Playfair Display (titoli) e Inter (body) dal branding kit:

```typescript
import type { Metadata } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import "./globals.css";

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Egadisailing — Scopri le Isole Egadi dal Mare",
  description: "Esperienze in barca uniche tra Favignana, Levanzo e Marettimo. Lusso accessibile, avventura e sapori del Mediterraneo.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${playfair.variable} ${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
```

- [ ] **Step 3: Aggiungi CSS custom properties per i font**

In `src/app/globals.css`, aggiungi le utility classes per i font:

```css
/* Add to existing globals.css */
.font-heading {
  font-family: var(--font-playfair), serif;
}

.font-sans {
  font-family: var(--font-inter), sans-serif;
}
```

Also add the branding palette as CSS custom properties:

```css
:root {
  --color-ocean: #1a365d;      /* Blu profondo */
  --color-turquoise: #0ea5e9;  /* Turchese */
  --color-sand: #fefce8;       /* Bianco sabbia */
  --color-gold: #d97706;       /* Oro/ambra */
  --color-coral: #fb7185;      /* Corallo morbido */
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/layout.tsx src/app/globals.css package.json package-lock.json
git commit -m "feat: add branding fonts (Playfair Display + Inter) and color palette"
```

---

### Task 2: Navbar + Footer + Language Switcher

**Files:**
- Create: `src/components/navbar.tsx`, `src/components/footer.tsx`, `src/components/language-switcher.tsx`
- Modify: `src/app/[locale]/layout.tsx`

- [ ] **Step 1: Crea `src/components/language-switcher.tsx`**

"use client" component. Dropdown (shadcn Select or custom) showing current locale flag/code, switching locale via router.

```typescript
"use client";

import { useRouter, usePathname } from "next/navigation";
import { useLocale } from "next-intl";

const localeNames: Record<string, string> = {
  it: "IT", en: "EN", de: "DE", fr: "FR", es: "ES",
  nl: "NL", pl: "PL", sv: "SV", pt: "PT", ru: "RU",
  zh: "中文", ja: "日本語", hu: "HU", hr: "HR", tr: "TR",
  ar: "عربي", el: "EL", mt: "MT", cs: "CS", da: "DA",
  no: "NO", fi: "FI", ro: "RO", bg: "BG", sr: "SR",
};
```

On locale change: replace the locale segment in the current pathname and navigate.

- [ ] **Step 2: Crea `src/components/navbar.tsx`**

"use client" component. Transparent on top, becomes solid on scroll. Sticky.

Structure:
- Logo (Ship icon + "Egadisailing") linked to home
- Nav links: Esperienze, Le Barche, Le Isole, Chi Siamo, Contatti (use translations from nav.*)
- Language switcher
- "Prenota Ora" CTA button
- Mobile: hamburger menu (Sheet) with same links
- Scroll behavior: transparent when scrollTop=0, add bg-white/90 backdrop-blur when scrolled

Uses `useTranslations("nav")` for link labels.

Links:
- Esperienze → /[locale]/experiences
- Le Barche → /[locale]/boats
- Le Isole → /[locale]/islands
- Chi Siamo → /[locale]/about
- Contatti → /[locale]/contacts

- [ ] **Step 3: Crea `src/components/footer.tsx`**

Server component (or client if needed). Three columns:
1. Logo + brief description + social links (Instagram, Facebook, TripAdvisor)
2. Link rapidi: same as nav
3. Contatti: address (Porto di Trapani), email, phone, WhatsApp

Bottom bar: © 2026 Egadisailing. Tutti i diritti riservati. | Privacy Policy | Termini

Use translations from footer.*.

- [ ] **Step 4: Aggiorna `src/app/[locale]/layout.tsx`**

Add Navbar and Footer wrapping children:

```typescript
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

export default async function LocaleLayout({ children, params }) {
  // ... existing code ...
  return (
    <NextIntlClientProvider messages={messages}>
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </NextIntlClientProvider>
  );
}
```

- [ ] **Step 5: Espandi i18n messages**

Add to it.json and en.json the new keys needed for navbar, footer, and upcoming pages. Add sections for:
- `about` (title, description, values)
- `contacts` (title, address, form labels)
- `faq` (title, questions/answers array or keyed)
- `islands` (favignana, levanzo, marettimo descriptions)
- `experience` (detail page labels: includes, bring, itinerary, reviews)

- [ ] **Step 6: Commit**

```bash
git add src/components/ src/app/\[locale\]/layout.tsx src/i18n/messages/
git commit -m "feat: add navbar, footer, language switcher with i18n"
```

---

### Task 3: Scroll Video Component (Frame Playback su Scroll)

**Files:**
- Create: `src/components/scroll-video.tsx`, `src/lib/scroll-utils.ts`

- [ ] **Step 1: Crea `src/lib/scroll-utils.ts`**

Utility per calcolare il progresso di scroll all'interno di un elemento:

```typescript
export function getScrollProgress(element: HTMLElement): number {
  const rect = element.getBoundingClientRect();
  const windowHeight = window.innerHeight;
  const elementTop = rect.top;
  const elementHeight = rect.height;

  // 0 when element top enters viewport, 1 when element bottom leaves
  const progress = (windowHeight - elementTop) / (windowHeight + elementHeight);
  return Math.max(0, Math.min(1, progress));
}
```

- [ ] **Step 2: Crea `src/components/scroll-video.tsx`**

"use client" component. Approach: load a video file, use canvas to draw frames based on scroll position.

Two modes supported:
1. **Video seek mode** (default): Uses a `<video>` element (hidden) and seeks to the correct time based on scroll progress. Draws current frame to canvas. This is simpler and works well for most cases.
2. **Frame sequence mode** (future): Pre-extracted frame images loaded and drawn to canvas. For when individual frame images are provided.

For now, implement video seek mode:

```typescript
"use client";

import { useEffect, useRef, useState } from "react";

interface ScrollVideoProps {
  src: string;           // video file path (e.g., /videos/hero.mp4)
  className?: string;
  children?: React.ReactNode;  // overlay content that appears on top
}

export function ScrollVideo({ src, className, children }: ScrollVideoProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!video || !canvas || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    function resizeCanvas() {
      if (!canvas || !container) return;
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
    }

    function drawFrame() {
      if (!video || !canvas || !ctx) return;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    }

    function onScroll() {
      if (!video || !container) return;
      const rect = container.getBoundingClientRect();
      const scrollProgress = Math.max(0, Math.min(1,
        -rect.top / (rect.height - window.innerHeight)
      ));
      const time = scrollProgress * video.duration;
      if (isFinite(time)) {
        video.currentTime = time;
      }
    }

    video.addEventListener("seeked", drawFrame);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", resizeCanvas);

    video.load();
    video.addEventListener("loadeddata", () => {
      resizeCanvas();
      drawFrame();
    });

    return () => {
      video.removeEventListener("seeked", drawFrame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", resizeCanvas);
    };
  }, [src]);

  return (
    <div ref={containerRef} className={className} style={{ position: "relative" }}>
      <video
        ref={videoRef}
        src={src}
        muted
        playsInline
        preload="auto"
        style={{ display: "none" }}
      />
      <canvas
        ref={canvasRef}
        className="sticky top-0 w-full h-screen object-cover"
      />
      {children && (
        <div className="absolute inset-0 pointer-events-none">
          {children}
        </div>
      )}
    </div>
  );
}
```

The container should be tall (e.g., `h-[500vh]`) so the user scrolls through it while the canvas stays sticky at the top, playing through the video frames.

- [ ] **Step 3: Crea un video placeholder**

Since the real video isn't ready yet, create a placeholder setup:

```bash
mkdir -p public/videos
```

Create a note file `public/videos/README.md` explaining:
- Place `hero.mp4` here (recommended: 1080p, 10-30 seconds, compressed)
- The video will play on scroll, so smooth drone footage works best
- Optimal: Egadi islands aerial, boat sailing, underwater, sunset

- [ ] **Step 4: Commit**

```bash
git add src/components/scroll-video.tsx src/lib/scroll-utils.ts public/videos/
git commit -m "feat: add scroll-driven video component with canvas frame rendering"
```

---

### Task 4: Scroll Section Component (Animazioni su Scroll)

**Files:**
- Create: `src/components/scroll-section.tsx`

- [ ] **Step 1: Crea `src/components/scroll-section.tsx`**

"use client" component using Framer Motion. Wraps any content and animates it into view on scroll.

Animation presets:
- `fade-up`: fade in + slide up
- `fade-left`: fade in + slide from left
- `fade-right`: fade in + slide from right
- `zoom`: fade in + scale up
- `none`: no animation (just renders)

```typescript
"use client";

import { motion } from "framer-motion";
import { type ReactNode } from "react";

type AnimationType = "fade-up" | "fade-left" | "fade-right" | "zoom" | "none";

interface ScrollSectionProps {
  children: ReactNode;
  animation?: AnimationType;
  delay?: number;
  className?: string;
}

const animations: Record<AnimationType, { initial: any; whileInView: any }> = {
  "fade-up": {
    initial: { opacity: 0, y: 60 },
    whileInView: { opacity: 1, y: 0 },
  },
  "fade-left": {
    initial: { opacity: 0, x: -60 },
    whileInView: { opacity: 1, x: 0 },
  },
  "fade-right": {
    initial: { opacity: 0, x: 60 },
    whileInView: { opacity: 1, x: 0 },
  },
  "zoom": {
    initial: { opacity: 0, scale: 0.9 },
    whileInView: { opacity: 1, scale: 1 },
  },
  "none": {
    initial: {},
    whileInView: {},
  },
};

export function ScrollSection({
  children,
  animation = "fade-up",
  delay = 0,
  className,
}: ScrollSectionProps) {
  const config = animations[animation];

  return (
    <motion.div
      initial={config.initial}
      whileInView={config.whileInView}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.8, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/scroll-section.tsx
git commit -m "feat: add scroll-driven animation section component with Framer Motion"
```

---

### Task 5: Landing Page (Homepage Scroll-Driven)

**Files:**
- Rewrite: `src/app/[locale]/page.tsx`
- Create: `src/components/service-card.tsx`

- [ ] **Step 1: Crea `src/components/service-card.tsx`**

Card per singolo servizio sulla landing page. Props: title, description, price, image (placeholder), href.

```typescript
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";

interface ServiceCardProps {
  title: string;
  description: string;
  priceFrom?: string;
  href: string;
  icon?: React.ReactNode;
}

export function ServiceCard({ title, description, priceFrom, href, icon }: ServiceCardProps) {
  return (
    <Link href={href}>
      <Card className="group h-full transition-all hover:shadow-lg hover:-translate-y-1">
        <CardContent className="p-6 space-y-4">
          {icon && <div className="text-[var(--color-turquoise)]">{icon}</div>}
          <h3 className="font-heading text-xl font-bold">{title}</h3>
          <p className="text-muted-foreground">{description}</p>
          {priceFrom && (
            <p className="text-sm font-semibold text-[var(--color-gold)]">{priceFrom}</p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
```

- [ ] **Step 2: Riscrivi `src/app/[locale]/page.tsx`**

The landing page should be a long scroll experience with these sections:

**Section 1 — Hero (scroll video)**
- ScrollVideo component as background (when video available, for now show a gradient/placeholder)
- Overlaid text: main title + subtitle + CTA button
- Text appears with fade-up animation
- The hero area is ~300vh tall so the video plays through on scroll

**Section 2 — "Le Nostre Esperienze"**
- Grid of ServiceCards (5 services from i18n)
- Each card fades in on scroll (staggered)
- Cards link to /[locale]/experiences/[slug]

**Section 3 — "Le Isole Egadi"**
- Three island cards (Favignana, Levanzo, Marettimo) with descriptions
- Parallax-style images (placeholder colored backgrounds)
- Fade animations

**Section 4 — "Perché Egadisailing"**
- Value propositions (3-4 USPs): Chef a bordo, Lusso accessibile, Crew esperta, Isole incontaminate
- Icons + short descriptions
- Fade-left/fade-right alternating

**Section 5 — "Cosa Dicono i Nostri Ospiti"**
- Testimonial section (placeholder quotes for now)
- Carousel or stacked cards

**Section 6 — CTA Finale**
- "Prenota la Tua Esperienza" 
- Big button linking to experiences page
- Background color accent

The page should be a server component that fetches services with minimum prices from the database, then renders client sections:

```typescript
import { db } from "@/lib/db";
import { getTranslations } from "next-intl/server";
import { LandingContent } from "./landing-content";

export default async function HomePage() {
  const t = await getTranslations();
  
  const services = await db.service.findMany({
    where: { active: true },
    include: {
      pricingPeriods: {
        orderBy: { pricePerPerson: "asc" },
        take: 1,
      },
    },
  });

  return <LandingContent services={services} />;
}
```

Create a separate `src/app/[locale]/landing-content.tsx` as "use client" component that orchestrates all the scroll sections, since Framer Motion and scroll logic need client-side rendering. Pass services as serialized data.

- [ ] **Step 3: Setup Lenis smooth scrolling**

In the locale layout or landing page, initialize Lenis for smooth scrolling:

```typescript
"use client";

import { useEffect } from "react";
import Lenis from "lenis";

export function SmoothScrollProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const lenis = new Lenis({ autoRaf: true });
    return () => lenis.destroy();
  }, []);

  return <>{children}</>;
}
```

Wrap the landing page content with this provider.

- [ ] **Step 4: Verify landing page**

```bash
npm run dev
```

Go to localhost:3000/it — should see full landing page with:
- Hero section (placeholder background until video is provided)
- Animated sections appearing on scroll
- Service cards with prices from database
- Smooth scrolling

- [ ] **Step 5: Commit**

```bash
git add src/app/\[locale\]/ src/components/
git commit -m "feat: add scroll-driven landing page with animated sections and service cards"
```

---

### Task 6: Pagine Esperienze (Lista + Dettaglio)

**Files:**
- Create: `src/app/[locale]/experiences/page.tsx`, `src/app/[locale]/experiences/[slug]/page.tsx`

- [ ] **Step 1: Crea `src/app/[locale]/experiences/page.tsx`**

Server component. Lists all active services with pricing, description, CTA.

Each service shows:
- Name, description (from Json field, pick current locale)
- Price "a partire da €X" (min price from pricing periods)
- Duration info
- "Scopri di più" link to detail

Fetch from database:
```typescript
const services = await db.service.findMany({
  where: { active: true },
  include: {
    boat: { select: { name: true } },
    pricingPeriods: { orderBy: { pricePerPerson: "asc" }, take: 1 },
  },
});
```

Service slug mapping (since we don't have a slug field, map by type):
- SOCIAL_BOATING → "social-boating"
- EXCLUSIVE_EXPERIENCE → "exclusive-experience"
- CABIN_CHARTER → "cabin-charter"
- BOAT_SHARED (FULL_DAY) → "boat-shared"
- BOAT_SHARED (HALF_DAY) → "boat-shared-morning"
- BOAT_EXCLUSIVE (FULL_DAY) → "boat-exclusive"
- BOAT_EXCLUSIVE (HALF_DAY) → "boat-exclusive-morning"

- [ ] **Step 2: Crea `src/app/[locale]/experiences/[slug]/page.tsx`**

Server component. Experience detail page with:

1. **Hero** — service name, boat name, placeholder image area
2. **Itinerario** — timeline (hardcoded example: Partenza → Favignana → Pranzo → Levanzo → Rientro)
3. **Cosa Include** — checklist from service description
4. **Cosa Portare** — generic list (crema solare, costume, asciugamano, ecc.)
5. **Prezzi e Stagionalità** — table of all pricing periods for this service
6. **CTA Prenota** — button (for now links to contacts, Stripe integration comes in Plan 4)

Use `getTranslations` for labels. Fetch service by slug mapping. Use `notFound()` if not found.

Wrap sections with ScrollSection for animations.

- [ ] **Step 3: Commit**

```bash
git add src/app/\[locale\]/experiences/
git commit -m "feat: add experiences list and detail pages with pricing"
```

---

### Task 7: Pagine Barche

**Files:**
- Create: `src/app/[locale]/boats/page.tsx`

- [ ] **Step 1: Crea `src/app/[locale]/boats/page.tsx`**

Server component. Shows each boat with:
- Name, type, description (localized from Json)
- Specs: lunghezza, anno, cabine (if set)
- Amenities list (localized from Json)
- Services available on this boat (linked)
- Placeholder image area

Fetch:
```typescript
const boats = await db.boat.findMany({
  where: { active: true },
  include: {
    services: { where: { active: true }, select: { id: true, name: true, type: true } },
  },
});
```

Use ScrollSection for animations.

- [ ] **Step 2: Commit**

```bash
git add src/app/\[locale\]/boats/
git commit -m "feat: add boats page with specs and linked services"
```

---

### Task 8: Pagine Isole

**Files:**
- Create: `src/app/[locale]/islands/page.tsx`, `src/app/[locale]/islands/[slug]/page.tsx`
- Expand: i18n messages with island content

- [ ] **Step 1: Aggiungi contenuti isole ai messages**

Add to it.json and en.json:

```json
"islands": {
  "title": "Le Isole Egadi",
  "subtitle": "Tre gioielli nel cuore del Mediterraneo",
  "favignana": {
    "name": "Favignana",
    "description": "La più grande delle Egadi, famosa per Cala Rossa, le sue tonnare storiche e le acque turchesi che la circondano.",
    "highlights": ["Cala Rossa", "Cala Azzurra", "Lido Burrone", "Ex Stabilimento Florio"]
  },
  "levanzo": {
    "name": "Levanzo",
    "description": "La più piccola e selvaggia. Grotta del Genovese con pitture rupestri preistoriche, calette nascoste e fondali cristallini.",
    "highlights": ["Grotta del Genovese", "Cala Fredda", "Cala Minnola", "Faraglione"]
  },
  "marettimo": {
    "name": "Marettimo",
    "description": "La più lontana e incontaminata. Paradiso per trekking e snorkeling, grotte marine spettacolari e natura selvaggia.",
    "highlights": ["Grotta del Cammello", "Punta Troia", "Cala Bianca", "Scalo Maestro"]
  }
}
```

- [ ] **Step 2: Crea `src/app/[locale]/islands/page.tsx`**

Server component. Three island cards with descriptions, highlights, placeholder images. Links to detail pages.

- [ ] **Step 3: Crea `src/app/[locale]/islands/[slug]/page.tsx`**

Server component. Slug: "favignana", "levanzo", "marettimo". Detail page with:
- Island name and description (from i18n)
- Highlights list
- "Esperienze che toccano quest'isola" (for now, all services since they all visit the Egadi)
- Placeholder image gallery area
- SEO: title and description for each island

- [ ] **Step 4: Commit**

```bash
git add src/app/\[locale\]/islands/ src/i18n/messages/
git commit -m "feat: add islands pages (Favignana, Levanzo, Marettimo) with i18n"
```

---

### Task 9: Chi Siamo + Contatti + FAQ

**Files:**
- Create: `src/app/[locale]/about/page.tsx`, `src/app/[locale]/contacts/page.tsx`, `src/app/[locale]/faq/page.tsx`

- [ ] **Step 1: Crea about page**

Storytelling page: la storia di Egadisailing, i valori (lusso accessibile, rispetto del mare, convivialità), la crew (foto + bio placeholder).

Use ScrollSection animations (fade-up, alternating left/right).

- [ ] **Step 2: Crea contacts page**

Form contatto (nome, email, messaggio — no backend action for now, placeholder). WhatsApp button link. Mappa embed placeholder (Google Maps iframe for Porto di Trapani). Address, phone, email.

- [ ] **Step 3: Crea FAQ page**

Accordion-style FAQ using shadcn or custom component. Common questions:
- Cosa devo portare?
- Posso cancellare la prenotazione?
- Cosa succede in caso di maltempo?
- I bambini possono partecipare?
- etc.

Content from i18n messages.

- [ ] **Step 4: Commit**

```bash
git add src/app/\[locale\]/about/ src/app/\[locale\]/contacts/ src/app/\[locale\]/faq/ src/i18n/messages/
git commit -m "feat: add about, contacts, and FAQ pages"
```

---

### Task 10: SEO + Metadata + Sitemap

**Files:**
- Create: `src/app/sitemap.ts`
- Modify: page files (add generateMetadata)

- [ ] **Step 1: Aggiungi generateMetadata a tutte le pagine**

Each page should export a `generateMetadata` function with:
- Title: "Page Title — Egadisailing"
- Description: relevant SEO description
- OpenGraph: title, description, locale
- alternates.languages: hreflang links for all 25 locales

Example pattern:
```typescript
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale });
  
  return {
    title: `${t("hero.title")} — Egadisailing`,
    description: t("hero.subtitle"),
    openGraph: {
      title: t("hero.title"),
      description: t("hero.subtitle"),
      locale,
    },
  };
}
```

- [ ] **Step 2: Crea `src/app/sitemap.ts`**

Dynamic sitemap including all locale variants of all pages:

```typescript
import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://egadisailing.com";
  const pages = [
    "", "/experiences", "/boats", "/islands", "/about", "/contacts", "/faq",
    "/experiences/social-boating", "/experiences/exclusive-experience",
    "/experiences/cabin-charter", "/experiences/boat-shared",
    "/experiences/boat-exclusive",
    "/islands/favignana", "/islands/levanzo", "/islands/marettimo",
  ];

  const entries: MetadataRoute.Sitemap = [];

  for (const page of pages) {
    for (const locale of routing.locales) {
      entries.push({
        url: `${baseUrl}/${locale}${page}`,
        lastModified: new Date(),
        changeFrequency: "weekly",
        priority: page === "" ? 1 : 0.8,
      });
    }
  }

  return entries;
}
```

- [ ] **Step 3: Aggiungi structured data (JSON-LD) alla homepage**

Add schema.org TourProduct structured data to the homepage for SEO:

```typescript
<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{
    __html: JSON.stringify({
      "@context": "https://schema.org",
      "@type": "TouristAttraction",
      name: "Egadisailing",
      description: "Boat experiences in the Egadi Islands, Sicily",
      address: {
        "@type": "PostalAddress",
        addressLocality: "Trapani",
        addressRegion: "Sicilia",
        addressCountry: "IT",
      },
    }),
  }}
/>
```

- [ ] **Step 4: Commit**

```bash
git add src/app/
git commit -m "feat: add SEO metadata, sitemap, and structured data"
```

---

## Summary

Al completamento di questo piano, il sito pubblico avrà:

- Landing page scroll-driven con video frame playback su scroll (pronta per il video)
- Animazioni su scroll (Framer Motion) con fade-up, fade-left, fade-right, zoom
- Smooth scrolling (Lenis)
- Font branding: Playfair Display (titoli) + Inter (body)
- Palette colori branding nelle CSS custom properties
- Navbar responsive (trasparente → solida su scroll) con language switcher (25 lingue)
- Footer con contatti e link rapidi
- Pagine esperienze (lista + dettaglio con prezzi, itinerario, cosa include)
- Pagina barche con specifiche e servizi collegati
- Pagine isole (Favignana, Levanzo, Marettimo) con punti di interesse
- Chi Siamo, Contatti (form + WhatsApp + mappa), FAQ
- SEO completo: metadata, hreflang, sitemap dinamica, structured data JSON-LD
