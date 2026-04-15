# Islands Itinerary Section — Design Spec

## Overview

Replace the current static islands section (Section 2 in `landing-sections.tsx`, lines 470-527) with an interactive, scroll-driven itinerary experience. Two-column layout: left side shows destination text that fades between stops as the user scrolls, right side shows a map with an animated SVG route connecting gold markers.

## Layout

### Section title (above tabs)
- Small gold uppercase label (i18n key: `islands.sectionLabel`, default: "Scopri il viaggio")
- Large italic heading (i18n key: `islands.title`)

### Tabs (centered)
- Shadcn `Tabs` component, centered horizontally
- Tabs match the experience types from the database: `SOCIAL_BOATING`, `EXCLUSIVE_EXPERIENCE`, `CABIN_CHARTER`, `BOAT_SHARED`, `BOAT_EXCLUSIVE`
- Display labels: "Social Boating", "Exclusive", "Cabin Charter", "Tour Barca", "Barca Esclusiva"
- Minimal style: muted background container (`bg-white/4`), active tab with subtle white background (`bg-white/8`)
- Changing tab resets scroll animation and redraws the route for the new itinerary

### Left column — Destination text (sticky)
- Displays the **current stop** based on scroll progress
- Content per stop:
  - Time badge (gold dot + uppercase time, e.g. "10:30")
  - Destination name — large, bold, italic (e.g. "Cala Rossa")
  - Island subtitle — light, smaller (e.g. "Favignana")
  - Description paragraph — muted white, light weight
- **Transitions**: crossfade via `AnimatePresence` with `mode="wait"`, triggered by scroll progress thresholds
- **Progress dots**: horizontal bars at the bottom, purely decorative (not clickable), gold for active, faded for others. Width ~20px, height ~3px.

### Right column — Route map
- Container with subtle border (`border-white/4`) and `rounded-2xl`
- Background: faint radial gradient (ocean blue `rgba(14,165,233,0.05)`)

#### SVG route line
- Path generated using **Catmull-Rom spline** interpolation converted to cubic bezier segments — this guarantees the curve passes through every marker point while maintaining smooth curvature
- Ghost line: full route path at `rgba(255,255,255,0.03)` as preview
- Active line: drawn progressively via `stroke-dashoffset` driven by scroll progress
- Gradient: gold from dark (`#92400e` at start) to bright (`#fbbf24` at head)
- Glow layer: same path, `stroke-width: 12`, `filter: blur(4px)`, `rgba(245,158,11,0.12)` — **desktop only** (`hidden lg:block`)
- Pulse dot: circle at the head of the drawn line, pulsing opacity via CSS animation

#### Markers (segnaposto)
- **Unrevealed** (future stops): dashed circle outline, opacity 10-15%
- **Revealed** (past stops): solid gold gradient circle with white center dot, `box-shadow` for glow
- **Active** (current stop): brighter gold, larger (34px vs 28px), stronger shadow, pulse ring animation
- Pin tail: 1.5px wide vertical line below marker, gradient to transparent
- Label below: stop name, small text (8-9px)

#### Illustrations
- The 3 island illustrations (user-provided assets, to be placed in `public/images/islands/`) used as subtle watermark overlays within the map area
- Low opacity (~5-10%), decorative, `pointer-events-none`

## Scroll mechanics

**Sticky scroll pattern**: the section has a tall scroll region (height: `300vh` for ~5 stops) with the visible content area pinned via `position: sticky; top: 0; height: 100vh`. As the user scrolls through the tall region, `framer-motion`'s `useScroll({ target: sectionRef })` tracks progress from 0 to 1. This progress value drives both the text transitions and the SVG draw animation.

