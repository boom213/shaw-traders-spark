/** Professional GST invoice PDF, built with edge-compatible pdf-lib. */
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, PDFPage, PDFFont, rgb } from "pdf-lib";
import invoiceLogoUrl from "@/assets/invoice-logo.png?inline";
import regularFontUrl from "@/assets/fonts/DejaVuSans.ttf?inline";
import boldFontUrl from "@/assets/fonts/DejaVuSans-Bold.ttf?inline";
import { BUSINESS } from "@/lib/catalog";

type Row = Record<string, unknown>;

export type InvoiceItem = {
  name: string;
  qty: number;
  price: number;
  productId?: string | null;
};

export type InvoiceDocument = {
  humanId: string;
  placedAt: string;
  subtotal: number;
  shippingFee: number;
  discount: number;
  total: number;
  taxAmount: number;
  gstRate: number;
  gstIncluded: boolean;
  gstin?: string | null;
  paymentMethod?: string | null;
  paymentStatus: string;
  shippingMethod?: string | null;
  address: Record<string, unknown>;
  contactPhone?: string | null;
  items: InvoiceItem[];
  hsnById: Map<string, string>;
  defaultHsn: string;
  business: {
    legalName: string;
    billingAddress: string;
    gstin?: string | null;
  };
};

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 48; // 16.9 mm
const CONTENT_RIGHT = PAGE_WIDTH - MARGIN;
const BORDER = rgb(0.77, 0.79, 0.82);
const LIGHT_BORDER = rgb(0.87, 0.88, 0.9);
const HEADER_FILL = rgb(0.94, 0.95, 0.96);
const STRIPE_FILL = rgb(0.975, 0.978, 0.982);
const FOOTER_FILL = rgb(0.955, 0.96, 0.965);
const INK = rgb(0.09, 0.1, 0.12);
const MUTED = rgb(0.37, 0.4, 0.45);

