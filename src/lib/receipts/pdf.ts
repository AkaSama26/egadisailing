import { PDFDocument, PageSizes, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { getReceiptViewModel, type ReceiptViewModel } from "./view-model";

const PAGE_MARGIN = 46;
const HEADER_COLOR = rgb(0.06, 0.1, 0.18);
const MUTED_COLOR = rgb(0.38, 0.43, 0.5);
const BORDER_COLOR = rgb(0.82, 0.85, 0.9);
const SOFT_BG = rgb(0.96, 0.97, 0.98);

export async function renderReceiptPdfById(id: string): Promise<{
  number: string;
  bytes: Uint8Array;
}> {
  const viewModel = await getReceiptViewModel(id);
  return {
    number: viewModel.number,
    bytes: await renderReceiptPdf(viewModel),
  };
}

export function receiptPdfFilename(number: string): string {
  return `${number}.pdf`;
}

export async function renderReceiptPdf(viewModel: ReceiptViewModel): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const fonts = { regular, bold };
  let page = pdf.addPage(PageSizes.A4);
  let y = page.getHeight() - PAGE_MARGIN;

  const ensureSpace = (height: number) => {
    if (y - height < PAGE_MARGIN + 36) {
      drawFooter(page, fonts, viewModel);
      page = pdf.addPage(PageSizes.A4);
      y = page.getHeight() - PAGE_MARGIN;
    }
  };

  drawHeader(page, fonts, viewModel);
  y -= 122;

  y = drawDisclaimer(page, fonts, viewModel, y);
  y -= 20;

  ensureSpace(118);
  y = drawParties(page, fonts, viewModel, y);
  y -= 20;

  if (viewModel.booking) {
    ensureSpace(78);
    y = drawBooking(page, fonts, viewModel, y);
    y -= 18;
  }

  ensureSpace(112);
  y = drawLineTableHeader(page, fonts, viewModel, y);
  for (const line of viewModel.lineItems) {
    const wrapped = wrapText(line.description, fonts.regular, 9, 232);
    const rowHeight = Math.max(32, wrapped.length * 12 + 16);
    ensureSpace(rowHeight + 8);
    y = drawLineRow(page, fonts, y, {
      descriptionLines: wrapped,
      quantity: line.quantity,
      unitPrice: moneyForPdf(line.unitPriceLabel),
      vat: line.vatLabel,
      total: moneyForPdf(line.lineTotalLabel),
      height: rowHeight,
    });
  }

  ensureSpace(78);
  y = drawTotal(page, fonts, viewModel, y);
  y -= 22;

  if (viewModel.paymentSummary) {
    ensureSpace(62 + viewModel.paymentSummary.rows.length * 18);
    y = drawPaymentSummary(page, fonts, viewModel, y);
    y -= 18;
  }

  if (viewModel.payments.length > 0) {
    ensureSpace(72 + viewModel.payments.length * 18);
    y = drawPayments(page, fonts, viewModel, y);
    y -= 18;
  }

  if (viewModel.note) {
    const lines = wrapText(viewModel.note, fonts.regular, 9, 490);
    ensureSpace(lines.length * 12 + 44);
    y = drawNote(page, fonts, viewModel, y, lines);
    y -= 14;
  }

  drawFooter(page, fonts, viewModel);
  return pdf.save();
}

function drawHeader(
  page: PDFPage,
  fonts: { regular: PDFFont; bold: PDFFont },
  vm: ReceiptViewModel,
) {
  const width = page.getWidth();
  const top = page.getHeight() - PAGE_MARGIN;
  page.drawText(pdfText(vm.company.name), {
    x: PAGE_MARGIN,
    y: top,
    size: 17,
    font: fonts.bold,
    color: HEADER_COLOR,
  });
  drawSmallLine(page, fonts.regular, vm.company.legalAddress, PAGE_MARGIN, top - 18);
  drawSmallLine(page, fonts.regular, `P.IVA ${vm.company.vatNumber}`, PAGE_MARGIN, top - 32);
  drawSmallLine(page, fonts.regular, vm.company.email, PAGE_MARGIN, top - 46);

  const title = vm.language === "EN" ? "INTERNAL RECEIPT" : "RICEVUTA INTERNA";
  const titleWidth = fonts.bold.widthOfTextAtSize(title, 18);
  page.drawText(title, {
    x: width - PAGE_MARGIN - titleWidth,
    y: top,
    size: 18,
    font: fonts.bold,
    color: HEADER_COLOR,
  });
  const meta = [
    `${vm.language === "EN" ? "No." : "N."} ${vm.number}`,
    `${vm.language === "EN" ? "Date" : "Data"} ${vm.issueDateLabel}`,
    vm.status === "CANCELLED" ? (vm.language === "EN" ? "CANCELLED" : "ANNULLATA") : null,
  ].filter(Boolean) as string[];
  meta.forEach((line, index) => {
    const size = index === 2 ? 9 : 10;
    const textWidth = fonts.bold.widthOfTextAtSize(line, size);
    page.drawText(line, {
      x: width - PAGE_MARGIN - textWidth,
      y: top - 20 - index * 15,
      size,
      font: fonts.bold,
      color: index === 2 ? rgb(0.72, 0.12, 0.12) : MUTED_COLOR,
    });
  });
}

