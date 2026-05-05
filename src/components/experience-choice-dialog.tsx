"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { ArrowRight, ChevronLeft, ChevronRight, RotateCcw, X } from "lucide-react";

import { cn } from "@/lib/utils";

const STORAGE_KEY = "egadi-choice-dialog-dismissed";
const DEFAULT_DELAY_MS = 15_000;
const CAROUSEL_INTERVAL_MS = 3_800;

export type ExperienceChoiceRecommendationKey =
  | "shared8"
  | "private4"
  | "private8"
  | "gourmet"
  | "charter";

export interface ExperienceChoiceRecommendation {
  key: ExperienceChoiceRecommendationKey;
  emoji: string;
  title: string;
  boatLabel: string;
  reason: string;
  images: Array<{ src: string; alt: string }>;
  priceLabel: string | null;
  bookingHref: string;
  detailHref: string;
}

interface ExperienceChoiceDialogProps {
  locale: string;
  recommendations: Record<ExperienceChoiceRecommendationKey, ExperienceChoiceRecommendation>;
  delayMs?: number;
}

type WizardStep =
  | "party"
  | "soloPace"
  | "companyPrivacy"
  | "privateLunch"
  | "privateMood"
  | "premiumDuration"
  | "agilePace";

interface WizardChoice {
  emoji: string;
  label: string;
  description: string;
  onSelect: () => void;
}

interface WizardQuestion {
  eyebrow: string;
  title: string;
  description: string;
  choices: WizardChoice[];
}

function readDismissed() {
  try {
    return window.sessionStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function markDismissed() {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, "1");
  } catch {
    // Session storage can be unavailable in private or hardened browser modes.
  }
}

