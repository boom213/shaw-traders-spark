import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, type PDFFont, rgb } from "pdf-lib";
import invoiceLogoUrl from "@/assets/invoice-logo.png?inline";
import regularFontUrl from "@/assets/fonts/DejaVuSans.ttf?inline";
import boldFontUrl from "@/assets/fonts/DejaVuSans-Bold.ttf?inline";
import { BUSINESS } from "@/lib/catalog";
import type { SupplierLedgerDocument } from "@/lib/suppliers.functions";

const W = 595.28, H = 841.89, M = 36;
const INK = rgb(0.09, 0.12, 0.11), MUTED = rgb(0.38, 0.42, 0.4), BORDER = rgb(0.82, 0.85, 0.83), HEADER = rgb(0.92, 0.96, 0.93), STRIPE = rgb(0.975, 0.985, 0.978);
const bytes = (url: string) => Uint8Array.from(atob(url.slice(url.indexOf(",") + 1)), (c) => c.charCodeAt(0));
const money = (n: number) => `Rs ${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fit = (value: string, font: PDFFont, size: number, width: number) => { if (font.widthOfTextAtSize(value, size) <= width) return value; let text = value; while (text.length > 1 && font.widthOfTextAtSize(`${text}…`, size) > width) text = text.slice(0, -1); return `${text}…`; };

export async function createSupplierLedgerPdf(document: SupplierLedgerDocument) {
  const pdf = await PDFDocument.create(); pdf.registerFontkit(fontkit);
  const font = await pdf.embedFont(bytes(regularFontUrl), { subset: true });
  const bold = await pdf.embedFont(bytes(boldFontUrl), { subset: true });
  const logo = await pdf.embedPng(bytes(invoiceLogoUrl));
  let page = pdf.addPage([W, H]); let y = H - M;
  const text = (value: string, x: number, size = 8, active = font, color = INK) => page.drawText(value, { x, y, size, font: active, color });
  const right = (value: string, x: number, size = 8, active = font, color = INK) => page.drawText(value, { x: x - active.widthOfTextAtSize(value, size), y, size, font: active, color });
  const header = (continued = false) => { page.drawRectangle({ x: 26, y: 26, width: W - 52, height: H - 52, borderColor: BORDER, borderWidth: 0.8 }); page.drawImage(logo, { x: M, y: H - 84, width: 42, height: 42 }); y = H - 52; text(BUSINESS.name, 88, 12, bold); y -= 14; text("Supplier purchases and payments", 88, 8, font, MUTED); y = H - 52; right(continued ? "SUPPLIER LEDGER — CONTINUED" : "SUPPLIER LEDGER", W - M, continued ? 8 : 12, bold); y -= 16; right(`${document.from} to ${document.to}`, W - M, 8, font, MUTED); y = H - 98; page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 0.8, color: BORDER }); };
  const newPage = () => { page = pdf.addPage([W, H]); header(true); y = H - 120; };
  header(); y = H - 126;
  const metrics = [["Total billed", money(document.totals.billed)], ["Total paid", money(document.totals.paid)], ["Adjustments", money(document.totals.adjustments)], ["Net movement", money(document.totals.net)]];
  const mw = (W - M * 2 - 18) / 4;
  metrics.forEach(([label, value], i) => { const x = M + i * (mw + 6); page.drawRectangle({ x, y: y - 42, width: mw, height: 42, color: STRIPE, borderColor: BORDER, borderWidth: 0.5 }); const top = y; y = top - 15; text(label ?? "", x + 6, 6.8, bold, MUTED); y -= 15; text(value ?? "", x + 6, 8.3, bold); y = top; });
  y -= 62;
  const widths = [49, 88, 50, 83, 64, 109, 80];
  const labels = ["Date", "Supplier", "Type", "Category", "Method", "Bill / reference", "Amount"];
  const drawHead = () => { page.drawRectangle({ x: M, y: y - 19, width: widths.reduce((a,b)=>a+b,0), height: 19, color: HEADER, borderColor: BORDER, borderWidth: 0.5 }); let x = M + 4; y -= 13; labels.forEach((label, i) => { text(label, x, 6.6, bold); x += widths[i] ?? 0; }); y -= 6; };
  drawHead();
  if (!document.items.length) { y -= 20; text("No entries match these filters.", M + 4, 8, font, MUTED); }
  document.items.forEach((row, index) => { if (y - 22 < 48) { newPage(); drawHead(); } if (index % 2) page.drawRectangle({ x: M, y: y - 22, width: widths.reduce((a,b)=>a+b,0), height: 22, color: STRIPE }); const cells = [row.entryDate, row.supplierName, row.kindLabel, row.categoryLabel, row.methodLabel, [row.billNumber, row.reference, row.voidedAt ? `VOID: ${row.voidReason ?? "Voided"}` : null].filter(Boolean).join(" · ") || "—", money(row.amount)]; let x = M + 4; y -= 14; cells.forEach((cell, i) => { const active = i === cells.length - 1 ? bold : font; text(fit(cell, active, 6.8, (widths[i] ?? 40) - 8), x, 6.8, active, row.voidedAt ? MUTED : INK); x += widths[i] ?? 0; }); y -= 8; });
  pdf.getPages().forEach((pdfPage, index) => pdfPage.drawText(`${index + 1} / ${pdf.getPageCount()}`, { x: W - 66, y: 34, size: 7, font, color: MUTED }));
  pdf.setTitle(`Supplier Ledger ${document.from} to ${document.to}`); pdf.setAuthor(BUSINESS.name); return pdf.save();
}
