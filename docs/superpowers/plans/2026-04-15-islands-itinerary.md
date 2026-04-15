# Islands Itinerary Section — Implementation Plan

> **For Claude:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the static islands cards section with a scroll-driven interactive itinerary featuring tabs per experience, animated SVG route map, and crossfading destination text.

**Architecture:** Sticky scroll pattern — a tall container (`300vh`) with pinned content (`100vh`) that reacts to scroll progress. Left column shows destination text via `AnimatePresence`, right column draws an SVG route through markers. Tabs switch between experience itineraries.

**Tech Stack:** Next.js 16, React 19, framer-motion 12, shadcn Tabs (`@base-ui/react`), next-intl, Tailwind CSS v4, inline SVG.

**Spec:** `docs/superpowers/specs/2026-04-15-islands-itinerary-section-design.md`

---

## Chunk 1: Data Layer & Utilities

### Task 1: Create itinerary data file

**Files:**
- Create: `src/data/itineraries.ts`

- [ ] **Step 1: Create the data file with types and itinerary data**

```ts
export interface ItineraryStop {
  time: string;
  nameKey: string;
  islandKey?: string;
  descriptionKey: string;
  mapPosition: { x: number; y: number };
}

export interface Itinerary {
  experienceType: string;
  tabLabelKey: string;
  stops: ItineraryStop[];
}

export const itineraries: Itinerary[] = [
  {
    experienceType: "SOCIAL_BOATING",
    tabLabelKey: "itinerary.tabs.socialBoating",
    stops: [
      {
        time: "09:00",
        nameKey: "itinerary.socialBoating.stop1.name",
        descriptionKey: "itinerary.socialBoating.stop1.description",
        mapPosition: { x: 15, y: 82 },
      },
      {
        time: "10:30",
        nameKey: "itinerary.socialBoating.stop2.name",
        islandKey: "itinerary.socialBoating.stop2.island",
        descriptionKey: "itinerary.socialBoating.stop2.description",
        mapPosition: { x: 38, y: 52 },
      },
      {
        time: "13:00",
        nameKey: "itinerary.socialBoating.stop3.name",
        descriptionKey: "itinerary.socialBoating.stop3.description",
        mapPosition: { x: 52, y: 38 },
      },
      {
        time: "15:00",
        nameKey: "itinerary.socialBoating.stop4.name",
        islandKey: "itinerary.socialBoating.stop4.island",
        descriptionKey: "itinerary.socialBoating.stop4.description",
        mapPosition: { x: 45, y: 22 },
      },
      {
        time: "17:00",
        nameKey: "itinerary.socialBoating.stop5.name",
        descriptionKey: "itinerary.socialBoating.stop5.description",
        mapPosition: { x: 15, y: 82 },
      },
    ],
  },
  {
    experienceType: "EXCLUSIVE_EXPERIENCE",
    tabLabelKey: "itinerary.tabs.exclusive",
    stops: [
      {
        time: "10:00",
        nameKey: "itinerary.exclusive.stop1.name",
        descriptionKey: "itinerary.exclusive.stop1.description",
        mapPosition: { x: 15, y: 82 },
      },
      {
        time: "11:30",
        nameKey: "itinerary.exclusive.stop2.name",
        islandKey: "itinerary.exclusive.stop2.island",
        descriptionKey: "itinerary.exclusive.stop2.description",
        mapPosition: { x: 38, y: 52 },
      },
      {
        time: "13:30",
        nameKey: "itinerary.exclusive.stop3.name",
        descriptionKey: "itinerary.exclusive.stop3.description",
        mapPosition: { x: 52, y: 38 },
      },
      {
        time: "15:30",
        nameKey: "itinerary.exclusive.stop4.name",
        islandKey: "itinerary.exclusive.stop4.island",
        descriptionKey: "itinerary.exclusive.stop4.description",
        mapPosition: { x: 65, y: 20 },
      },
      {
        time: "18:00",
        nameKey: "itinerary.exclusive.stop5.name",
        descriptionKey: "itinerary.exclusive.stop5.description",
        mapPosition: { x: 15, y: 82 },
      },
    ],
  },
  {
    experienceType: "CABIN_CHARTER",
    tabLabelKey: "itinerary.tabs.cabinCharter",
    stops: [
      {
        time: "10:00",
        nameKey: "itinerary.cabinCharter.stop1.name",
        descriptionKey: "itinerary.cabinCharter.stop1.description",
        mapPosition: { x: 15, y: 82 },
      },
      {
        time: "12:00",
        nameKey: "itinerary.cabinCharter.stop2.name",
        islandKey: "itinerary.cabinCharter.stop2.island",
        descriptionKey: "itinerary.cabinCharter.stop2.description",
        mapPosition: { x: 38, y: 52 },
      },
      {
        time: "Day 2",
        nameKey: "itinerary.cabinCharter.stop3.name",
        islandKey: "itinerary.cabinCharter.stop3.island",
        descriptionKey: "itinerary.cabinCharter.stop3.description",
        mapPosition: { x: 55, y: 30 },
      },
      {
        time: "Day 3",
        nameKey: "itinerary.cabinCharter.stop4.name",
        islandKey: "itinerary.cabinCharter.stop4.island",
        descriptionKey: "itinerary.cabinCharter.stop4.description",
        mapPosition: { x: 78, y: 15 },
      },
      {
        time: "Day 7",
        nameKey: "itinerary.cabinCharter.stop5.name",
        descriptionKey: "itinerary.cabinCharter.stop5.description",
        mapPosition: { x: 15, y: 82 },
      },
    ],
  },
  {
    experienceType: "BOAT_SHARED",
    tabLabelKey: "itinerary.tabs.boatShared",
    stops: [
      {
        time: "09:00",
        nameKey: "itinerary.boatShared.stop1.name",
        descriptionKey: "itinerary.boatShared.stop1.description",
        mapPosition: { x: 15, y: 82 },
      },
      {
        time: "10:00",
        nameKey: "itinerary.boatShared.stop2.name",
        islandKey: "itinerary.boatShared.stop2.island",
        descriptionKey: "itinerary.boatShared.stop2.description",
        mapPosition: { x: 38, y: 52 },
      },
      {
        time: "12:00",
        nameKey: "itinerary.boatShared.stop3.name",
        islandKey: "itinerary.boatShared.stop3.island",
        descriptionKey: "itinerary.boatShared.stop3.description",
        mapPosition: { x: 55, y: 30 },
      },
      {
        time: "14:00",
        nameKey: "itinerary.boatShared.stop4.name",
        descriptionKey: "itinerary.boatShared.stop4.description",
        mapPosition: { x: 15, y: 82 },
      },
    ],
  },
  {
    experienceType: "BOAT_EXCLUSIVE",
    tabLabelKey: "itinerary.tabs.boatExclusive",
    stops: [
      {
        time: "10:00",
        nameKey: "itinerary.boatExclusive.stop1.name",
        descriptionKey: "itinerary.boatExclusive.stop1.description",
        mapPosition: { x: 15, y: 82 },
      },
      {
        time: "11:30",
        nameKey: "itinerary.boatExclusive.stop2.name",
        islandKey: "itinerary.boatExclusive.stop2.island",
        descriptionKey: "itinerary.boatExclusive.stop2.description",
        mapPosition: { x: 38, y: 52 },
      },
      {
        time: "13:30",
        nameKey: "itinerary.boatExclusive.stop3.name",
        descriptionKey: "itinerary.boatExclusive.stop3.description",
        mapPosition: { x: 52, y: 38 },
      },
      {
        time: "16:00",
        nameKey: "itinerary.boatExclusive.stop4.name",
        islandKey: "itinerary.boatExclusive.stop4.island",
        descriptionKey: "itinerary.boatExclusive.stop4.description",
        mapPosition: { x: 65, y: 20 },
      },
      {
        time: "18:00",
        nameKey: "itinerary.boatExclusive.stop5.name",
        descriptionKey: "itinerary.boatExclusive.stop5.description",
        mapPosition: { x: 15, y: 82 },
      },
    ],
  },
];
```

