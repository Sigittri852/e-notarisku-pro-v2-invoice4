import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Invoice } from "@/lib/invoice";

const listInvoices = vi.fn<() => Promise<Invoice[]>>();

vi.mock("@/lib/invoice-store", () => ({
  listInvoices: () => listInvoices(),
  saveInvoices: vi.fn(),
  getInvoice: vi.fn(),
}));

const route = await import("@/app/api/invoices/next-number/route");

const withNomor = (nomor: unknown) => ({ nomor }) as unknown as Invoice;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-03-15T10:00:00.000Z"));
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe("GET /api/invoices/next-number", () => {
  it("starts at 0001 when there is no invoice for the current month", async () => {
    listInvoices.mockResolvedValue([withNomor("INV-202602-0009")]);
    await expect((await route.GET()).json()).resolves.toEqual({ nomor: "INV-202603-0001" });
  });

  it("pads the month to two digits", async () => {
    vi.setSystemTime(new Date("2026-09-01T00:00:00.000Z"));
    listInvoices.mockResolvedValue([]);
    await expect((await route.GET()).json()).resolves.toEqual({ nomor: "INV-202609-0001" });
  });

  it("increments past the highest existing sequence of the month", async () => {
    listInvoices.mockResolvedValue([withNomor("INV-202603-0003"), withNomor("INV-202603-0011"), withNomor("INV-202603-0007")]);
    await expect((await route.GET()).json()).resolves.toEqual({ nomor: "INV-202603-0012" });
  });

  it("ignores entries whose nomor is not a parseable string", async () => {
    listInvoices.mockResolvedValue([withNomor(undefined), withNomor(42), withNomor("INV-202603-oops"), withNomor("INV-202603-0004")]);
    await expect((await route.GET()).json()).resolves.toEqual({ nomor: "INV-202603-0005" });
  });

  it("falls back to the first number of the month with status 500 when the store fails", async () => {
    listInvoices.mockRejectedValue(new Error("db down"));
    const res = await route.GET();
    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toEqual({ error: "Gagal membuat nomor invoice", nomor: "INV-202603-0001" });
  });
});
