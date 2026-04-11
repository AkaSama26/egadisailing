import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  const t = useTranslations();
  return (
    <main className="flex min-h-screen flex-col items-center justify-center">
      <h1 className="text-5xl font-bold mb-4">{t("hero.title")}</h1>
      <p className="text-xl text-gray-600 mb-8 max-w-2xl text-center">
        {t("hero.subtitle")}
      </p>
      <Button size="lg">{t("hero.cta")}</Button>
    </main>
  );
}