- [ ] **Step 2: Commit**

```bash
git add src/data/itineraries.ts
git commit -m "feat: add itinerary data for islands section"
```

### Task 2: Create Catmull-Rom to bezier utility

**Files:**
- Create: `src/components/islands-itinerary/utils.ts`

- [ ] **Step 1: Create the utility file**

The utility converts Catmull-Rom control points (which pass through every point) into cubic bezier segments for SVG path `C` commands.

```ts
interface Point {
  x: number;
  y: number;
}

/**
 * Convert an array of points into a smooth SVG path string
 * using Catmull-Rom to cubic bezier conversion.
 * The resulting curve passes through every input point.
 */
export function catmullRomToSvgPath(points: Point[], tension = 0.3): string {
  if (points.length < 2) return "";
  if (points.length === 2) {
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
  }

  let path = `M ${points[0].x} ${points[0].y}`;

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];

    const cp1x = p1.x + (p2.x - p0.x) * tension;
    const cp1y = p1.y + (p2.y - p0.y) * tension;
    const cp2x = p2.x - (p3.x - p1.x) * tension;
    const cp2y = p2.y - (p3.y - p1.y) * tension;

    path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }

  return path;
}

/**
 * Convert percentage-based map positions to SVG viewBox coordinates.
 */
export function mapPositionToSvg(
  pos: { x: number; y: number },
  viewBoxWidth: number,
  viewBoxHeight: number
): Point {
  return {
    x: (pos.x / 100) * viewBoxWidth,
    y: (pos.y / 100) * viewBoxHeight,
  };
}

/**
 * Get the total length of an SVG path element.
 * Must be called after the element is mounted in the DOM.
 */
export function getPathLength(pathRef: SVGPathElement | null): number {
  return pathRef?.getTotalLength() ?? 0;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/islands-itinerary/utils.ts
git commit -m "feat: add Catmull-Rom to SVG bezier utility"
```

