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

  it("creates a legally distinct proforma invoice without changing the tax invoice default", async () => {
    const bytes = await createInvoicePdf(invoice({
      docType: "proforma",
      humanId: "QT-260930-1001",
      validUntil: "2026-10-31T18:29:59.000Z",
      paymentMethod: null,
      paymentStatus: "",
      shippingMethod: null,
    }));
    await saveQaPdf("proforma-gst-invoice.pdf", bytes);
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getTitle()).toBe("Proforma Invoice QT-260930-1001");
    expect(pdf.getSubject()).toBe("Proforma Invoice — Not a Tax Invoice");
    expect(pdf.getPageCount()).toBe(1);
  });

  it("creates a no-GST proforma invoice", async () => {
    const bytes = await createInvoicePdf(invoice({
      docType: "proforma",
      humanId: "QT-260930-1002",
      gstRate: 0,
      gstIncluded: false,
      taxAmount: 0,
      subtotal: 12000,
      total: 12000,
      validUntil: "2026-10-31T18:29:59.000Z",
    }));
    await saveQaPdf("proforma-no-gst-invoice.pdf", bytes);
    expect((await PDFDocument.load(bytes)).getTitle()).toBe("Proforma Invoice QT-260930-1002");
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

  it("keeps a long legal name inside a valid customer invoice", async () => {
    const bytes = await createInvoicePdf(invoice({ business: { legalName: "Shaw Traders Electric Mobility Components and Vehicles Private Limited", billingAddress: "Defence Colony, Bud Bud\nBardhaman, West Bengal 713403", gstin: "19ABCDE1234F1Z5" } }));
    await saveQaPdf("long-legal-name-invoice.pdf", bytes);
    expect((await PDFDocument.load(bytes)).getPageCount()).toBe(1);
  });

  it("keeps a long billing address out of the invoice details block", async () => {
    const bytes = await createInvoicePdf(invoice({
      humanId: "CS-260926-1093",
      business: {
        legalName: "Shaw Traders EV",
        billingAddress: "CG2W+WGV, near Debi Radha Marriage Hall, Budbud, West Bengal 713403",
        gstin: "19ABCDE1234F1Z5",
      },
    }));
    await saveQaPdf("long-billing-address-invoice.pdf", bytes);
    expect((await PDFDocument.load(bytes)).getPageCount()).toBe(1);
  });

  it("keeps a six-figure total separate from its label", async () => {
    const bytes = await createInvoicePdf(invoice({
      subtotal: 84_745.76,
      total: 100_000,
      taxAmount: 15_254.24,
      items: [{ name: "Electric scooter", qty: 1, price: 100_000, productId: "scooter" }],
    }));
    await saveQaPdf("six-figure-total-invoice.pdf", bytes);
    expect((await PDFDocument.load(bytes)).getPageCount()).toBe(1);
  });

  it("creates a paginated internal staff copy and ignores broken thumbnails", async () => {
    const items = Array.from({ length: 32 }, (_, index) => ({
      name: `Workshop component with a long product description ${index + 1}`,
      qty: index + 1,
      price: 125.5,
      productId: `product-${index + 1}`,
      rackLocation: index % 2 ? null : `Rack A-${index + 1}`,
      image: index === 0
        ? "https://invalid.invalid/missing.jpg"
        : index === 1
          ? "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2n6QAAAAASUVORK5CYII="
          : null,
    }));
    const bytes = await createInvoicePdf(invoice({ staffCopy: true, items }));
    await saveQaPdf("staff-invoice.pdf", bytes);
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getSubject()).toBe("Staff Invoice — Internal Use Only");
    expect(pdf.getPageCount()).toBeGreaterThan(1);
  });

  it("converts WebP product photos for a staff copy", async () => {
    const webp = "data:image/webp;base64,UklGRjwAAABXRUJQVlA4IDAAAAAwAgCdASoIAAYAAUAmJaACdLoB+AH4AAToAAD+rhf/TRRhTH3Jv/uDfZFz/zQAAAA=";
    const bytes = await createInvoicePdf(invoice({
      staffCopy: true,
      items: [{ name: "Uploaded WebP product", qty: 1, price: 12000, productId: "battery", image: webp, rackLocation: "Rack A-1" }],
    }));
    await saveQaPdf("staff-invoice-webp.pdf", bytes);
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getSubject()).toBe("Staff Invoice — Internal Use Only");
    expect(pdf.getPageCount()).toBe(1);
  });

  it("uses the current catalogue photo when an order photo snapshot is broken", async () => {
    const png = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2n6QAAAAASUVORK5CYII=";
    const bytes = await createInvoicePdf(invoice({
      staffCopy: true,
      items: [{
        name: "Product with a replaced photo",
        qty: 1,
        price: 12000,
        productId: "battery",
        image: "https://invalid.invalid/old-order-photo.webp",
        fallbackImage: png,
      }],
    }));
    await saveQaPdf("staff-invoice-photo-fallback.pdf", bytes);
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getSubject()).toBe("Staff Invoice — Internal Use Only");
    expect(pdf.getPageCount()).toBe(1);
  });
});