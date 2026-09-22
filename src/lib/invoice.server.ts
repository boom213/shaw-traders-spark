/** GST invoice PDF, built with pdf-lib (pure JS, runs in the edge runtime). */
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { BUSINESS } from "@/lib/catalog";

type Row = Record<string, any>;

const money = (n: number) => `Rs ${(Math.round((Number(n) || 0) * 100) / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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

  const items = ((order as Row)['order_items'] ?? []) as Row[];
  const productIds = items.map((i) => i['product_id']).filter(Boolean) as string[];
  const hsnById = new Map<string, string>();
  if (productIds.length) {
    const { data: prods } = await supabaseAdmin.from("products").select("id, hsn_code, sku").in("id", productIds);
    for (const p of prods ?? []) hsnById.set(String(p.id), String(p.hsn_code ?? settings?.default_hsn ?? "8507"));
  }
  const defaultHsn = String(settings?.default_hsn ?? "8507");

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]); // A4
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const ink = rgb(0.1, 0.11, 0.13);
  const muted = rgb(0.42, 0.45, 0.5);
  let y = 800;

  const text = (s: string, x: number, size = 9.5, f = font, color = ink) => {
    page.drawText(s, { x, y, size, font: f, color });
  };
  const right = (s: string, xRight: number, size = 9.5, f = font, color = ink) => {
    page.drawText(s, { x: xRight - f.widthOfTextAtSize(s, size), y, size, font: f, color });
  };
  const line = () => {
    page.drawLine({ start: { x: 40, y: y + 8 }, end: { x: 555, y: y + 8 }, thickness: 0.6, color: rgb(0.85, 0.87, 0.9) });
  };

  text(String(settings?.legal_name ?? BUSINESS.name), 40, 16, bold);
  right("TAX INVOICE", 555, 14, bold);
  y -= 16;
  for (const l of String(settings?.billing_address ?? BUSINESS.address).split("\n").slice(0, 3)) {
    text(l, 40, 9, font, muted);
    y -= 12;
  }
  text(`Phone ${BUSINESS.phone}  ·  ${BUSINESS.site}`, 40, 9, font, muted);
  y -= 12;
  if (settings?.gstin || (order as Row)['gstin']) {
    text(`GSTIN: ${settings?.gstin ?? (order as Row)['gstin']}`, 40, 9, bold);
    y -= 12;
  }

  y -= 8;
  line();
  y -= 16;
  const o = order as Row;
  text(`Invoice / Order No: ${o['human_id']}`, 40, 10, bold);
  right(new Date(o['placed_at']).toLocaleString("en-IN"), 555, 9, font, muted);
  y -= 16;

  const a = (o['address'] ?? {}) as Record<string, string>;
  text("Bill to", 40, 9, bold);
  y -= 13;
  for (const l of [
    a['name'] ?? "",
    a['line1'] ?? "",
    a['landmark'] ?? "",
    `${a['city'] ?? ""}, ${a['state'] ?? ""} - ${a['pincode'] ?? ""}`,
    `Phone: ${o['contact_phone'] ?? a['phone'] ?? ""}`,
  ].filter(Boolean)) {
    text(l, 40, 9, font, muted);
    y -= 12;
  }

  y -= 10;
  line();
  y -= 14;
  text("Item", 40, 9, bold);
  text("HSN", 300, 9, bold);
  text("Qty", 355, 9, bold);
  right("Rate", 470, 9, bold);
  right("Amount", 555, 9, bold);
  y -= 6;
  line();
  y -= 14;

  const rate = Number(o['gst_rate'] ?? 0);
  const inclusive = Boolean(o['gst_included']);
  let taxableTotal = 0;

  for (const i of items) {
    const qty = Number(i['qty'] ?? 1);
    const price = Number(i['price_snapshot'] ?? 0);
    const gross = price * qty;
    const taxable = rate > 0 && inclusive ? gross / (1 + rate / 100) : gross;
    taxableTotal += taxable;
    const name = String(i['name_snapshot']).slice(0, 48);
    text(name, 40, 9);
    text(hsnById.get(String(i['product_id'])) ?? defaultHsn, 300, 9);
    text(String(qty), 355, 9);
    right(money(price), 470, 9);
    right(money(gross), 555, 9);
    y -= 15;
    if (y < 180) break;
  }

  y -= 4;
  line();
  y -= 16;

  const tax = Number(o['tax_amount'] ?? 0);
  const rows: [string, string][] = [
    ["Taxable value", money(taxableTotal)],
    ...(Number(o['discount']) > 0 ? ([["Discount", `- ${money(o['discount'])}`]] as [string, string][]) : []),
    ["Delivery", Number(o['shipping_fee']) === 0 ? "Free" : money(o['shipping_fee'])],
    ...(tax > 0
      ? ([
          [`CGST @ ${rate / 2}%`, money(tax / 2)],
          [`SGST @ ${rate / 2}%`, money(tax / 2)],
        ] as [string, string][])
      : ([["GST", "Not applicable"]] as [string, string][])),
  ];
  for (const [label, value] of rows) {
    right(label, 470, 9, font, muted);
    right(value, 555, 9);
    y -= 14;
  }
  y -= 2;
  right("Total", 470, 11, bold);
  right(money(o['total']), 555, 11, bold);
  y -= 20;
  text(`Payment: ${o['payment_method'] ?? "-"} (${o['payment_status']})`, 40, 9, font, muted);
  y -= 12;
  text(`Delivery: ${o['shipping_method'] ?? "-"}`, 40, 9, font, muted);
  y -= 24;
  text(
    tax > 0
      ? `Amounts are ${inclusive ? "inclusive" : "exclusive"} of GST at ${rate}%. This is a computer generated invoice.`
      : "This order carries no GST charge. This is a computer generated invoice.",
    40,
    8,
    font,
    muted,
  );

  const bytes = await pdf.save();
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return { base64: btoa(binary), fileName: `Invoice-${o['human_id']}.pdf` };
}
