import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Invoice } from "@/lib/invoice";

type Row = Record<string, unknown> & { id: string };

const db = {
  rows: [] as Row[],
  deleted: [] as string[],
  upserts: [] as { where: { id: string }; create: Row; update: Row }[],
};

const invoiceDelegate = {
  findMany: vi.fn(async () => db.rows),
  findUnique: vi.fn(async ({ where }: { where: { id: string } }) => db.rows.find((r) => r.id === where.id) ?? null),
  delete: vi.fn(async ({ where }: { where: { id: string } }) => {
    db.deleted.push(where.id);
  }),
  upsert: vi.fn(async (args: { where: { id: string }; create: Row; update: Row }) => {
    db.upserts.push(args);
  }),
};

vi.mock("@prisma/client", () => ({
  PrismaClient: class {
    invoice = invoiceDelegate;
    $transaction = async (cb: (tx: { invoice: typeof invoiceDelegate }) => Promise<void>) => cb({ invoice: invoiceDelegate });
  },
}));

const store = await import("@/lib/invoice-store");

const row = (over: Partial<Row> = {}): Row => ({
  id: "inv-1",
  nomor: "INV-202603-0001",
  tanggal: "2026-03-01",
  jatuhTempo: "2026-03-15",
  aktaId: null,
  nomorAkta: null,
  jenisAkta: null,
  kategori: null,
  namaNotaris: null,
  pelanggan: "Budi",
  alamat: null,
  nik: null,
  items: JSON.stringify([{ description: "Jasa akta", qty: 1, price: 1_000_000 }]),
  nilaiTransaksi: null,
  njop: null,
  sspPph: null,
  sspdBphtb: null,
  diskon: null,
  ppnPersen: null,
  ppn: null,
  status: "Belum Lunas",
  catatan: null,
  metodePembayaran: null,
  createdAt: "2026-03-01T00:00:00.000Z",
  ...over,
});

/** Shape produced by the store when reading the row above. */
const mappedRow = (over: Partial<Invoice> = {}): Invoice =>
  invoice({ nilaiTransaksi: 0, njop: 0, sspPph: 0, sspdBphtb: 0, ppnPersen: 0, ...over });

const invoice = (over: Partial<Invoice> = {}): Invoice => ({
  id: "inv-1",
  nomor: "INV-202603-0001",
  tanggal: "2026-03-01",
  jatuhTempo: "2026-03-15",
  pelanggan: "Budi",
  items: [{ description: "Jasa akta", qty: 1, price: 1_000_000 }],
  diskon: 0,
  ppn: 0,
  status: "Belum Lunas",
  createdAt: "2026-03-01T00:00:00.000Z",
  ...over,
});

beforeEach(() => {
  db.rows = [];
  db.deleted = [];
  db.upserts = [];
});

afterEach(() => vi.clearAllMocks());

describe("listInvoices", () => {
  it("returns the newest invoices first", async () => {
    db.rows = [row()];
    await expect(store.listInvoices()).resolves.toEqual([mappedRow()]);
    expect(invoiceDelegate.findMany).toHaveBeenCalledWith({ orderBy: { createdAt: "desc" } });
  });

  it("maps null columns to undefined and null amounts to 0", async () => {
    db.rows = [row()];
    const [mapped] = await store.listInvoices();

    expect(mapped.aktaId).toBeUndefined();
    expect(mapped.alamat).toBeUndefined();
    expect(mapped.metodePembayaran).toBeUndefined();
    expect([mapped.nilaiTransaksi, mapped.njop, mapped.sspPph, mapped.sspdBphtb, mapped.diskon, mapped.ppnPersen, mapped.ppn]).toEqual([
      0, 0, 0, 0, 0, 0, 0,
    ]);
  });

  it("parses the items JSON column", async () => {
    db.rows = [row({ items: JSON.stringify([{ description: "A", qty: 2, price: 3 }]) })];
    const [mapped] = await store.listInvoices();
    expect(mapped.items).toEqual([{ description: "A", qty: 2, price: 3 }]);
  });

  it("falls back to an empty items list for malformed or empty JSON", async () => {
    db.rows = [row({ id: "a", items: "{rusak" }), row({ id: "b", items: null })];
    const mapped = await store.listInvoices();
    expect(mapped.map((x) => x.items)).toEqual([[], []]);
  });

  it("keeps only the known payment statuses", async () => {
    db.rows = [row({ id: "a", status: "Lunas" }), row({ id: "b", status: "Sebagian" }), row({ id: "c", status: "Ngawur" })];
    const mapped = await store.listInvoices();
    expect(mapped.map((x) => x.status)).toEqual(["Lunas", "Sebagian", "Belum Lunas"]);
  });
});

describe("getInvoice", () => {
  it("maps the matching row", async () => {
    db.rows = [row()];
    await expect(store.getInvoice("inv-1")).resolves.toEqual(mappedRow());
    expect(invoiceDelegate.findUnique).toHaveBeenCalledWith({ where: { id: "inv-1" } });
  });

  it("resolves to undefined when there is no such row", async () => {
    await expect(store.getInvoice("hilang")).resolves.toBeUndefined();
  });
});

describe("saveInvoices", () => {
  it("upserts every incoming invoice with the items serialized to JSON", async () => {
    await store.saveInvoices([invoice({ id: "inv-2", nomor: "INV-202603-0002" })]);

    expect(db.upserts).toHaveLength(1);
    const { where, create, update } = db.upserts[0];
    expect(where).toEqual({ id: "inv-2" });
    expect(create).toBe(update);
    expect(create.items).toBe(JSON.stringify([{ description: "Jasa akta", qty: 1, price: 1_000_000 }]));
    expect(create.nomor).toBe("INV-202603-0002");
  });

  it("deletes stored invoices that are missing from the incoming list", async () => {
    db.rows = [row({ id: "keep" }), row({ id: "drop" })];
    await store.saveInvoices([invoice({ id: "keep" })]);
    expect(db.deleted).toEqual(["drop"]);
  });

  it("writes null for empty optional text columns and 0 for missing amounts", async () => {
    await store.saveInvoices([invoice({ aktaId: "", alamat: undefined, nilaiTransaksi: undefined })]);

    const { create } = db.upserts[0];
    expect(create.aktaId).toBeNull();
    expect(create.alamat).toBeNull();
    expect(create.nilaiTransaksi).toBe(0);
  });

  it("defaults status and createdAt when they are missing", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-15T10:00:00.000Z"));

    await store.saveInvoices([invoice({ status: undefined as unknown as Invoice["status"], createdAt: "" })]);

    expect(db.upserts[0].create.status).toBe("Belum Lunas");
    expect(db.upserts[0].create.createdAt).toBe("2026-03-15T10:00:00.000Z");
    vi.useRealTimers();
  });

  it("serializes a missing items list as an empty JSON array", async () => {
    await store.saveInvoices([invoice({ items: undefined as unknown as Invoice["items"] })]);
    expect(db.upserts[0].create.items).toBe("[]");
  });
});
