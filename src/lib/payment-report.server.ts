import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, PDFFont, rgb } from "pdf-lib";
import invoiceLogoUrl from "@/assets/invoice-logo.png?inline";
import regularFontUrl from "@/assets/fonts/DejaVuSans.ttf?inline";
import boldFontUrl from "@/assets/fonts/DejaVuSans-Bold.ttf?inline";
import { BUSINESS } from "@/lib/catalog";

export type PaymentMethodTotal = { method: string; payments: number; amount: number };
export type CounterReportRow = { receivedOn: string; humanId: string; customerName: string; amount: number; method: string; vendorName: string | null; reference: string | null; note: string | null; recordedBy: string; recordedByEmail: string | null };
export type OnlineReportRow = { paidAt: string; humanId: string; customerName: string; provider: string; paymentId: string | null; gross: number; refunded: number; net: number; status: string };
export type PaymentReportDocument = {
  from: string;
  to: string;
  summary: { counterAmount: number; counterCount: number; onlineGross: number; onlineCount: number; onlineRefunded: number; onlineNet: number; methods: PaymentMethodTotal[] };
  counter: CounterReportRow[];
  online: OnlineReportRow[];
};

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 40;
const INK = rgb(0.09, 0.12, 0.11);
const MUTED = rgb(0.38, 0.42, 0.4);
const BORDER = rgb(0.82, 0.85, 0.83);
const HEADER = rgb(0.92, 0.96, 0.93);
const STRIPE = rgb(0.975, 0.985, 0.978);
const ACCENT = rgb(0.12, 0.55, 0.32);