### Task 3: Add i18n translation keys

**Files:**
- Modify: `src/i18n/messages/it.json`
- Modify: `src/i18n/messages/en.json`

- [ ] **Step 1: Add itinerary keys to Italian translations**

Add an `"itinerary"` top-level key to `it.json` with tab labels and all stop translations for each experience. Include `islands.sectionLabel`.

The structure:
```json
{
  "itinerary": {
    "tabs": {
      "socialBoating": "Social Boating",
      "exclusive": "Exclusive",
      "cabinCharter": "Cabin Charter",
      "boatShared": "Tour Barca",
      "boatExclusive": "Barca Esclusiva"
    },
    "socialBoating": {
      "stop1": { "name": "Partenza", "description": "Imbarco al porto di Trapani, welcome drink e briefing del capitano" },
      "stop2": { "name": "Cala Rossa", "island": "Favignana", "description": "Tuffo nelle acque turchesi più famose del Mediterraneo, snorkeling tra fondali di posidonia" },
      "stop3": { "name": "Pranzo a bordo", "description": "Lo chef prepara pesce freschissimo del giorno con vista mare aperto" },
      "stop4": { "name": "Bue Marino", "island": "Favignana", "description": "Grotta marina spettacolare, acque cristalline tra le falesie" },
      "stop5": { "name": "Rientro", "description": "Navigazione al tramonto verso Trapani" }
    },
    "exclusive": {
      "stop1": { "name": "Partenza", "description": "Imbarco riservato, accoglienza con champagne e briefing privato" },
      "stop2": { "name": "Cala Rossa", "island": "Favignana", "description": "La spiaggia più iconica delle Egadi, tutta per voi" },
      "stop3": { "name": "Pranzo gourmet", "description": "Menu raffinato dello chef con pesce del mercato di Trapani" },
      "stop4": { "name": "Cala Tramontana", "island": "Levanzo", "description": "Caletta nascosta con acque trasparenti e fondali incontaminati" },
      "stop5": { "name": "Rientro", "description": "Aperitivo al tramonto durante la navigazione di ritorno" }
    },
    "cabinCharter": {
      "stop1": { "name": "Partenza", "description": "Check-in a bordo, sistemazione in cabina e briefing settimanale" },
      "stop2": { "name": "Favignana", "island": "Favignana", "description": "Due giorni esplorando cale, grotte e il borgo dell'isola farfalla" },
      "stop3": { "name": "Levanzo", "island": "Levanzo", "description": "L'isola più selvaggia, Grotta del Genovese e fondali da sogno" },
      "stop4": { "name": "Marettimo", "island": "Marettimo", "description": "La perla delle Egadi, sentieri montani e grotte marine" },
      "stop5": { "name": "Rientro", "description": "Ultima colazione in mare e rientro a Trapani" }
    },
    "boatShared": {
      "stop1": { "name": "Partenza", "description": "Ritrovo al porto di Trapani e partenza verso le isole" },
      "stop2": { "name": "Favignana", "island": "Favignana", "description": "Giro dell'isola con soste nelle cale più belle" },
      "stop3": { "name": "Levanzo", "island": "Levanzo", "description": "Tuffo e snorkeling nelle acque cristalline" },
      "stop4": { "name": "Rientro", "description": "Rientro a Trapani nel primo pomeriggio" }
    },
    "boatExclusive": {
      "stop1": { "name": "Partenza", "description": "Partenza privata, scegliete voi l'orario" },
      "stop2": { "name": "Favignana", "island": "Favignana", "description": "Le cale più esclusive con sosta prolungata" },
      "stop3": { "name": "Pranzo a bordo", "description": "Pranzo con prodotti tipici siciliani" },
      "stop4": { "name": "Levanzo", "island": "Levanzo", "description": "Calette segrete e snorkeling in acque incontaminate" },
      "stop5": { "name": "Rientro", "description": "Navigazione rilassata al tramonto" }
    }
  }
}
```

