import { describe, expect, it } from "vitest";
import { invoicePpn, invoiceSubtotal, invoiceTotal } from "@/lib/invoice";

const base = {
  items: [
    { description: "Jasa akta", qty: 2, price: 500_000 },
    { description: "Materai", qty: 3, price: 10_000 },
  ],
  sspPph: 0,
  sspdBphtb: 0,
  diskon: 0,
  ppn: 0,
  ppnPersen: 0,
};

describe("invoiceSubtotal", () => {
  it("sums qty * price for every item", () => {
    expect(invoiceSubtotal(base)).toBe(1_030_000);
  });

  it("adds pajak akta (sspPph and sspdBphtb) to the item total", () => {
    expect(invoiceSubtotal({ ...base, sspPph: 100_000, sspdBphtb: 250_000 })).toBe(1_380_000);
  });

  it("returns 0 when there are no items and no pajak", () => {
    expect(invoiceSubtotal({ items: [], sspPph: 0, sspdBphtb: 0 })).toBe(0);
  });

  it("treats non-numeric qty, price and pajak as 0", () => {
    const invoice = {
      items: [
        { description: "rusak", qty: "abc", price: 100 },
        { description: "ok", qty: 1, price: "200" },
      ],
      sspPph: undefined,
      sspdBphtb: null,
    } as unknown as Parameters<typeof invoiceSubtotal>[0];
    expect(invoiceSubtotal(invoice)).toBe(200);
  });

  it("accepts numeric strings for qty and price", () => {
    const invoice = {
      items: [{ description: "ok", qty: "2", price: "1500" }],
      sspPph: 0,
      sspdBphtb: 0,
    } as unknown as Parameters<typeof invoiceSubtotal>[0];
    expect(invoiceSubtotal(invoice)).toBe(3000);
  });
});

describe("invoicePpn", () => {
  it("derives the nominal from ppnPersen when it is positive", () => {
    expect(invoicePpn({ ...base, ppnPersen: 11, ppn: 999 })).toBe(113_300);
  });

  it("rounds the derived nominal to the nearest rupiah", () => {
    const invoice = { items: [{ description: "x", qty: 1, price: 1005 }], sspPph: 0, sspdBphtb: 0, ppnPersen: 11, ppn: 0 };
    expect(invoicePpn(invoice)).toBe(111);
  });

  it("falls back to the stored ppn nominal when ppnPersen is missing or zero", () => {
    expect(invoicePpn({ ...base, ppnPersen: 0, ppn: 50_000 })).toBe(50_000);
    expect(invoicePpn({ ...base, ppnPersen: undefined, ppn: 50_000 })).toBe(50_000);
  });

  it("ignores a negative ppnPersen and uses the stored nominal", () => {
    expect(invoicePpn({ ...base, ppnPersen: -11, ppn: 7_000 })).toBe(7_000);
  });

  it("returns 0 when neither ppnPersen nor ppn is set", () => {
    expect(invoicePpn({ items: [], sspPph: 0, sspdBphtb: 0, ppn: 0 })).toBe(0);
  });
});

describe("invoiceTotal", () => {
  it("adds ppn after subtracting diskon from the subtotal", () => {
    expect(invoiceTotal({ ...base, diskon: 30_000, ppn: 100_000 })).toBe(1_100_000);
  });

  it("computes ppn from the pre-diskon subtotal", () => {
    expect(invoiceTotal({ ...base, diskon: 1_000_000, ppnPersen: 11 })).toBe(30_000 + 113_300);
  });

  it("never lets diskon push the taxable base below zero", () => {
    expect(invoiceTotal({ ...base, diskon: 5_000_000, ppn: 25_000 })).toBe(25_000);
  });

  it("includes pajak akta in the total", () => {
    expect(invoiceTotal({ ...base, sspPph: 100_000, sspdBphtb: 200_000, diskon: 0, ppn: 0 })).toBe(1_330_000);
  });

  it("returns 0 for an empty invoice", () => {
    expect(invoiceTotal({ items: [], sspPph: 0, sspdBphtb: 0, diskon: 0, ppn: 0 })).toBe(0);
  });
});
