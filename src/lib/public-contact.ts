export const PUBLIC_CONTACT_EMAIL = "info@egadisailing.com";
export const PRIVACY_CONTACT_EMAIL = PUBLIC_CONTACT_EMAIL;

export const PUBLIC_COMPANY_LEGAL = {
  name: "EGADI SAILING SRLS",
  legalAddress: "Via Calipso 42, 91100 Trapani",
  vatNumber: "02925600815",
  pec: "egadiSailing@pec.it",
  recipientCode: "KRRH6B9",
} as const;

export const PUBLIC_TECHNICAL_MAINTAINER = {
  name: "Marweb di Antonio Marino",
  legalRepresentative: "Antonio Marino",
  legalAddress: "Via F.sco Crispi 80, 91027 Paceco (TP)",
  vatNumber: "02925820819",
  pec: "antoniomarino96@pec.it",
  roleIt:
    "sviluppo, manutenzione tecnica, gestione codice, database, deploy e supporto applicativo",
  roleEn:
    "software development, technical maintenance, code, database, deployment and application support",
  roleEs:
    "desarrollo de software, mantenimiento técnico, código, base de datos, despliegue y soporte de la aplicación",
  roleFr:
    "développement logiciel, maintenance technique, code, base de données, déploiement et support applicatif",
} as const;

export const PUBLIC_CONTACT_LOCATION = {
  labelIt: "Via dei Gladioli 15, 91100 Trapani",
  labelEn: "Via dei Gladioli 15, 91100 Trapani, Italy",
  labelEs: "Via dei Gladioli 15, 91100 Trapani, Italia",
  labelFr: "Via dei Gladioli 15, 91100 Trapani, Italie",
  mapEmbedUrl:
    "https://www.google.com/maps?q=Via%20dei%20Gladioli%2015%2C%2091100%20Trapani%2C%20Italia&output=embed",
} as const;

export type WhatsAppContact = {
  key: "it" | "en";
  flagCode: "IT" | "GB";
  labelIt: string;
  labelEn: string;
  labelEs: string;
  labelFr: string;
  phoneDisplay: string;
  phoneE164: string;
  messageIt: string;
  messageEn: string;
  messageEs: string;
  messageFr: string;
};

export const WHATSAPP_CONTACTS: WhatsAppContact[] = [
  {
    key: "it",
    flagCode: "IT",
    labelIt: "Italiano",
    labelEn: "Italian",
    labelEs: "Italiano",
    labelFr: "Italien",
    phoneDisplay: "+39 345 971 0696",
    phoneE164: "393459710696",
    messageIt: "Ciao, ho bisogno di assistenza per un'esperienza Egadisailing.",
    messageEn: "Hi, I need help with an Egadisailing experience.",
    messageEs: "Hola, necesito ayuda con una experiencia Egadisailing.",
    messageFr: "Bonjour, j'ai besoin d'aide pour une expérience Egadisailing.",
  },
  {
    key: "en",
    flagCode: "GB",
    labelIt: "Inglese",
    labelEn: "English",
    labelEs: "Inglés",
    labelFr: "Anglais",
    phoneDisplay: "+39 340 145 4585",
    phoneE164: "393401454585",
    messageIt: "Ciao, vorrei assistenza in inglese per un'esperienza Egadisailing.",
    messageEn: "Hi, I need help in English with an Egadisailing experience.",
    messageEs: "Hola, necesito ayuda en inglés con una experiencia Egadisailing.",
    messageFr: "Bonjour, j'aimerais recevoir de l'aide en anglais pour une expérience Egadisailing.",
  },
];

export const PUBLIC_CONTACT_PHONE_TEXT = WHATSAPP_CONTACTS.map(
  (contact) => contact.phoneDisplay,
).join(" / ");

export function getContactLocationLabel(locale?: string | null): string {
  if (locale === "fr") return PUBLIC_CONTACT_LOCATION.labelFr;
  if (locale === "es") return PUBLIC_CONTACT_LOCATION.labelEs;
  return locale === "en" ? PUBLIC_CONTACT_LOCATION.labelEn : PUBLIC_CONTACT_LOCATION.labelIt;
}

export function getCompanyLegalLines(): string[] {
  return [
    PUBLIC_COMPANY_LEGAL.name,
    PUBLIC_COMPANY_LEGAL.legalAddress,
    `P.IVA: ${PUBLIC_COMPANY_LEGAL.vatNumber}`,
    `PEC: ${PUBLIC_COMPANY_LEGAL.pec}`,
    `Codice Univoco: ${PUBLIC_COMPANY_LEGAL.recipientCode}`,
    `Email: ${PUBLIC_CONTACT_EMAIL}`,
  ];
}

export function getWhatsAppLabel(contact: WhatsAppContact, locale?: string | null): string {
  if (locale === "fr") return contact.labelFr;
  if (locale === "es") return contact.labelEs;
  return locale === "en" ? contact.labelEn : contact.labelIt;
}

export function getOrderedWhatsAppContacts(locale?: string | null): WhatsAppContact[] {
  const preferredKey = locale === "en" || locale === "es" || locale === "fr" ? "en" : "it";
  return [...WHATSAPP_CONTACTS].sort((a, b) => {
    if (a.key === preferredKey) return -1;
    if (b.key === preferredKey) return 1;
    return 0;
  });
}

export function getWhatsAppUrl(contact: WhatsAppContact, locale?: string | null): string {
  const message =
    locale === "fr"
      ? contact.messageFr
      : locale === "es"
        ? contact.messageEs
        : locale === "en"
          ? contact.messageEn
          : contact.messageIt;
  return `https://wa.me/${contact.phoneE164}?text=${encodeURIComponent(message)}`;
}

export function getPhoneHref(contact: WhatsAppContact): string {
  return `tel:+${contact.phoneE164}`;
}

export function getEmailHref(email = PUBLIC_CONTACT_EMAIL): string {
  return `mailto:${email}`;
}