const bytesFromDataUrl = (dataUrl: string) => Uint8Array.from(atob(dataUrl.slice(dataUrl.indexOf(",") + 1)), (character) => character.charCodeAt(0));
const money = (value: number) => `Rs ${value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fit = (value: string, font: PDFFont, size: number, width: number) => {
  if (font.widthOfTextAtSize(value, size) <= width) return value;
  let text = value;
  while (text.length > 1 && font.widthOfTextAtSize(`${text}…`, size) > width) text = text.slice(0, -1);
  return `${text}…`;
};

export async function createPaymentReportPdf(document: PaymentReportDocument) {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const font = await pdf.embedFont(bytesFromDataUrl(regularFontUrl), { subset: true });
  const bold = await pdf.embedFont(bytesFromDataUrl(boldFontUrl), { subset: true });
  const logo = await pdf.embedPng(bytesFromDataUrl(invoiceLogoUrl));
  let page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;

  const text = (value: string, x: number, size = 8.5, activeFont = font, color = INK) => page.drawText(value, { x, y, size, font: activeFont, color });
  const right = (value: string, x: number, size = 8.5, activeFont = font, color = INK) => page.drawText(value, { x: x - activeFont.widthOfTextAtSize(value, size), y, size, font: activeFont, color });
  const header = (continued = false) => {
    page.drawRectangle({ x: 28, y: 28, width: PAGE_WIDTH - 56, height: PAGE_HEIGHT - 56, borderColor: BORDER, borderWidth: 0.8 });
    page.drawImage(logo, { x: MARGIN, y: PAGE_HEIGHT - 88, width: 46, height: 46 });
    y = PAGE_HEIGHT - 55;
    text(BUSINESS.name, 96, 13, bold);
    y -= 14;
    text("Counter-sales payment report", 96, 8.5, font, MUTED);
    y = PAGE_HEIGHT - 55;
    right(continued ? "PAYMENT REPORT — CONTINUED" : "PAYMENT REPORT", PAGE_WIDTH - MARGIN, continued ? 9 : 13, bold);
    y -= 17;
    right(`${document.from} to ${document.to}`, PAGE_WIDTH - MARGIN, 8.5, font, MUTED);
    y = PAGE_HEIGHT - 104;
    page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_WIDTH - MARGIN, y }, thickness: 0.8, color: BORDER });
  };
  const newPage = () => { page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]); header(true); y = PAGE_HEIGHT - 126; };
  const ensure = (height: number) => { if (y - height < 54) newPage(); };
  const sectionTitle = (value: string) => { ensure(34); y -= 16; text(value, MARGIN, 11, bold); y -= 13; };

  header();
  y = PAGE_HEIGHT - 130;
  const metrics = [
    ["Counter collected", money(document.summary.counterAmount)],
    ["Counter receipts", String(document.summary.counterCount)],
    ["Online gross", money(document.summary.onlineGross)],
    ["Online refunds", money(document.summary.onlineRefunded)],
    ["Online net", money(document.summary.onlineNet)],
  ];
  const metricWidth = (PAGE_WIDTH - MARGIN * 2 - 16) / 3;
  metrics.forEach((metric, index) => {
    const label = metric[0] ?? "";
    const value = metric[1] ?? "";
    const row = Math.floor(index / 3);
    const col = index % 3;
    const top = y - row * 58;
    const x = MARGIN + col * (metricWidth + 8);
    page.drawRectangle({ x, y: top - 48, width: metricWidth, height: 48, color: STRIPE, borderColor: BORDER, borderWidth: 0.5 });
    y = top - 17; text(label, x + 8, 7.5, bold, MUTED);
    y -= 17; text(value, x + 8, 11, bold);
  });
  y -= metrics.length > 3 ? 118 : 60;

  sectionTitle("Counter payment methods");
  const maxMethod = Math.max(1, ...document.summary.methods.map((item) => item.amount));
  for (const method of document.summary.methods) {
    ensure(25);
    text(`${method.method} (${method.payments})`, MARGIN, 8.5, bold);
    right(money(method.amount), PAGE_WIDTH - MARGIN, 8.5, bold);
    y -= 10;
    page.drawRectangle({ x: MARGIN, y, width: PAGE_WIDTH - MARGIN * 2, height: 5, color: HEADER });
    page.drawRectangle({ x: MARGIN, y, width: (PAGE_WIDTH - MARGIN * 2) * method.amount / maxMethod, height: 5, color: ACCENT });
    y -= 13;
  }

  const drawTable = (title: string, headers: string[], widths: number[], rows: string[][]) => {
    sectionTitle(title);
    const tableWidth = widths.reduce((sum, width) => sum + width, 0);
    const drawHeader = () => {
      ensure(25);
      page.drawRectangle({ x: MARGIN, y: y - 19, width: tableWidth, height: 19, color: HEADER, borderColor: BORDER, borderWidth: 0.5 });
      let x = MARGIN + 4; y -= 13;
      headers.forEach((label, index) => { text(label, x, 7, bold); x += widths[index] ?? 0; });
      y -= 6;
    };
    drawHeader();
    if (rows.length === 0) { y -= 18; text("No transactions in this period.", MARGIN + 4, 8.5, font, MUTED); return; }
    rows.forEach((row, rowIndex) => {
      if (y - 21 < 54) { newPage(); drawHeader(); }
      if (rowIndex % 2 === 1) page.drawRectangle({ x: MARGIN, y: y - 21, width: tableWidth, height: 21, color: STRIPE });
      let x = MARGIN + 4; y -= 14;
      row.forEach((value, index) => { text(fit(value, index === row.length - 1 ? bold : font, 7, (widths[index] ?? 40) - 8), x, 7, index === row.length - 1 ? bold : font); x += widths[index] ?? 0; });
      y -= 7;
      page.drawLine({ start: { x: MARGIN, y }, end: { x: MARGIN + tableWidth, y }, thickness: 0.35, color: BORDER });
    });
  };

  drawTable("Counter-sale receipts", ["Date", "Invoice", "Customer", "Method / reference", "Recorded by", "Amount"], [55, 63, 105, 120, 105, 67], document.counter.map((row) => [row.receivedOn, row.humanId, row.customerName, [row.method, row.vendorName, row.reference].filter(Boolean).join(" · "), row.recordedBy, money(row.amount)]));
  drawTable("Online payments and refunds", ["Date", "Order", "Customer", "Provider / payment", "Status", "Net"], [62, 66, 110, 135, 72, 70], document.online.map((row) => [new Date(row.paidAt).toLocaleDateString("en-IN"), row.humanId, row.customerName, [row.provider, row.paymentId].filter(Boolean).join(" · "), row.status, money(row.net)]));

  for (const [index, pdfPage] of pdf.getPages().entries()) {
    pdfPage.drawText(`${index + 1} / ${pdf.getPageCount()}`, { x: PAGE_WIDTH - 70, y: 38, size: 7, font, color: MUTED });
  }
  pdf.setTitle(`Payment Report ${document.from} to ${document.to}`);
  pdf.setAuthor(BUSINESS.name);
  pdf.setSubject("Counter-sales and online payment report");
  return pdf.save();
}