export function ExperienceChoiceDialog({
  locale,
  recommendations,
  delayMs = DEFAULT_DELAY_MS,
}: ExperienceChoiceDialogProps) {
  const isEn = locale === "en";
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<WizardStep>("party");
  const [history, setHistory] = useState<WizardStep[]>([]);
  const [resultKey, setResultKey] = useState<ExperienceChoiceRecommendationKey | null>(null);
  const result = resultKey ? recommendations[resultKey] : null;

  const copy = useMemo(
    () =>
      isEn
        ? {
            close: "Close",
            back: "Back",
            change: "Change answers",
            book: "Book this experience",
            details: "View details",
            previousImage: "Previous image",
            nextImage: "Next image",
            imageDotLabel: (index: number, total: number) =>
              `Show image ${index} of ${total}`,
            resultEyebrow: "Your route",
            resultTitle: "This one fits you best",
            introEyebrow: "Egadi Sailing concierge",
            introTitle: "Which sea day are you imagining?",
            introDescription:
              "A few quick choices to find the right route between the Neel 47 and our agile open boat.",
          }
        : {
            close: "Chiudi",
            back: "Indietro",
            change: "Cambia risposte",
            book: "Prenota questa esperienza",
            details: "Guarda i dettagli",
            previousImage: "Immagine precedente",
            nextImage: "Immagine successiva",
            imageDotLabel: (index: number, total: number) =>
              `Mostra immagine ${index} di ${total}`,
            resultEyebrow: "La tua rotta",
            resultTitle: "Questa è quella giusta",
            introEyebrow: "Concierge Egadi Sailing",
            introTitle: "Che giornata di mare hai in mente?",
            introDescription:
              "Poche scelte veloci per trovare la rotta giusta tra il Neel 47 e la nostra barca open più agile.",
          },
    [isEn],
  );

  useEffect(() => {
    if (readDismissed()) return;
    const timeout = window.setTimeout(() => setOpen(true), delayMs);
    return () => window.clearTimeout(timeout);
  }, [delayMs]);

  function moveTo(nextStep: WizardStep) {
    setHistory((current) => [...current, step]);
    setStep(nextStep);
  }

  function recommend(key: ExperienceChoiceRecommendationKey) {
    setHistory((current) => [...current, step]);
    setResultKey(key);
  }

  function goBack() {
    if (resultKey) {
      setResultKey(null);
      return;
    }
    setHistory((current) => {
      const previous = current.at(-1);
      if (previous) setStep(previous);
      return current.slice(0, -1);
    });
  }

  function resetWizard() {
    setStep("party");
    setHistory([]);
    setResultKey(null);
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) markDismissed();
  }

  function handleCtaClick() {
    markDismissed();
    setOpen(false);
  }

  const question = getQuestion({
    step,
    isEn,
    moveTo,
    recommend,
  });

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-[320] bg-[#031225]/55 backdrop-blur-sm transition-opacity duration-200 data-ending-style:opacity-0 data-starting-style:opacity-0" />
        <Dialog.Popup
          className={cn(
            "fixed left-1/2 top-1/2 z-[321] flex max-h-[calc(100vh-2rem)] w-[calc(100vw-1.5rem)] max-w-[44rem] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-lg border border-white/15 bg-[#071934] text-white shadow-2xl shadow-black/35 outline-none",
            result && "md:max-w-[64rem]",
            "transition duration-200 data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0",
          )}
        >
          <div className="relative overflow-hidden border-b border-white/10 bg-[linear-gradient(135deg,rgba(14,165,233,0.22),rgba(245,158,11,0.16)_48%,rgba(7,25,52,0.98))] px-5 py-5 sm:px-7">
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-[linear-gradient(90deg,transparent,var(--color-gold),transparent)]"
              aria-hidden="true"
            />
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-gold)]">
                  {result ? copy.resultEyebrow : copy.introEyebrow}
                </p>
                <Dialog.Title className="mt-2 font-heading text-2xl font-bold leading-tight sm:text-3xl">
                  {result ? copy.resultTitle : copy.introTitle}
                </Dialog.Title>
                <Dialog.Description className="mt-2 max-w-lg text-sm leading-6 text-white/70">
                  {result ? result.boatLabel : copy.introDescription}
                </Dialog.Description>
              </div>
              <Dialog.Close
                render={
                  <button
                    type="button"
                    className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-white/15 bg-white/10 text-white transition hover:bg-white/18 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-gold)]"
                    aria-label={copy.close}
                  />
                }
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </Dialog.Close>
            </div>
          </div>

          <div className="overflow-y-auto p-5 sm:p-7">
            {result ? (
              <ResultView
                copy={copy}
                recommendation={result}
                onCtaClick={handleCtaClick}
              />
            ) : (
              <QuestionView question={question} />
            )}
          </div>

          {(history.length > 0 || resultKey) && (
            <div className="flex items-center justify-between gap-3 border-t border-white/10 px-5 py-4 sm:px-7">
              <button
                type="button"
                onClick={goBack}
                className="inline-flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-semibold text-white/68 transition hover:bg-white/8 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-gold)]"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                {copy.back}
              </button>
              <button
                type="button"
                onClick={resetWizard}
                className="inline-flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-semibold text-[var(--color-gold)] transition hover:bg-white/8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-gold)]"
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                {copy.change}
              </button>
            </div>
          )}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function QuestionView({ question }: { question: WizardQuestion }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/42">
        {question.eyebrow}
      </p>
      <h2 className="mt-2 font-heading text-2xl font-bold leading-tight text-white">
        {question.title}
      </h2>
      <p className="mt-2 text-sm leading-6 text-white/62">{question.description}</p>
      <div className="mt-6 grid gap-3">
        {question.choices.map((choice) => (
          <button
            key={choice.label}
            type="button"
            onClick={choice.onSelect}
            className="group grid grid-cols-[2.75rem_minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-white/10 bg-white/[0.06] p-3 text-left transition hover:border-[var(--color-gold)]/55 hover:bg-white/[0.1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-gold)]"
          >
            <span
              className="flex size-11 items-center justify-center rounded-lg bg-white/10 text-2xl"
              aria-hidden="true"
            >
              {choice.emoji}
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-bold text-white sm:text-base">{choice.label}</span>
              <span className="mt-0.5 block text-xs leading-5 text-white/55 sm:text-sm">
                {choice.description}
              </span>
            </span>
            <ArrowRight
              className="h-4 w-4 text-white/30 transition group-hover:text-[var(--color-gold)]"
              aria-hidden="true"
            />
          </button>
        ))}
      </div>
    </div>
  );
}

