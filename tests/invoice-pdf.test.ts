import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { mkdir, writeFile } from "node:fs/promises";
import { billToLines, createInvoicePdf, type InvoiceDocument } from "@/lib/invoice.server";

async function saveQaPdf(name: string, bytes: Uint8Array) {
  const directory = process.env["INVOICE_QA_DIR"];
  if (!directory) return;
  await mkdir(directory, { recursive: true });
  await writeFile(`${directory}/${name}`, bytes);
}

function invoice(overrides: Partial<InvoiceDocument> = {}): InvoiceDocument {
  return {
    humanId: "CS-260925-1001",
    placedAt: "2026-09-25T12:00:00.000Z",
    subtotal: 10169.49,
    shippingFee: 0,
    discount: 0,
    total: 12000,
    taxAmount: 1830.51,
    gstRate: 18,
    gstIncluded: true,
    gstin: "19ABCDE1234F1Z5",
    paymentMethod: "Offline credit",
    paymentStatus: "cod_pending",
    shippingMethod: "In-house counter sale",
    address: { name: "Test Customer", state: "West Bengal", pincode: "713403", phone: "9876543210" },
    contactPhone: "9876543210",
    items: [{ name: "EV Battery Pack", qty: 1, price: 12000, productId: "battery" }],
    hsnById: new Map([["battery", "8507"]]),
    defaultHsn: "8507",
    business: {
      legalName: "Shaw Traders EV",
      billingAddress: "Defence Colony, Bud Bud\nBardhaman, West Bengal 713403",
      gstin: "19ABCDE1234F1Z5",
    },
    ...overrides,
  };
}

describe("invoice PDF", () => {
  it("does not manufacture punctuation for incomplete billing addresses", () => {
    expect(billToLines({ name: "Customer", city: "", state: "", pincode: "" }, null)).toEqual(["Customer"]);
    expect(billToLines({ state: "West Bengal", pincode: "713403" }, null)).toEqual(["West Bengal - 713403"]);
  });

  it("creates a valid one-page GST invoice", async () => {
    const bytes = await createInvoicePdf(invoice());
    await saveQaPdf("gst-invoice.pdf", bytes);
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBe(1);
    expect(pdf.getTitle()).toBe("Tax Invoice CS-260925-1001");
  });

  it("paginates long item lists instead of dropping rows", async () => {
    const items = Array.from({ length: 55 }, (_, index) => ({
      name: `Workshop component ${index + 1}`,
      qty: index + 1,
      price: 125.5,
      productId: `product-${index + 1}`,
    }));
    const bytes = await createInvoicePdf(invoice({ items, taxAmount: 0, gstRate: 0, gstIncluded: false }));
    await saveQaPdf("long-non-gst-invoice.pdf", bytes);
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBeGreaterThan(1);
    expect(pdf.getPageCount()).toBeLessThan(6);
  });
});