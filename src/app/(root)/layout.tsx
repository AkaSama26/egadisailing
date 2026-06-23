import type { Metadata } from "next";
import { rootBodyClassName, rootHtmlClassName, RootRuntime } from "@/app/_components/root-runtime";
import "../globals.css";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function RedirectRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it" className={rootHtmlClassName}>
      <body className={rootBodyClassName}>
        <RootRuntime />
        {children}
      </body>
    </html>
  );
}