function drawDisclaimer(
  page: PDFPage,
  fonts: { regular: PDFFont; bold: PDFFont },
  vm: ReceiptViewModel,
  y: number,
): number {
  page.drawRectangle({
    x: PAGE_MARGIN,
    y: y - 34,
    width: page.getWidth() - PAGE_MARGIN * 2,
    height: 42,
    color: rgb(1, 0.98, 0.9),
    borderColor: rgb(0.91, 0.68, 0.2),
    borderWidth: 1,
  });
  page.drawText(pdfText(vm.disclaimer), {
    x: PAGE_MARGIN + 12,
    y: y - 17,
    size: 10,
    font: fonts.bold,
    color: rgb(0.48, 0.3, 0.02),
  });
  return y - 42;
}

function drawParties(
  page: PDFPage,
  fonts: { regular: PDFFont; bold: PDFFont },
  vm: ReceiptViewModel,
  y: number,
): number {
  const label = vm.language === "EN" ? "Recipient" : "Destinatario";
  page.drawText(label, {
    x: PAGE_MARGIN,
    y,
    size: 12,
    font: fonts.bold,
    color: HEADER_COLOR,
  });
  const lines = [
    vm.recipient.name,
    vm.recipient.email,
    vm.recipient.address,
    vm.recipient.taxId ? `${vm.language === "EN" ? "Tax/VAT ID" : "Codice fiscale / P.IVA"}: ${vm.recipient.taxId}` : null,
  ].filter(Boolean) as string[];
  lines.forEach((line, index) => {
    page.drawText(pdfText(line), {
      x: PAGE_MARGIN,
      y: y - 20 - index * 14,
      size: 10,
      font: index === 0 ? fonts.bold : fonts.regular,
      color: index === 0 ? HEADER_COLOR : MUTED_COLOR,
    });
  });
  return y - 20 - lines.length * 14;
}

function drawBooking(
  page: PDFPage,
  fonts: { regular: PDFFont; bold: PDFFont },
  vm: ReceiptViewModel,
  y: number,
): number {
  if (!vm.booking) return y;
  page.drawRectangle({
    x: PAGE_MARGIN,
    y: y - 46,
    width: page.getWidth() - PAGE_MARGIN * 2,
    height: 58,
    color: SOFT_BG,
    borderColor: BORDER_COLOR,
    borderWidth: 1,
  });
  page.drawText(vm.language === "EN" ? "Linked booking" : "Prenotazione collegata", {
    x: PAGE_MARGIN + 12,
    y: y - 10,
    size: 9,
    font: fonts.bold,
    color: MUTED_COLOR,
  });
  const text = `${vm.booking.confirmationCode} - ${vm.booking.serviceName} - ${vm.booking.startDateLabel} / ${vm.booking.endDateLabel}`;
  page.drawText(pdfText(text), {
    x: PAGE_MARGIN + 12,
    y: y - 29,
    size: 11,
    font: fonts.bold,
    color: HEADER_COLOR,
  });
  return y - 58;
}