| Scroll % | Left text | Map state |
|-----------|-----------|-----------|
| 0% | First stop fades in | All markers ghosted, no line drawn |
| ~20% | First stop visible | First marker revealed + glowing, line starts |
| ~40% | Crossfade to second stop | Line reaches second marker, it lights up, first dims slightly |
| ~60% | Crossfade to third stop | Line reaches third marker |
| ~80% | Crossfade to fourth stop | Line continues |
| 100% | Last stop visible | Full route drawn, all markers solid, subtle shimmer on line |

The scroll % thresholds are evenly distributed based on the number of stops: `stopIndex / (totalStops - 1)`.

## Itinerary data

Hardcoded in a data file (`src/data/itineraries.ts`). All user-facing strings go through `next-intl` translation keys.

```ts
interface ItineraryStop {
  time: string;              // "09:00"
  nameKey: string;           // i18n key: "itinerary.socialBoating.stop1.name"
  islandKey?: string;        // i18n key: "itinerary.socialBoating.stop1.island"
  descriptionKey: string;    // i18n key: "itinerary.socialBoating.stop1.description"
  mapPosition: {             // percentage-based position on map
    x: number;               // 0-100
    y: number;               // 0-100
  };
}

interface Itinerary {
  experienceType: string;    // matches service.type from DB
  tabLabelKey: string;       // i18n key for tab display
  stops: ItineraryStop[];
}
```

### Sample itinerary — Social Boating

| Stop | Time | Name | Island | Map x,y |
|------|------|------|--------|---------|
| 1 | 09:00 | Partenza | Trapani | 20, 85 |
| 2 | 10:30 | Cala Rossa | Favignana | 35, 55 |
| 3 | 13:00 | Pranzo a bordo | — | 50, 40 |
| 4 | 15:00 | Bue Marino | Favignana | 45, 25 |
| 5 | 17:00 | Rientro | Trapani | 20, 85 |

Other itineraries to be filled in with real data from the client. Map positions approximate the real geography of the Egadi archipelago (Trapani bottom-left, Favignana center, Levanzo upper-center, Marettimo upper-right).

## Tab change behavior

- Changing tab triggers:
  1. Current route line fades out (200ms)
  2. Text crossfades to first stop of new itinerary
  3. All markers reset to ghost state
  4. Route redraws based on current scroll position — if user is at 60% scroll, the new route instantly draws to 60% (no reset-to-zero, matches scroll position)

## Component structure

New directory: `src/components/islands-itinerary/`

- `index.tsx` — main component, exported, handles tabs state
- `route-map.tsx` — SVG map with route line, markers, illustrations
- `destination-text.tsx` — left column text with AnimatePresence transitions
- `itinerary-data.ts` — hardcoded itinerary data with i18n keys
- `utils.ts` — Catmull-Rom to bezier conversion, scroll progress helpers

## Technology

- `framer-motion`: `useScroll`, `useTransform`, `useMotionValueEvent`, `AnimatePresence`
- `shadcn/ui Tabs` (already in project)
- SVG: inline, `stroke-dasharray`/`stroke-dashoffset` for draw animation
- `useScroll({ target: sectionRef })` scoped to the section's tall scroll container

## Mobile

- Columns stack vertically: destination text on top, map below
- Map height reduced to `250px` (from 100vh on desktop)
- Glow layer hidden on mobile for performance
- Sticky scroll height reduced to `200vh` on mobile (fewer scroll pixels needed)
- Tabs scroll horizontally if they overflow

## Background

- Dark navy gradient consistent with rest of landing: `#071934` base
- Sections before and after: Section 1 (experiences) is already dark. Section 3 (why egadisailing) uses light backgrounds. Add a gradient transition at the bottom of this section from `#071934` to the next section's background to avoid a hard cut.

## Accessibility

- Tab navigation with keyboard (arrow keys, handled by shadcn Tabs)
- `prefers-reduced-motion`: show all stops and full route immediately, left column shows first stop statically (no scroll-driven transitions), all markers in revealed state
- `aria-label` on SVG markers
- Progress dots have `aria-hidden="true"` (decorative)
