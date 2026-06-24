"use client";

import { useEffect, useRef, useState } from "react";
import {
  HERO_VIDEO_DESKTOP_POSTER_SRC,
  HERO_VIDEO_MOBILE_POSTER_SRC,
  HERO_VIDEO_MOBILE_SRC,
  HERO_VIDEO_SRC,
} from "@/lib/public-assets";

export function HeroBackgroundVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoSource, setVideoSource] = useState<string | null>(null);
  const [posterSource, setPosterSource] = useState(HERO_VIDEO_DESKTOP_POSTER_SRC);
  const [videoReady, setVideoReady] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 768px)");
    const resolveHeroMedia = () => {
      const desktopVideo = mediaQuery.matches;
      return {
        poster: desktopVideo ? HERO_VIDEO_DESKTOP_POSTER_SRC : HERO_VIDEO_MOBILE_POSTER_SRC,
        video: desktopVideo ? HERO_VIDEO_SRC : HERO_VIDEO_MOBILE_SRC,
      };
    };
    const updatePoster = () => setPosterSource(resolveHeroMedia().poster);
    updatePoster();
    mediaQuery.addEventListener("change", updatePoster);

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const connection = navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string };
    };
    const effectiveType = connection.connection?.effectiveType ?? "";
    const slowConnection = effectiveType === "slow-2g" || effectiveType === "2g";

    if (prefersReducedMotion || connection.connection?.saveData || slowConnection) {
      return () => mediaQuery.removeEventListener("change", updatePoster);
    }

    let hasRequestedVideo = false;
    const requestVideo = () => {
      if (hasRequestedVideo) return;
      hasRequestedVideo = true;
      const media = resolveHeroMedia();
      setPosterSource(media.poster);
      setVideoSource(media.video);
    };

    let idleCallbackId: number | null = null;
    let fallbackTimerId: ReturnType<typeof globalThis.setTimeout> | null = null;

    const requestVideoWhenIdle = () => {
      if ("requestIdleCallback" in window) {
        idleCallbackId = window.requestIdleCallback(requestVideo, { timeout: 3000 });
        return;
      }

      fallbackTimerId = globalThis.setTimeout(requestVideo, 1800);
    };

    if (document.readyState === "complete") {
      requestVideoWhenIdle();
    } else {
      window.addEventListener("load", requestVideoWhenIdle, { once: true });
    }

    const interactionEvents = ["pointerdown", "keydown"] as const;
    for (const eventName of interactionEvents) {
      window.addEventListener(eventName, requestVideo, { once: true, passive: true });
    }

    return () => {
      mediaQuery.removeEventListener("change", updatePoster);
      window.removeEventListener("load", requestVideoWhenIdle);
      if (idleCallbackId !== null && "cancelIdleCallback" in window) {
        window.cancelIdleCallback(idleCallbackId);
      }
      if (fallbackTimerId !== null) {
        globalThis.clearTimeout(fallbackTimerId);
      }
      for (const eventName of interactionEvents) {
        window.removeEventListener(eventName, requestVideo);
      }
    };
  }, []);

  useEffect(() => {
    if (!videoSource) return;
    const video = videoRef.current;
    if (!video) return;

    const playVideo = () => {
      if (video.readyState >= 2) setVideoReady(true);
      video.play().catch(() => {
        const handleInteraction = () => {
          void video.play().then(() => setVideoReady(true));
          document.removeEventListener("click", handleInteraction);
          document.removeEventListener("scroll", handleInteraction);
        };
        document.addEventListener("click", handleInteraction);
        document.addEventListener("scroll", handleInteraction);
      });
    };

    video.load();
    if (video.readyState >= 2) {
      playVideo();
    } else {
      video.addEventListener("loadeddata", playVideo, { once: true });
    }
  }, [videoSource]);

  return (
    <video
      ref={videoRef}
      aria-hidden="true"
      tabIndex={-1}
      autoPlay
      muted
      loop
      playsInline
      preload="none"
      poster={posterSource}
      onLoadedData={() => setVideoReady(true)}
      onCanPlay={() => setVideoReady(true)}
      onPlaying={() => setVideoReady(true)}
      className={`absolute inset-0 z-0 h-full w-full object-cover object-[72%_center] transition-opacity duration-700 md:object-center ${
        videoReady ? "opacity-100" : "opacity-0"
      }`}
    >
      {videoSource ? <source src={videoSource} type="video/mp4" /> : null}
    </video>
  );
}