function drawLineTableHeader(
  page: PDFPage,
  fonts: { regular: PDFFont; bold: PDFFont },
  vm: ReceiptViewModel,
  y: number,
): number {
  const labels = vm.language === "EN"
    ? ["Description", "Qty", "Unit", "VAT", "Total"]
    : ["Descrizione", "Qta", "Prezzo", "IVA", "Totale"];
  const x = PAGE_MARGIN;
  const width = page.getWidth() - PAGE_MARGIN * 2;
  page.drawRectangle({ x, y: y - 26, width, height: 26, color: HEADER_COLOR });
  [x + 10, x + 262, x + 318, x + 390, x + 456].forEach((colX, index) => {
    page.drawText(labels[index], {
      x: colX,
      y: y - 17,
      size: 9,
      font: fonts.bold,
      color: rgb(1, 1, 1),
    });
  });
  return y - 26;
}

function drawLineRow(
  page: PDFPage,
  fonts: { regular: PDFFont; bold: PDFFont },
  y: number,
  row: {
    descriptionLines: string[];
    quantity: string;
    unitPrice: string;
    vat: string;
    total: string;
    height: number;
  },
): number {
  const x = PAGE_MARGIN;
  const width = page.getWidth() - PAGE_MARGIN * 2;
  page.drawRectangle({
    x,
    y: y - row.height,
    width,
    height: row.height,
    borderColor: BORDER_COLOR,
    borderWidth: 0.6,
  });
  row.descriptionLines.forEach((line, index) => {
    page.drawText(pdfText(line), {
      x: x + 10,
      y: y - 15 - index * 12,
      size: 9,
      font: fonts.regular,
      color: HEADER_COLOR,
    });
  });
  page.drawText(row.quantity, { x: x + 262, y: y - 15, size: 9, font: fonts.regular, color: HEADER_COLOR });
  page.drawText(row.unitPrice, { x: x + 318, y: y - 15, size: 9, font: fonts.regular, color: HEADER_COLOR });
  page.drawText(pdfText(row.vat), { x: x + 390, y: y - 15, size: 8, font: fonts.regular, color: MUTED_COLOR });
  page.drawText(row.total, { x: x + 456, y: y - 15, size: 9, font: fonts.bold, color: HEADER_COLOR });
  return y - row.height;
}

function drawTotal(
  page: PDFPage,
  fonts: { regular: PDFFont; bold: PDFFont },
  vm: ReceiptViewModel,
  y: number,
): number {
  const label = vm.paymentSummary
    ? vm.language === "EN"
      ? "Booking total"
      : "Totale prenotazione"
    : vm.language === "EN"
      ? "Total"
      : "Totale";
  const x = page.getWidth() - PAGE_MARGIN - 190;
  page.drawRectangle({
    x,
    y: y - 46,
    width: 190,
    height: 46,
    color: SOFT_BG,
    borderColor: BORDER_COLOR,
    borderWidth: 1,
  });
  page.drawText(label, { x: x + 12, y: y - 18, size: 10, font: fonts.bold, color: MUTED_COLOR });
  page.drawText(moneyForPdf(vm.totalLabel), {
    x: x + 86,
    y: y - 22,
    size: 16,
    font: fonts.bold,
    color: HEADER_COLOR,
  });
  return y - 46;
}

function drawPaymentSummary(
  page: PDFPage,
  fonts: { regular: PDFFont; bold: PDFFont },
  vm: ReceiptViewModel,
  y: number,
): number {
  const summary = vm.paymentSummary;
  if (!summary) return y;
  const x = PAGE_MARGIN;
  const width = page.getWidth() - PAGE_MARGIN * 2;
  const height = 40 + summary.rows.length * 18;
  page.drawRectangle({
    x,
    y: y - height,
    width,
    height,
    color: SOFT_BG,
    borderColor: BORDER_COLOR,
    borderWidth: 1,
  });
  page.drawText(vm.language === "EN" ? "Deposit and balance" : "Acconto e saldo", {
    x: x + 12,
    y: y - 17,
    size: 11,
    font: fonts.bold,
    color: HEADER_COLOR,
  });
  const snapshot = summary.snapshotAtLabel;
  const snapshotWidth = fonts.regular.widthOfTextAtSize(snapshot, 8);
  page.drawText(snapshot, {
    x: x + width - 12 - snapshotWidth,
    y: y - 16,
    size: 8,
    font: fonts.regular,
    color: MUTED_COLOR,
  });
  summary.rows.forEach((row, index) => {
    const rowY = y - 38 - index * 18;
    const value = moneyForPdf(row.value);
    const valueWidth = fonts.bold.widthOfTextAtSize(value, 9);
    page.drawText(pdfText(row.label), {
      x: x + 12,
      y: rowY,
      size: 9,
      font: row.emphasis ? fonts.bold : fonts.regular,
      color: row.emphasis ? HEADER_COLOR : MUTED_COLOR,
    });
    page.drawText(value, {
      x: x + width - 12 - valueWidth,
      y: rowY,
      size: 9,
      font: fonts.bold,
      color: HEADER_COLOR,
    });
  });
  return y - height;
}

