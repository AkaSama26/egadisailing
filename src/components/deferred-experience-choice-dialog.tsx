"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import type {
  ExperienceChoiceRecommendation,
  ExperienceChoiceRecommendationKey,
} from "@/components/experience-choice-dialog";

const DeferredDialog = dynamic(
  () =>
    import("@/components/experience-choice-dialog").then(
      (module) => module.ExperienceChoiceDialog,
    ),
  { ssr: false },
);

const STORAGE_KEY = "egadi-choice-dialog-dismissed";
const LOAD_DELAY_MS = 4000;
const DIALOG_DELAY_MS = 10000;

interface DeferredExperienceChoiceDialogProps {
  locale: string;
  recommendations: Record<
    ExperienceChoiceRecommendationKey,
    ExperienceChoiceRecommendation
  >;
}

function hasDismissedDialog() {
  try {
    return window.sessionStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function DeferredExperienceChoiceDialog({
  locale,
  recommendations,
}: DeferredExperienceChoiceDialogProps) {
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    if (hasDismissedDialog()) return;

    let loaded = false;
    const load = () => {
      if (loaded) return;
      loaded = true;
      setShouldLoad(true);
    };

    const timeoutId = window.setTimeout(load, LOAD_DELAY_MS);
    const options: AddEventListenerOptions = { once: true, passive: true };
    window.addEventListener("pointerdown", load, options);
    window.addEventListener("keydown", load, { once: true });
    window.addEventListener("scroll", load, options);

    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener("pointerdown", load);
      window.removeEventListener("keydown", load);
      window.removeEventListener("scroll", load);
    };
  }, []);

  if (!shouldLoad) return null;

  return (
    <DeferredDialog
      locale={locale}
      recommendations={recommendations}
      delayMs={DIALOG_DELAY_MS}
    />
  );
}
