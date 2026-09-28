import { BUSINESS, formatINR } from "@/lib/catalog";
import type { ManageOrder } from "@/lib/manage-data.functions";

export function customerWhatsApp(order: ManageOrder) {
  const digits = String(order.address['phone'] ?? "").replace(/\D/g, "").slice(-10);
  const text = `Hello ${String(order.address['name'] ?? "")}, this is ${BUSINESS.name} about your order ${order.humanId}.`;
  return `https://wa.me/91${digits}?text=${encodeURIComponent(text)}`;
}

export function deliveryMapUrl(address: Record<string, string>) {
  const latitude = Number(address['latitude']);
  const longitude = Number(address['longitude']);
  return Number.isFinite(latitude) && Number.isFinite(longitude)
    ? `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`
    : null;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[character] ?? character);
}

export function printPackingSlip(order: ManageOrder) {
  const address = order.address as Record<string, unknown>;
  const rows = order.items.map((item) => `<tr><td>${item.image ? `<img src="${escapeHtml(item.image)}" width="56" height="56" alt="" style="width:56px;height:56px;object-fit:cover;border-radius:6px;float:left;margin-right:8px"/>` : ""}${escapeHtml(item.name)}${item.rackLocation ? `<br/><span class="muted">Shelf: ${escapeHtml(item.rackLocation)}</span>` : ""}</td><td style="text-align:center">${item.qty}</td><td style="text-align:right">${item.price === null ? "-" : formatINR(item.price * item.qty)}</td></tr>`).join("");
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(order.humanId)}</title><style>body{font-family:system-ui,sans-serif;margin:24px;color:#111}h1{font-size:20px;margin:0}table{width:100%;border-collapse:collapse;margin-top:16px;font-size:14px}th,td{border-bottom:1px solid #ddd;padding:8px 6px;text-align:left}.muted{color:#555;font-size:13px}.box{border:1px solid #ddd;border-radius:8px;padding:12px;margin-top:16px}@media print{button{display:none}}</style></head><body><h1>${escapeHtml(BUSINESS.name)}</h1><p class="muted">${escapeHtml(BUSINESS.address)}<br/>${escapeHtml(BUSINESS.phone)}</p><h2 style="font-size:16px">Packing slip · ${escapeHtml(order.humanId)}</h2><p class="muted">${new Date(order.placedAt).toLocaleString("en-IN")} · ${escapeHtml(order.paymentMethod ?? "")} · ${escapeHtml(order.paymentStatus)}</p><div class="box"><strong>Deliver to</strong><br/>${escapeHtml(String(address['name'] ?? ""))}<br/>${escapeHtml(String(address['line1'] ?? ""))}${address['landmark'] ? `, ${escapeHtml(String(address['landmark']))}` : ""}<br/>${escapeHtml(String(address['city'] ?? ""))}, ${escapeHtml(String(address['state'] ?? ""))} – ${escapeHtml(String(address['pincode'] ?? ""))}<br/>${escapeHtml(String(address['phone'] ?? ""))}</div><table><thead><tr><th>Item</th><th style="text-align:center">Qty</th><th style="text-align:right">Amount</th></tr></thead><tbody>${rows}</tbody></table><p style="text-align:right;font-weight:700;margin-top:12px">Total ${formatINR(order.total)}</p><p class="muted">${escapeHtml(order.shippingMethod ?? "")}</p><button onclick="window.print()">Print</button></body></html>`;
  const popup = window.open("", "_blank", "width=800,height=900");
  if (!popup) return false;
  popup.document.write(html);
  popup.document.close();
  popup.focus();
  setTimeout(() => popup.print(), 300);
  return true;
}

export function downloadPdf(base64: string, fileName: string) {
  const bytes = Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}