function drawPayments(
  page: PDFPage,
  fonts: { regular: PDFFont; bold: PDFFont },
  vm: ReceiptViewModel,
  y: number,
): number {
  page.drawText(
    vm.paymentSummary
      ? vm.language === "EN"
        ? "Included payments"
        : "Pagamenti inclusi"
      : vm.language === "EN"
        ? "Linked payments"
        : "Pagamenti collegati",
    {
      x: PAGE_MARGIN,
      y,
      size: 12,
      font: fonts.bold,
      color: HEADER_COLOR,
    },
  );
  vm.payments.forEach((payment, index) => {
    const line = `${payment.typeLabel} - ${payment.methodLabel}${payment.processedAtLabel ? ` - ${payment.processedAtLabel}` : ""} - ${moneyForPdf(payment.amountLabel)}`;
    page.drawText(pdfText(line), {
      x: PAGE_MARGIN,
      y: y - 20 - index * 15,
      size: 9,
      font: fonts.regular,
      color: MUTED_COLOR,
    });
  });
  return y - 22 - vm.payments.length * 15;
}

function drawNote(
  page: PDFPage,
  fonts: { regular: PDFFont; bold: PDFFont },
  vm: ReceiptViewModel,
  y: number,
  lines: string[],
): number {
  page.drawText(vm.language === "EN" ? "Note" : "Note", {
    x: PAGE_MARGIN,
    y,
    size: 12,
    font: fonts.bold,
    color: HEADER_COLOR,
  });
  lines.forEach((line, index) => {
    page.drawText(pdfText(line), {
      x: PAGE_MARGIN,
      y: y - 18 - index * 12,
      size: 9,
      font: fonts.regular,
      color: MUTED_COLOR,
    });
  });
  return y - 20 - lines.length * 12;
}

function drawFooter(
  page: PDFPage,
  fonts: { regular: PDFFont; bold: PDFFont },
  vm: ReceiptViewModel,
) {
  const y = 30;
  page.drawLine({
    start: { x: PAGE_MARGIN, y: y + 18 },
    end: { x: page.getWidth() - PAGE_MARGIN, y: y + 18 },
    thickness: 0.6,
    color: BORDER_COLOR,
  });
  page.drawText(pdfText(vm.disclaimer), {
    x: PAGE_MARGIN,
    y,
    size: 8,
    font: fonts.bold,
    color: MUTED_COLOR,
  });
}

function drawSmallLine(page: PDFPage, font: PDFFont, text: string, x: number, y: number) {
  page.drawText(pdfText(text), {
    x,
    y,
    size: 9,
    font,
    color: MUTED_COLOR,
  });
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = pdfText(text).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words.flatMap((candidate) => splitLongWord(candidate, font, size, maxWidth))) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      current = candidate;
      continue;
    }
    if (current) lines.push(current);
    current = word;
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

function splitLongWord(word: string, font: PDFFont, size: number, maxWidth: number): string[] {
  if (font.widthOfTextAtSize(word, size) <= maxWidth) return [word];

  const chunks: string[] = [];
  let current = "";
  for (const char of word) {
    const candidate = `${current}${char}`;
    if (current && font.widthOfTextAtSize(candidate, size) > maxWidth) {
      chunks.push(current);
      current = char;
      continue;
    }
    current = candidate;
  }
  if (current) chunks.push(current);
  return chunks;
}

function moneyForPdf(label: string): string {
  return normalizeReceiptPdfMoney(label);
}

function pdfText(text: string): string {
  return normalizeReceiptPdfText(text);
}

export function normalizeReceiptPdfMoney(label: string): string {
  return normalizeReceiptPdfText(label.replace(/\s+/g, " ").trim());
}

export function normalizeReceiptPdfText(text: string): string {
  return text
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, "-")
    .replace(/→/g, "->")
    .replace(/\u00a0/g, " ")
    .replace(/\u202f/g, " ")
    .replace(/[^\x09\x0a\x0d\x20-\x7e\u00a0-\u00ff\u20ac]/g, "?");
}
