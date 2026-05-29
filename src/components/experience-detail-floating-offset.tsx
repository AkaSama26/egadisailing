"use client";

import { useEffect } from "react";

const BODY_CLASS = "experience-detail-floating-offset";

export function ExperienceDetailFloatingOffset() {
  useEffect(() => {
    document.body.classList.add(BODY_CLASS);
    return () => {
      document.body.classList.remove(BODY_CLASS);
    };
  }, []);

  return null;
}