function ResultView({
  copy,
  recommendation,
  onCtaClick,
}: {
  copy: {
    book: string;
    details: string;
    previousImage: string;
    nextImage: string;
    imageDotLabel: (index: number, total: number) => string;
  };
  recommendation: ExperienceChoiceRecommendation;
  onCtaClick: () => void;
}) {
  const images = recommendation.images.slice(0, 3);

  return (
    <div
      className={cn(
        "grid items-stretch gap-5",
        images.length > 0 && "md:grid-cols-[minmax(0,0.95fr)_minmax(18rem,0.8fr)]",
      )}
    >
      <div className="flex min-w-0 flex-col">
        <div className="flex items-start gap-4 rounded-lg border border-white/10 bg-white/[0.06] p-5">
          <span className="flex size-14 shrink-0 items-center justify-center rounded-lg bg-[var(--color-gold)]/18 text-3xl">
            <span aria-hidden="true">{recommendation.emoji}</span>
            <span className="sr-only">{recommendation.title}</span>
          </span>
          <div className="min-w-0">
            <h2 className="font-heading text-2xl font-bold leading-tight text-white sm:text-3xl">
              {recommendation.title}
            </h2>
            <p className="mt-2 text-sm font-semibold text-[var(--color-gold)]">
              {recommendation.boatLabel}
            </p>
            <p className="mt-5 text-sm leading-6 text-white/68">{recommendation.reason}</p>
            {recommendation.priceLabel && (
              <p className="mt-5 text-sm font-extrabold uppercase tracking-[0.08em] text-[var(--color-gold)]">
                {recommendation.priceLabel}
              </p>
            )}
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]">
          <Link
            href={recommendation.bookingHref}
            onClick={onCtaClick}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[var(--color-gold)] px-5 py-3 text-sm font-bold text-[#06233a] transition hover:bg-[#f2b84b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-gold)]"
          >
            {copy.book}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Link
            href={recommendation.detailHref}
            onClick={onCtaClick}
            className="inline-flex min-h-12 items-center justify-center rounded-lg border border-white/15 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-gold)]"
          >
            {copy.details}
          </Link>
        </div>
      </div>

      {images.length > 0 && (
        <RecommendationImages
          key={recommendation.key}
          images={images}
          labels={{
            previous: copy.previousImage,
            next: copy.nextImage,
            dot: copy.imageDotLabel,
          }}
        />
      )}
    </div>
  );
}