const money = (n: number) =>
  `Rs ${(Math.round((Number(n) || 0) * 100) / 100).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const bytesFromDataUrl = (dataUrl: string) => {
  const encoded = dataUrl.includes(",") ? dataUrl.slice(dataUrl.indexOf(",") + 1) : dataUrl;
  return Uint8Array.from(atob(encoded), (character) => character.charCodeAt(0));
};

const clean = (value: unknown) => String(value ?? "").trim();

export function billToLines(address: Record<string, unknown>, contactPhone?: string | null) {
  const locality = [clean(address["city"]), clean(address["state"])].filter(Boolean).join(", ");
  const localityWithPin = [locality, clean(address["pincode"])].filter(Boolean).join(" - ");
  const phone = clean(contactPhone) || clean(address["phone"]);
  return [
    clean(address["name"]),
    clean(address["line1"]),
    clean(address["landmark"]),
    localityWithPin,
    phone ? `Phone: ${phone}` : "",
  ].filter(Boolean);
}

function fitText(value: string, font: PDFFont, size: number, maxWidth: number) {
  if (font.widthOfTextAtSize(value, size) <= maxWidth) return value;
  let shortened = value;
  while (shortened.length > 1 && font.widthOfTextAtSize(`${shortened}…`, size) > maxWidth) {
    shortened = shortened.slice(0, -1);
  }
  return `${shortened}…`;
}

export async function createInvoicePdf(document: InvoiceDocument): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const font = await pdf.embedFont(bytesFromDataUrl(regularFontUrl), { subset: true });
  const bold = await pdf.embedFont(bytesFromDataUrl(boldFontUrl), { subset: true });
  const logo = await pdf.embedPng(bytesFromDataUrl(invoiceLogoUrl));
  const dateText = new Date(document.placedAt).toLocaleString("en-IN");
  const gstin = clean(document.business.gstin) || clean(document.gstin);
  const disclaimer = document.taxAmount > 0
    ? `Amounts are ${document.gstIncluded ? "inclusive" : "exclusive"} of GST at ${document.gstRate}%. This is a computer generated invoice.`
    : "This order carries no GST charge. This is a computer generated invoice.";

  let page: PDFPage = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = 0;

  const drawOuterBorder = () => {
    page.drawRectangle({ x: 34, y: 34, width: PAGE_WIDTH - 68, height: PAGE_HEIGHT - 68, borderColor: BORDER, borderWidth: 0.8 });
  };
  const text = (value: string, x: number, size = 9, activeFont = font, color = INK) => {
    page.drawText(value, { x, y, size, font: activeFont, color });
  };
  const right = (value: string, xRight: number, size = 9, activeFont = font, color = INK) => {
    page.drawText(value, { x: xRight - activeFont.widthOfTextAtSize(value, size), y, size, font: activeFont, color });
  };
  const horizontal = (atY: number, thickness = 0.6, color = LIGHT_BORDER) => {
    page.drawLine({ start: { x: MARGIN, y: atY }, end: { x: CONTENT_RIGHT, y: atY }, thickness, color });
  };

  const drawHeader = (continued = false) => {
    const logoSize = 55;
    page.drawImage(logo, { x: MARGIN, y: PAGE_HEIGHT - MARGIN - logoSize, width: logoSize, height: logoSize });
    const detailsX = MARGIN + logoSize + 13;
    y = PAGE_HEIGHT - MARGIN - 5;
    text(document.business.legalName, detailsX, 15, bold);
    y -= 15;
    for (const addressLine of document.business.billingAddress.split("\n").map(clean).filter(Boolean).slice(0, 3)) {
      text(fitText(addressLine, font, 8.5, 280), detailsX, 8.5, font, MUTED);
      y -= 11;
    }
    text(`Phone ${BUSINESS.phone}  |  ${BUSINESS.site}`, detailsX, 8.5, font, MUTED);
    y = PAGE_HEIGHT - MARGIN - 2;
    right(continued ? "TAX INVOICE — CONTINUED" : "TAX INVOICE", CONTENT_RIGHT, continued ? 11 : 15, bold);
    y -= 18;
    right(`Invoice / Order No: ${document.humanId}`, CONTENT_RIGHT, 9, bold);
    y -= 14;
    right(dateText, CONTENT_RIGHT, 8.5, font, MUTED);
    if (gstin) {
      y -= 14;
      right(`GSTIN: ${gstin}`, CONTENT_RIGHT, 9, bold);
    }
    y = PAGE_HEIGHT - 119;
    horizontal(y);
  };

  const drawTableHeader = () => {
    const top = y;
    page.drawRectangle({ x: MARGIN, y: top - 23, width: CONTENT_RIGHT - MARGIN, height: 23, color: HEADER_FILL, borderColor: BORDER, borderWidth: 0.6 });
    y = top - 15;
    text("Item", MARGIN + 7, 8.5, bold);
    text("HSN", 324, 8.5, bold);
    right("Qty", 400, 8.5, bold);
    right("Rate", 474, 8.5, bold);
    right("Amount", CONTENT_RIGHT - 7, 8.5, bold);
    y = top - 23;
  };

  const newPage = (continued = false) => {
    page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    drawOuterBorder();
    drawHeader(continued);
    y = PAGE_HEIGHT - 136;
    if (continued) drawTableHeader();
  };

  const ensureItemSpace = () => {
    if (y >= 154) return;
    newPage(true);
  };

  drawOuterBorder();
  drawHeader();
  y = PAGE_HEIGHT - 140;
  text("BILL TO", MARGIN, 8, bold, MUTED);
  y -= 16;
  const recipientLines = billToLines(document.address, document.contactPhone);
  for (const [index, line] of (recipientLines.length ? recipientLines : ["Customer details not provided"]).entries()) {
    text(fitText(line, index === 0 ? bold : font, 9, 320), MARGIN, 9, index === 0 ? bold : font, index === 0 ? INK : MUTED);
    y -= 13;
  }
  y -= 8;
  drawTableHeader();

  let taxableTotal = 0;
  for (const [index, item] of document.items.entries()) {
    ensureItemSpace();
    const rowTop = y;
    const rowHeight = 27;
    if (index % 2 === 1) page.drawRectangle({ x: MARGIN, y: rowTop - rowHeight, width: CONTENT_RIGHT - MARGIN, height: rowHeight, color: STRIPE_FILL });
    const gross = item.price * item.qty;
    const taxable = document.gstRate > 0 && document.gstIncluded ? gross / (1 + document.gstRate / 100) : gross;
    taxableTotal += taxable;
    y = rowTop - 17;
    text(fitText(item.name, font, 8.5, 260), MARGIN + 7, 8.5);
    text(document.hsnById.get(String(item.productId)) ?? document.defaultHsn, 324, 8.5);
    right(String(item.qty), 400, 8.5);
    right(money(item.price), 474, 8.5);
    right(money(gross), CONTENT_RIGHT - 7, 8.5);
    horizontal(rowTop - rowHeight, 0.45);
    y = rowTop - rowHeight;
  }

  const summaryRows: [string, string][] = [
    ["Taxable value", money(taxableTotal)],
    ...(document.discount > 0 ? ([["Discount", `- ${money(document.discount)}`]] as [string, string][]) : []),
    ["Delivery", document.shippingFee === 0 ? "Free" : money(document.shippingFee)],
    ...(document.taxAmount > 0
      ? ([
          [`CGST @ ${document.gstRate / 2}%`, money(document.taxAmount / 2)],
          [`SGST @ ${document.gstRate / 2}%`, money(document.taxAmount / 2)],
        ] as [string, string][])
      : ([["GST", "Not applicable"]] as [string, string][])),
  ];
  const summaryHeight = summaryRows.length * 15 + 180;
  if (y < summaryHeight) newPage(false);
  y -= 16;
  for (const [label, value] of summaryRows) {
    right(label, 445, 9, font, MUTED);
    right(value, CONTENT_RIGHT - 7, 9);
    y -= 15;
  }
  horizontal(y + 5, 1, BORDER);
  y -= 9;
  right("TOTAL", 445, 12, bold);
  right(money(document.total), CONTENT_RIGHT - 7, 12, bold);

  const detailsY = y - 30;
  y = detailsY;
  text(`Payment: ${clean(document.paymentMethod) || "-"} (${document.paymentStatus})`, MARGIN, 8.5, font, MUTED);
  y -= 14;
  text(`Delivery: ${clean(document.shippingMethod) || "-"}`, MARGIN, 8.5, font, MUTED);

  const signatureY = detailsY - 30;
  page.drawLine({ start: { x: 404, y: signatureY }, end: { x: CONTENT_RIGHT, y: signatureY }, thickness: 0.7, color: INK });
  y = signatureY - 14;
  right("Authorized Signatory", CONTENT_RIGHT, 8.5, bold);

  const footerY = 51;
  page.drawRectangle({ x: MARGIN, y: footerY, width: CONTENT_RIGHT - MARGIN, height: 34, color: FOOTER_FILL, borderColor: LIGHT_BORDER, borderWidth: 0.5 });
  y = footerY + 13;
  text(fitText(disclaimer, font, 7.5, CONTENT_RIGHT - MARGIN - 16), MARGIN + 8, 7.5, font, MUTED);

  pdf.setTitle(`Tax Invoice ${document.humanId}`);
  pdf.setAuthor(document.business.legalName);
  pdf.setSubject("Tax Invoice");
  pdf.setCreator("Shaw Traders EV");
  return pdf.save();
}

export async function invoicePdfBase64(orderId: string): Promise<{ base64: string; fileName: string } | { error: string }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: order } = await supabaseAdmin
    .from("orders")
    .select(
      "id, human_id, placed_at, subtotal, shipping_fee, discount, total, tax_amount, gst_rate, gst_included, gstin, payment_method, payment_status, shipping_method, address, contact_phone, order_items(name_snapshot, qty, price_snapshot, product_id)",
    )
    .eq("id", orderId)
    .maybeSingle();
  if (!order) return { error: "Order not found" };

  const { data: settings } = await supabaseAdmin
    .from("shop_settings")
    .select("gstin, legal_name, billing_address, default_hsn")
    .maybeSingle();

  const source = order as Row;
  const sourceItems = (source["order_items"] ?? []) as Row[];
  const productIds = sourceItems.map((item) => clean(item["product_id"])).filter(Boolean);
  const hsnById = new Map<string, string>();
  if (productIds.length) {
    const { data: products } = await supabaseAdmin.from("products").select("id, hsn_code, sku").in("id", productIds);
    for (const product of products ?? []) hsnById.set(String(product.id), String(product.hsn_code ?? settings?.default_hsn ?? "8507"));
  }

  const document: InvoiceDocument = {
    humanId: clean(source["human_id"]),
    placedAt: clean(source["placed_at"]),
    subtotal: Number(source["subtotal"] ?? 0),
    shippingFee: Number(source["shipping_fee"] ?? 0),
    discount: Number(source["discount"] ?? 0),
    total: Number(source["total"] ?? 0),
    taxAmount: Number(source["tax_amount"] ?? 0),
    gstRate: Number(source["gst_rate"] ?? 0),
    gstIncluded: Boolean(source["gst_included"]),
    gstin: clean(source["gstin"]) || null,
    paymentMethod: clean(source["payment_method"]) || null,
    paymentStatus: clean(source["payment_status"]),
    shippingMethod: clean(source["shipping_method"]) || null,
    address: (source["address"] ?? {}) as Record<string, unknown>,
    contactPhone: clean(source["contact_phone"]) || null,
    items: sourceItems.map((item) => ({
      name: clean(item["name_snapshot"]),
      qty: Number(item["qty"] ?? 1),
      price: Number(item["price_snapshot"] ?? 0),
      productId: clean(item["product_id"]) || null,
    })),
    hsnById,
    defaultHsn: String(settings?.default_hsn ?? "8507"),
    business: {
      legalName: String(settings?.legal_name ?? BUSINESS.name),
      billingAddress: String(settings?.billing_address ?? BUSINESS.address),
      gstin: settings?.gstin ?? null,
    },
  };
  const bytes = await createInvoicePdf(document);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return { base64: btoa(binary), fileName: `Invoice-${document.humanId}.pdf` };
}