"use client";

import { useEffect, useRef, useState } from "react";
import {
  HERO_VIDEO_MOBILE_SRC,
  HERO_VIDEO_POSTER_SRC,
  HERO_VIDEO_SRC,
} from "@/lib/public-assets";

export function HeroBackgroundVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoSource, setVideoSource] = useState<string | null>(null);
  const [videoReady, setVideoReady] = useState(false);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const connection = navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string };
    };
    const effectiveType = connection.connection?.effectiveType ?? "";
    const slowConnection = effectiveType === "slow-2g" || effectiveType === "2g";

    if (prefersReducedMotion || connection.connection?.saveData || slowConnection) {
      return;
    }

    let hasRequestedVideo = false;
    const requestVideo = () => {
      if (hasRequestedVideo) return;
      hasRequestedVideo = true;
      const desktopVideo = window.matchMedia("(min-width: 768px)").matches;
      setVideoSource(desktopVideo ? HERO_VIDEO_SRC : HERO_VIDEO_MOBILE_SRC);
    };

    if (document.readyState === "complete") {
      requestVideo();
    } else {
      window.addEventListener("load", requestVideo, { once: true });
    }

    const interactionEvents = ["pointerdown", "keydown", "scroll"] as const;
    for (const eventName of interactionEvents) {
      window.addEventListener(eventName, requestVideo, { once: true, passive: true });
    }

    return () => {
      window.removeEventListener("load", requestVideo);
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
      poster={HERO_VIDEO_POSTER_SRC}
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
