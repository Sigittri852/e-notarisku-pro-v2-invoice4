import type { Akta, Dokumen, Kategori, PihakAkta, StatusAkta, TandaTanganDigital } from "./types";
import { AppError } from "./errors";
import { prisma } from "./prisma";

/**
 * Data akta disimpan di PostgreSQL (Prisma). Filesystem Vercel bersifat
 * ephemeral, sehingga penyimpanan berbasis berkas JSON akan hilang setiap
 * deploy — termasuk scan identitas yang sudah diupload.
 */

function parseJson<T>(raw: string | null | undefined, fallback: T, label: string, id: string): T {
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(fallback) && !Array.isArray(parsed)) throw new Error("bukan array");
    return parsed as T;
  } catch (error) {
    console.error(`AKTA ${label} PARSE ERROR (id=${id}):`, error);
    throw new AppError(`Data ${label} pada akta ${id} rusak dan tidak dapat dibaca.`, 500);
  }
}

function fromDb(row: any): Akta {
  return {
    id: row.id,
    nomorAkta: row.nomorAkta || "",
    tanggal: row.tanggal || "",
    kategori: (row.kategori === "PPAT" ? "PPAT" : "NOTARIS") as Kategori,
    jenisAkta: row.jenisAkta || "",
    namaNotaris: row.namaNotaris || "",
    pihak: parseJson<PihakAkta[]>(row.pihakJson, [], "pihak", row.id),
    namaPihak: row.namaPihak || "",
    nik: row.nik || "",
    npwp: row.npwp || "",
    alamat: row.alamat || "",
    nomorSertifikat: row.nomorSertifikat || "",
    jenisHak: row.jenisHak || "",
    luasTanah: row.luasTanah || "",
    nilaiTransaksi: Number(row.nilaiTransaksi || 0),
    nopPbb: row.nopPbb || "",
    njop: Number(row.njop || 0),
    tanggalSsp: row.tanggalSsp || "",
    sspPph: Number(row.sspPph || 0),
    tanggalBphtb: row.tanggalBphtb || "",
    bphtb: Number(row.bphtb || 0),
    honorarium: Number(row.honorarium || 0),
    status: (row.status || "Draft") as StatusAkta,
    catatan: row.catatan || "",
    detail: parseJson<Record<string, string>>(row.detailJson, {}, "detail", row.id),
    dokumen: parseJson<Dokumen[]>(row.dokumenJson, [], "dokumen", row.id),
    fotoTtdKlien: parseJson<Dokumen[]>(row.fotoTtdKlienJson, [], "foto ttd klien", row.id),
    fotoTtdNotaris: parseJson<Dokumen[]>(row.fotoTtdNotarisJson, [], "foto ttd notaris", row.id),
    minuta: parseJson<Dokumen[]>(row.minutaJson, [], "minuta", row.id),
    tandaTanganDigital: parseJson<TandaTanganDigital[]>(
      row.tandaTanganDigitalJson,
      [],
      "tanda tangan digital",
      row.id,
    ),
  };
}

function toDb(akta: Akta) {
  return {
    id: akta.id,
    nomorAkta: akta.nomorAkta || "",
    tanggal: akta.tanggal || "",
    kategori: akta.kategori,
    jenisAkta: akta.jenisAkta || "",
    namaNotaris: akta.namaNotaris || "",
    namaPihak: akta.namaPihak || "",
    nik: akta.nik || null,
    npwp: akta.npwp || null,
    alamat: akta.alamat || null,
    nomorSertifikat: akta.nomorSertifikat || null,
    jenisHak: akta.jenisHak || null,
    luasTanah: akta.luasTanah || null,
    nilaiTransaksi: Number(akta.nilaiTransaksi || 0),
    nopPbb: akta.nopPbb || null,
    njop: Number(akta.njop || 0),
    tanggalSsp: akta.tanggalSsp || null,
    sspPph: Number(akta.sspPph || 0),
    tanggalBphtb: akta.tanggalBphtb || null,
    bphtb: Number(akta.bphtb || 0),
    honorarium: Number(akta.honorarium || 0),
    status: akta.status || "Draft",
    catatan: akta.catatan || null,
    detailJson: JSON.stringify(akta.detail || {}),
    pihakJson: JSON.stringify(akta.pihak || []),
    dokumenJson: JSON.stringify(akta.dokumen || []),
    fotoTtdKlienJson: JSON.stringify(akta.fotoTtdKlien || []),
    fotoTtdNotarisJson: JSON.stringify(akta.fotoTtdNotaris || []),
    minutaJson: JSON.stringify(akta.minuta || []),
    tandaTanganDigitalJson: JSON.stringify(akta.tandaTanganDigital || []),
  };
}

export async function listAkta(): Promise<Akta[]> {
  const rows = await prisma.akta.findMany({ orderBy: { createdAt: "desc" } });
  return rows.map(fromDb);
}

export async function getAkta(id: string): Promise<Akta | undefined> {
  const row = await prisma.akta.findUnique({ where: { id } });
  return row ? fromDb(row) : undefined;
}

export async function createAkta(akta: Akta): Promise<Akta> {
  return fromDb(await prisma.akta.create({ data: toDb(akta) }));
}

export async function updateAkta(id: string, akta: Akta): Promise<Akta> {
  if (!(await prisma.akta.findUnique({ where: { id }, select: { id: true } })))
    throw new AppError("Data tidak ditemukan", 404);
  return fromDb(await prisma.akta.update({ where: { id }, data: toDb({ ...akta, id }) }));
}

export async function deleteAkta(id: string): Promise<void> {
  if (!(await prisma.akta.findUnique({ where: { id }, select: { id: true } })))
    throw new AppError("Data tidak ditemukan", 404);
  await prisma.akta.delete({ where: { id } });
}
