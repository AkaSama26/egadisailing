"use client";

import { Download } from "lucide-react";
import type { ReactNode } from "react";

interface QrDownloadButtonProps {
  svg: string;
  fileName: string;
  className?: string;
  children?: ReactNode;
}

export function QrDownloadButton({
  svg,
  fileName,
  className = "",
  children = "Scarica QR",
}: QrDownloadButtonProps) {
  return (
    <button
      type="button"
      onClick={() => downloadSvg(svg, fileName)}
      className={`inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-50 ${className}`}
    >
      <Download className="size-4" aria-hidden="true" />
      {children}
    </button>
  );
}

function downloadSvg(svg: string, fileName: string): void {
  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName.endsWith(".svg") ? fileName : `${fileName}.svg`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