Also add to the existing `"islands"` key:
```json
"sectionLabel": "Scopri il viaggio"
```

- [ ] **Step 2: Add same keys in English to `en.json`**

Add matching `"itinerary"` block with English translations. Tab labels stay the same (brand names). Stop translations:

```json
{
  "itinerary": {
    "tabs": {
      "socialBoating": "Social Boating",
      "exclusive": "Exclusive",
      "cabinCharter": "Cabin Charter",
      "boatShared": "Boat Tour",
      "boatExclusive": "Private Boat"
    },
    "socialBoating": {
      "stop1": { "name": "Departure", "description": "Boarding at Trapani harbour, welcome drink and captain's briefing" },
      "stop2": { "name": "Cala Rossa", "island": "Favignana", "description": "Swim in the most famous turquoise waters of the Mediterranean, snorkelling over posidonia seabeds" },
      "stop3": { "name": "Lunch on board", "description": "The chef prepares the freshest catch of the day with open-sea views" },
      "stop4": { "name": "Bue Marino", "island": "Favignana", "description": "Spectacular sea cave, crystal-clear waters among the cliffs" },
      "stop5": { "name": "Return", "description": "Sunset cruise back to Trapani" }
    },
    "exclusive": {
      "stop1": { "name": "Departure", "description": "Private boarding, champagne welcome and personal briefing" },
      "stop2": { "name": "Cala Rossa", "island": "Favignana", "description": "The most iconic beach of the Egadi, all to yourselves" },
      "stop3": { "name": "Gourmet lunch", "description": "Refined chef's menu with fish from Trapani market" },
      "stop4": { "name": "Cala Tramontana", "island": "Levanzo", "description": "Hidden cove with transparent waters and pristine seabeds" },
      "stop5": { "name": "Return", "description": "Sunset aperitivo during the return sail" }
    },
    "cabinCharter": {
      "stop1": { "name": "Departure", "description": "Check-in on board, cabin setup and weekly briefing" },
      "stop2": { "name": "Favignana", "island": "Favignana", "description": "Two days exploring coves, caves and the butterfly island's village" },
      "stop3": { "name": "Levanzo", "island": "Levanzo", "description": "The wildest island, Grotta del Genovese and dreamy seabeds" },
      "stop4": { "name": "Marettimo", "island": "Marettimo", "description": "The pearl of the Egadi, mountain trails and sea caves" },
      "stop5": { "name": "Return", "description": "Last breakfast at sea and return to Trapani" }
    },
    "boatShared": {
      "stop1": { "name": "Departure", "description": "Meet at Trapani harbour and set off towards the islands" },
      "stop2": { "name": "Favignana", "island": "Favignana", "description": "Island tour with stops at the most beautiful coves" },
      "stop3": { "name": "Levanzo", "island": "Levanzo", "description": "Swim and snorkelling in crystal-clear waters" },
      "stop4": { "name": "Return", "description": "Return to Trapani in the early afternoon" }
    },
    "boatExclusive": {
      "stop1": { "name": "Departure", "description": "Private departure, you choose the time" },
      "stop2": { "name": "Favignana", "island": "Favignana", "description": "The most exclusive coves with extended stops" },
      "stop3": { "name": "Lunch on board", "description": "Lunch with typical Sicilian produce" },
      "stop4": { "name": "Levanzo", "island": "Levanzo", "description": "Secret coves and snorkelling in pristine waters" },
      "stop5": { "name": "Return", "description": "Relaxed sunset sail back" }
    }
  }
}
```

