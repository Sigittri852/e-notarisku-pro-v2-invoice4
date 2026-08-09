import { PrismaClient } from "@prisma/client";
import type { Invoice, InvoiceItem } from "./invoice";
import { AppError } from "./errors";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

const prisma =
  globalForPrisma.prisma ??
  new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

function fromDb(row: any): Invoice {
  let items: InvoiceItem[] = [];

  try {
    const parsed = JSON.parse(row.items || "[]");
    if (!Array.isArray(parsed)) throw new Error("items bukan array");
    items = parsed;
  } catch (error) {
    console.error(`INVOICE ITEMS PARSE ERROR (id=${row.id}):`, error);
    throw new AppError(
      `Rincian item invoice ${row.nomor || row.id} rusak dan tidak dapat dibaca.`,
      500,
    );
  }

  return {
    id: row.id,
    nomor: row.nomor,
    tanggal: row.tanggal,
    jatuhTempo: row.jatuhTempo,
    aktaId: row.aktaId || undefined,
    nomorAkta: row.nomorAkta || undefined,
    jenisAkta: row.jenisAkta || undefined,
    kategori: row.kategori || undefined,
    namaNotaris: row.namaNotaris || undefined,
    pelanggan: row.pelanggan,
    alamat: row.alamat || undefined,
    nik: row.nik || undefined,
    items,
    nilaiTransaksi: Number(row.nilaiTransaksi || 0),
    njop: Number(row.njop || 0),
    sspPph: Number(row.sspPph || 0),
    sspdBphtb: Number(row.sspdBphtb || 0),
    diskon: Number(row.diskon || 0),
    ppnPersen: Number(row.ppnPersen || 0),
    ppn: Number(row.ppn || 0),
    status:
      row.status === "Lunas" || row.status === "Sebagian"
        ? row.status
        : "Belum Lunas",
    catatan: row.catatan || undefined,
    metodePembayaran: row.metodePembayaran || undefined,
    createdAt: row.createdAt,
  };
}

function toDb(invoice: Invoice) {
  return {
    id: invoice.id,
    nomor: invoice.nomor,
    tanggal: invoice.tanggal,
    jatuhTempo: invoice.jatuhTempo,
    aktaId: invoice.aktaId || null,
    nomorAkta: invoice.nomorAkta || null,
    jenisAkta: invoice.jenisAkta || null,
    kategori: invoice.kategori || null,
    namaNotaris: invoice.namaNotaris || null,
    pelanggan: invoice.pelanggan,
    alamat: invoice.alamat || null,
    nik: invoice.nik || null,
    items: JSON.stringify(invoice.items || []),
    nilaiTransaksi: Number(invoice.nilaiTransaksi || 0),
    njop: Number(invoice.njop || 0),
    sspPph: Number(invoice.sspPph || 0),
    sspdBphtb: Number(invoice.sspdBphtb || 0),
    diskon: Number(invoice.diskon || 0),
    ppnPersen: Number(invoice.ppnPersen || 0),
    ppn: Number(invoice.ppn || 0),
    status: invoice.status || "Belum Lunas",
    catatan: invoice.catatan || null,
    metodePembayaran: invoice.metodePembayaran || null,
    createdAt: invoice.createdAt || new Date().toISOString(),
  };
}

export async function listInvoices(): Promise<Invoice[]> {
  const rows = await prisma.invoice.findMany({
    orderBy: {
      createdAt: "desc",
    },
  });

  return rows.map(fromDb);
}

export async function saveInvoices(data: Invoice[]) {
  await prisma.$transaction(async (tx) => {
    const existing = await tx.invoice.findMany();

    const incomingIds = new Set(data.map((x) => x.id));

    for (const row of existing) {
      if (!incomingIds.has(row.id)) {
        await tx.invoice.delete({
          where: { id: row.id },
        });
      }
    }

    for (const invoice of data) {
      const db = toDb(invoice);

      await tx.invoice.upsert({
        where: {
          id: db.id,
        },
        create: db,
        update: db,
      });
    }
  });
}

export async function getInvoice(id: string) {
  const row = await prisma.invoice.findUnique({
    where: { id },
  });

  return row ? fromDb(row) : undefined;
}