function RecommendationImages({
  images,
  labels,
}: {
  images: Array<{ src: string; alt: string }>;
  labels: {
    previous: string;
    next: string;
    dot: (index: number, total: number) => string;
  };
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const canSlide = images.length > 1;

  useEffect(() => {
    if (!canSlide) return;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;

    const interval = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % images.length);
    }, CAROUSEL_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [canSlide, images.length]);

  function previousImage() {
    setActiveIndex((current) => (current - 1 + images.length) % images.length);
  }

  function nextImage() {
    setActiveIndex((current) => (current + 1) % images.length);
  }

  return (
    <div className="relative min-h-[18rem] overflow-hidden rounded-lg border border-white/10 bg-white/[0.06] sm:min-h-[22rem] md:min-h-full">
      {images.map((image, index) => (
        <Image
          key={image.src}
          src={image.src}
          alt={image.alt}
          fill
          sizes="(max-width: 768px) calc(100vw - 4rem), 34rem"
          className={cn(
            "object-cover transition-opacity duration-700 ease-out",
            index === activeIndex ? "opacity-100" : "opacity-0",
          )}
        />
      ))}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_52%,rgba(7,25,52,0.62)_100%)]" />

      {canSlide && (
        <>
          <button
            type="button"
            onClick={previousImage}
            aria-label={labels.previous}
            className="absolute left-3 top-1/2 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-[#071934]/45 text-white shadow-lg backdrop-blur transition hover:bg-[#071934]/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-gold)]"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={nextImage}
            aria-label={labels.next}
            className="absolute right-3 top-1/2 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-[#071934]/45 text-white shadow-lg backdrop-blur transition hover:bg-[#071934]/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-gold)]"
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>

          <div className="absolute inset-x-0 bottom-4 flex justify-center gap-2">
            {images.map((image, index) => (
              <button
                key={`${image.src}-dot`}
                type="button"
                onClick={() => setActiveIndex(index)}
                aria-label={labels.dot(index + 1, images.length)}
                className={cn(
                  "h-2.5 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-gold)]",
                  index === activeIndex
                    ? "w-8 bg-[var(--color-gold)]"
                    : "w-2.5 bg-white/55 hover:bg-white/80",
                )}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
function getQuestion({
  step,
  isEn,
  moveTo,
  recommend,
}: {
  step: WizardStep;
  isEn: boolean;
  moveTo: (step: WizardStep) => void;
  recommend: (key: ExperienceChoiceRecommendationKey) => void;
}): WizardQuestion {
  if (isEn) {
    return getEnglishQuestion({ step, moveTo, recommend });
  }

  return getItalianQuestion({ step, moveTo, recommend });
}

function getItalianQuestion({
  step,
  moveTo,
  recommend,
}: {
  step: WizardStep;
  moveTo: (step: WizardStep) => void;
  recommend: (key: ExperienceChoiceRecommendationKey) => void;
}): WizardQuestion {
  switch (step) {
    case "soloPace":
      return {
        eyebrow: "Ritmo della giornata",
        title: "Vuoi rilassarti tutto il giorno o fare un giro veloce dell'isola?",
        description:
          "Se parti da solo puoi prenotare un posto sul tour condiviso da 8 ore, oppure riservare il 4 ore in esclusiva.",
        choices: [
          {
            emoji: "🌊",
            label: "Giornata intera",
            description: "Tempo lento, più soste bagno e snorkeling.",
            onSelect: () => recommend("shared8"),
          },
          {
            emoji: "⚡",
            label: "Giro veloce in esclusiva",
            description: "Mezza giornata privata, compatta e flessibile.",
            onSelect: () => recommend("private4"),
          },
        ],
      };
    case "companyPrivacy":
      return {
        eyebrow: "Tipo di barca",
        title: "Preferite una barca tutta vostra o va bene condividerla?",
        description: "La scelta cambia il ritmo: più sociale e accessibile, oppure più privata e flessibile.",
        choices: [
          {
            emoji: "🤝",
            label: "Va bene condividere",
            description: "Posti a bordo sul tour condiviso da 8 ore.",
            onSelect: () => recommend("shared8"),
          },
          {
            emoji: "🔒",
            label: "Tutta nostra",
            description: "Barca riservata al vostro gruppo.",
            onSelect: () => moveTo("privateLunch"),
          },
        ],
      };
    case "privateLunch":
      return {
        eyebrow: "Pranzo",
        title: "Vuoi pranzare a bordo o pranzare sull'isola?",
        description: "Il pranzo a bordo è il segnale giusto per il Neel 47 con chef, hostess e spazi premium.",
        choices: [
          {
            emoji: "🍽️",
            label: "A bordo",
            description: "Chef, tavola in rada e giornata premium.",
            onSelect: () => recommend("gourmet"),
          },
          {
            emoji: "🏝️",
            label: "Sull'isola / liberi",
            description: "Più libertà sul pranzo e focus su mare e rotta.",
            onSelect: () => moveTo("privateMood"),
          },
        ],
      };
    case "privateMood":
      return {
        eyebrow: "Stile",
        title: "Che tipo di giornata immaginate?",
        description: "Qui scegliamo tra il comfort luxury del Neel 47 e la barca open più agile.",
        choices: [
          {
            emoji: "✨",
            label: "Massimo comfort, spazio e ritmo lento",
            description: "Neel 47, privacy, zone relax e una rotta più curata.",
            onSelect: () => moveTo("premiumDuration"),
          },
          {
            emoji: "🚤",
            label: "Barca agile, bagni e cale",
            description: "Cigala & Bertinetti, rotta snella e soste bagno flessibili.",
            onSelect: () => moveTo("agilePace"),
          },
        ],
      };
    case "premiumDuration":
      return {
        eyebrow: "Tempo a bordo",
        title: "Una giornata premium o più giorni alle Egadi?",
        description: "Il Neel 47 è pensato sia per una giornata curata sia per vivere le isole con pernottamento.",
        choices: [
          {
            emoji: "🌅",
            label: "Una giornata premium",
            description: "Trimarano, spazi comodi e ritmo costruito intorno a voi.",
            onSelect: () => recommend("gourmet"),
          },
          {
            emoji: "🛏️",
            label: "Più giorni",
            description: "Cabine, rada e rotta tra Favignana, Levanzo e Marettimo.",
            onSelect: () => recommend("charter"),
          },
        ],
      };
    case "agilePace":
      return {
        eyebrow: "Durata",
        title: "Giornata intera o giro veloce?",
        description: "La barca privata agile resta tutta vostra, con rotta scelta insieme allo skipper.",
        choices: [
          {
            emoji: "🌊",
            label: "Giornata intera",
            description: "8 ore per godersi più baie e più tempo in acqua.",
            onSelect: () => recommend("private8"),
          },
          {
            emoji: "⚡",
            label: "Giro veloce",
            description: "4 ore private, compatte e facili da incastrare.",
            onSelect: () => recommend("private4"),
          },
        ],
      };
    case "party":
    default:
      return {
        eyebrow: "Prima scelta",
        title: "Sei da solo o in compagnia?",
        description: "Partiamo da qui, poi ti portiamo alla formula più naturale.",
        choices: [
          {
            emoji: "🧍",
            label: "Sono da solo",
            description: "Puoi prenotare anche un solo posto sui tour condivisi.",
            onSelect: () => moveTo("soloPace"),
          },
          {
            emoji: "👥",
            label: "Sono in compagnia",
            description: "Vediamo se ha più senso condividere o riservare la barca.",
            onSelect: () => moveTo("companyPrivacy"),
          },
        ],
      };
  }
}

function getEnglishQuestion({
  step,
  moveTo,
  recommend,
}: {
  step: WizardStep;
  moveTo: (step: WizardStep) => void;
  recommend: (key: ExperienceChoiceRecommendationKey) => void;
}): WizardQuestion {
  switch (step) {
    case "soloPace":
      return {
        eyebrow: "Pace",
        title: "Do you want a full relaxing day or a quick island loop?",
        description:
          "If you travel solo, you can book one seat on the shared 8-hour tour, or reserve the 4-hour tour privately.",
        choices: [
          {
            emoji: "🌊",
            label: "Full day",
            description: "Slow pace, more swim stops and snorkelling.",
            onSelect: () => recommend("shared8"),
          },
          {
            emoji: "⚡",
            label: "Private quick loop",
            description: "A compact and flexible private half day.",
            onSelect: () => recommend("private4"),
          },
        ],
      };
    case "companyPrivacy":
      return {
        eyebrow: "Boat style",
        title: "Would you like the boat to yourselves or are shared seats fine?",
        description: "This changes the rhythm: more social and accessible, or private and flexible.",
        choices: [
          {
            emoji: "🤝",
            label: "Shared is fine",
            description: "Seats on board on the shared 8-hour tour.",
            onSelect: () => recommend("shared8"),
          },
          {
            emoji: "🔒",
            label: "All to ourselves",
            description: "A boat reserved for your group.",
            onSelect: () => moveTo("privateLunch"),
          },
        ],
      };
    case "privateLunch":
      return {
        eyebrow: "Lunch",
        title: "Would you like lunch on board or on the island?",
        description: "Lunch on board points to the Neel 47 with chef, hostess and premium spaces.",
        choices: [
          {
            emoji: "🍽️",
            label: "On board",
            description: "Chef, table at anchor and a premium day.",
            onSelect: () => recommend("gourmet"),
          },
          {
            emoji: "🏝️",
            label: "On the island / flexible",
            description: "More freedom around lunch, with the focus on sea and route.",
            onSelect: () => moveTo("privateMood"),
          },
        ],
      };
    case "privateMood":
      return {
        eyebrow: "Style",
        title: "What kind of private day are you imagining?",
        description: "Here we choose between the luxury comfort of the Neel 47 and the more agile open boat.",
        choices: [
          {
            emoji: "✨",
            label: "Maximum comfort, space and slow pace",
            description: "Neel 47, privacy, relax areas and a more curated route.",
            onSelect: () => moveTo("premiumDuration"),
          },
          {
            emoji: "🚤",
            label: "Agile boat, swims and coves",
            description: "Cigala & Bertinetti, clean route and flexible swim stops.",
            onSelect: () => moveTo("agilePace"),
          },
        ],
      };
    case "premiumDuration":
      return {
        eyebrow: "Time on board",
        title: "One premium day or several days in the Egadi?",
        description: "The Neel 47 is designed for both a curated day and multi-day island living.",
        choices: [
          {
            emoji: "🌅",
            label: "One premium day",
            description: "Trimaran, comfort and a rhythm built around you.",
            onSelect: () => recommend("gourmet"),
          },
          {
            emoji: "🛏️",
            label: "Several days",
            description: "Cabins, anchorages and a route across Favignana, Levanzo and Marettimo.",
            onSelect: () => recommend("charter"),
          },
        ],
      };
    case "agilePace":
      return {
        eyebrow: "Duration",
        title: "Full day or quick loop?",
        description: "The agile private boat stays yours, with the route chosen together with the skipper.",
        choices: [
          {
            emoji: "🌊",
            label: "Full day",
            description: "8 hours for more bays and more time in the water.",
            onSelect: () => recommend("private8"),
          },
          {
            emoji: "⚡",
            label: "Quick loop",
            description: "4 private hours, compact and easy to fit into the day.",
            onSelect: () => recommend("private4"),
          },
        ],
      };
    case "party":
    default:
      return {
        eyebrow: "First choice",
        title: "Are you travelling solo or with others?",
        description: "We start here, then point you to the most natural format.",
        choices: [
          {
            emoji: "🧍",
            label: "I am solo",
            description: "You can book a single seat on shared tours.",
            onSelect: () => moveTo("soloPace"),
          },
          {
            emoji: "👥",
            label: "I am with others",
            description: "Let’s see whether shared seats or a reserved boat fit better.",
            onSelect: () => moveTo("companyPrivacy"),
          },
        ],
      };
  }
}