Also add to `"islands"`: `"sectionLabel": "Discover the journey"`

- [ ] **Step 3: Commit**

```bash
git add src/i18n/messages/it.json src/i18n/messages/en.json
git commit -m "feat: add itinerary i18n translations"
```

---

## Chunk 2: Route Map Component

### Task 4: Create the RouteMap SVG component

**Files:**
- Create: `src/components/islands-itinerary/route-map.tsx`

- [ ] **Step 1: Create the route map component**

This component renders:
- The SVG container with viewBox
- Ghost route line (full path, very low opacity)
- Active route line (drawn via `stroke-dashoffset` based on `progress` prop 0-1)
- Glow layer (desktop only)
- Pulse dot at the head of the line
- Markers for each stop (ghost → revealed → active based on progress)

Props:
```ts
interface RouteMapProps {
  stops: ItineraryStop[];
  progress: number; // 0 to 1, from scroll
  activeStopIndex: number;
}
```

Key implementation details:
- Use `catmullRomToSvgPath` from `utils.ts` to generate path from stop `mapPosition` values
- Use a `ref` on the SVG `<path>` to call `getTotalLength()` on mount, store in state
- `stroke-dasharray` = total length, `stroke-dashoffset` = `totalLength * (1 - progress)`
- Markers: loop through stops, render gold pin if `index <= activeStopIndex`, ghost pin otherwise
- Active marker (at `activeStopIndex`) gets larger size, pulse ring animation, brighter gradient
- Glow path: wrap in `<g className="hidden lg:block">` for desktop only
- Gradient definitions (`<defs>`) for gold route line
- ViewBox: `0 0 400 400`
- Marker labels below each pin
- **Pulse dot positioning**: use `pathRef.getPointAtLength(progress * totalLength)` to get the `{x, y}` coordinate at the head of the drawn line. Render a `<circle>` at those coordinates with CSS animation: `@keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.4 } }`, duration `2s infinite`
- **Accessibility**: add `aria-label` with the stop name on each marker `<g>` element (e.g. `aria-label="Cala Rossa, Favignana"`)
- **Island illustration watermarks**: render `<image>` elements for each island illustration (from `public/images/islands/`) at approximate geographic positions, `opacity="0.06"`, `pointer-events="none"`. These are decorative — if assets are not yet available, skip and add later

- [ ] **Step 2: Commit**

```bash
git add src/components/islands-itinerary/route-map.tsx
git commit -m "feat: add RouteMap SVG component with scroll-driven animation"
```

---

## Chunk 3: Destination Text Component

### Task 5: Create the DestinationText component

**Files:**
- Create: `src/components/islands-itinerary/destination-text.tsx`

