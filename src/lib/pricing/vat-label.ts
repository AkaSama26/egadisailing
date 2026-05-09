export function vatIncludedLabel(locale?: string): string {
  if (locale === "fr") return "TVA incluse";
  if (locale === "es") return "IVA incluido";
  if (locale === "de") return "inkl. MwSt.";
  return locale === "en" ? "VAT included" : "IVA inclusa";
}

export function appendVatIncluded(label: string | null | undefined, locale?: string): string {
  if (!label) return "";
  if (/prezzo su richiesta|price on request|precio bajo petición|prix sur demande|preis auf anfrage/i.test(label)) return label;
  const vatLabel = vatIncludedLabel(locale);
  return label.includes(vatLabel) ? label : `${label} · ${vatLabel}`;
}
