"use client";

import { useEffect, useState } from "react";

interface SafeEmailLinkProps {
  user: string;
  domainParts: string[];
  className?: string;
}

function obfuscateEmail(user: string, domainParts: string[]) {
  return `${user} [at] ${domainParts.join(" [dot] ")}`;
}

export function SafeEmailLink({ user, domainParts, className }: SafeEmailLinkProps) {
  const domain = domainParts.join(".");
  const email = `${user}@${domain}`;
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => setIsHydrated(true));
    return () => window.cancelAnimationFrame(frameId);
  }, []);

  if (!isHydrated) {
    return <span>{obfuscateEmail(user, domainParts)}</span>;
  }

  return (
    <a href={`mailto:${email}`} className={className}>
      {email}
    </a>
  );
}