- [ ] **Step 1: Create the destination text component**

This component renders the left column content with crossfade transitions.

Props:
```ts
interface DestinationTextProps {
  stops: ItineraryStop[];
  activeStopIndex: number;
  totalStops: number;
}
```

Key implementation:
- Uses `useTranslations("itinerary")` for text
- `AnimatePresence mode="wait"` wrapping a `motion.div` keyed by `activeStopIndex`
- Enter animation: `opacity: 0, y: 20` → `opacity: 1, y: 0` (300ms)
- Exit animation: `opacity: 1, y: 0` → `opacity: 0, y: -20` (200ms)
- Content layout:
  - Time badge: gold dot (6px circle) + uppercase time in `text-amber-500`
  - Destination name: `font-heading text-5xl md:text-6xl lg:text-7xl font-bold italic text-white`
  - Island subtitle (if exists): `text-white/30 text-lg font-light tracking-wide`
  - Description: `text-white/45 text-base font-light leading-relaxed max-w-md`
- Progress dots at bottom: horizontal bars, gold for active, faded for others
  - Container: `<div className="flex gap-2.5 mt-8" aria-hidden="true">` (decorative, not clickable)
  - Map through stops, render `<div>` for each, width `20px`, height `3px`, `rounded-full`
  - Active: `bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.3)]`
  - Past: `bg-amber-500/25`
  - Future: `bg-white/5`

- [ ] **Step 2: Commit**

```bash
git add src/components/islands-itinerary/destination-text.tsx
git commit -m "feat: add DestinationText component with crossfade transitions"
```

---

## Chunk 4: Main Component & Integration

### Task 6: Create the main IslandsItinerary component

**Files:**
- Create: `src/components/islands-itinerary/index.tsx`

- [ ] **Step 1: Create the main component**

This is the orchestrator. It handles:
- Sticky scroll pattern
- Tab state
- Scroll progress → active stop index mapping
- Wiring DestinationText and RouteMap together

Key implementation:

```tsx
"use client";

import { useState, useRef, useMemo } from "react";
import { useScroll, useMotionValueEvent, useReducedMotion, AnimatePresence, motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { itineraries } from "@/data/itineraries";
import { RouteMap } from "./route-map";
import { DestinationText } from "./destination-text";
```

**Section title JSX** (above tabs, inside the sticky area):
```tsx
<div className="text-center pt-16 pb-4">
  <p className="text-amber-500 text-xs font-semibold tracking-[3px] uppercase mb-3">
    {t("islands.sectionLabel")}
  </p>
  <h2 className="font-heading text-5xl md:text-7xl lg:text-8xl xl:text-9xl font-bold text-white italic">
    {t("islands.title")}
  </h2>
</div>
```

**Controlled tabs** — the `<Tabs>` root must be wired with `value`/`onValueChange`:
```tsx
const [activeTab, setActiveTab] = useState("SOCIAL_BOATING");
const currentItinerary = useMemo(
  () => itineraries.find((it) => it.experienceType === activeTab) ?? itineraries[0],
  [activeTab]
);

<Tabs value={activeTab} onValueChange={setActiveTab}>
  <div className="flex justify-center py-5">
    <TabsList className="bg-white/[0.04] border border-white/[0.06]">
      {itineraries.map((it) => (
        <TabsTrigger
          key={it.experienceType}
          value={it.experienceType}
          className="text-white/35 data-active:bg-white/[0.08] data-active:text-white text-xs sm:text-sm"
        >
          {t(it.tabLabelKey)}
        </TabsTrigger>
      ))}
    </TabsList>
  </div>
  {/* Content area — no TabsContent needed, we render based on activeTab directly */}
</Tabs>
```

**Structure:**
- Outer `<section ref={sectionRef}>` with dynamic height: `style={{ height: \`${currentItinerary.stops.length * 60}vh\` }}` on desktop, `${currentItinerary.stops.length * 40}vh` on mobile. Use a CSS class: `h-[200vh] lg:h-[300vh]` as default, override with inline style.
- Inside: `<div className="sticky top-0 h-screen overflow-hidden">` (pinned content)
  - Section title
  - Tabs centered
  - Gold separator: `<div className="w-15 h-px bg-gradient-to-r from-transparent via-amber-500/30 to-transparent mx-auto" />`
  - Two-column flex: `flex flex-col lg:flex-row`, left = `DestinationText`, right = `RouteMap`
- `useScroll({ target: sectionRef, offset: ["start start", "end end"] })` returns `scrollYProgress` (0-1)
- `useMotionValueEvent(scrollYProgress, "change", (v) => { ... })` to compute `activeStopIndex`:
  - `activeStopIndex = Math.floor(v * stops.length)`, clamped to `[0, stops.length - 1]`

**Tab change behavior:**
- Wrap the two-column content area in `<AnimatePresence mode="wait">` keyed by `activeTab`
- Exit: `opacity: 1 → 0` (200ms)
- Enter: `opacity: 0 → 1` (300ms)
- This resets both RouteMap (remounts, recalculates path length) and DestinationText
- The new itinerary draws based on current scroll position — no reset to zero. Since `scrollYProgress` is continuous, the new RouteMap immediately gets the current progress value.

**Reduced motion (`prefers-reduced-motion`):**
```tsx
const reducedMotion = useReducedMotion();
const effectiveProgress = reducedMotion ? 1 : progress;
const mapStopIndex = reducedMotion ? currentItinerary.stops.length - 1 : activeStopIndex;
const textStopIndex = reducedMotion ? 0 : activeStopIndex;
```
- Pass `effectiveProgress` and `mapStopIndex` to `RouteMap` (full route, all markers revealed)
- Pass `textStopIndex` to `DestinationText` (shows first stop statically)

**Background & bottom transition:**
```tsx
<section
  ref={sectionRef}
  className="relative"
  style={{
    background: "linear-gradient(180deg, #071934 0%, #0a2a4a 50%, #071934 95%, #f5f5f4 100%)",
    height: `${currentItinerary.stops.length * 60}vh`,
  }}
>
```
The final 5% of the gradient transitions from dark navy to the next section's light background to avoid a hard cut.

**Mobile:** columns stack with `flex-col lg:flex-row`, map gets `h-[250px] lg:h-auto`, tabs scroll horizontally with `overflow-x-auto`

- [ ] **Step 2: Commit**

```bash
git add src/components/islands-itinerary/index.tsx
git commit -m "feat: add main IslandsItinerary orchestrator component"
```

### Task 7: Integrate into landing page

**Files:**
- Modify: `src/app/[locale]/landing-sections.tsx`

- [ ] **Step 1: Replace Section 2 (islands) with new component**

In `landing-sections.tsx`:
- Add import: `import { IslandsItinerary } from "@/components/islands-itinerary";`
- Replace the entire Section 2 block (lines 470-527, the `<section className="py-24 ... bg-[#fefce8]/30">` block) with:

```tsx
{/* ============================================================ */}
{/*  Section 2: Le Isole Egadi — Interactive Itinerary           */}
{/* ============================================================ */}
<IslandsItinerary />
```

- The `IslandsItinerary` component handles its own section wrapper, background, and padding internally.

- [ ] **Step 2: Verify build passes**

Run: `npx next build`
Expected: Build succeeds with no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/[locale]/landing-sections.tsx
git commit -m "feat: integrate islands itinerary section into landing page"
```

### Task 8: Visual testing in browser

- [ ] **Step 1: Start dev server and test**

Run: `npx next dev --port 3000`

Open `http://localhost:3000` and verify:
1. Section appears after the experiences section
2. Tabs are centered, switching works
3. Scrolling reveals stops one by one
4. SVG route line draws progressively through markers
5. Text crossfades between destinations
6. Markers go from ghost → revealed → active
7. Mobile: columns stack, tabs scroll horizontally

- [ ] **Step 2: Fix any visual issues found during testing**

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "fix: polish islands itinerary visual tweaks"
```
