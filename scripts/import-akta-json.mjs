// Impor data akta lama dari data/akta.json ke PostgreSQL. Idempoten: baris
// dengan id yang sama akan di-upsert. Jalankan sekali setelah `prisma db push`.
import { readFile } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const file = path.join(process.cwd(), "data", "akta.json");

const str = (v) => (v === undefined || v === null ? "" : String(v));
const num = (v) => Number(v || 0);
const json = (v, fallback) => JSON.stringify(v ?? fallback);

function toDb(a) {
  return {
    id: a.id,
    nomorAkta: str(a.nomorAkta),
    tanggal: str(a.tanggal),
    kategori: a.kategori === "PPAT" ? "PPAT" : "NOTARIS",
    jenisAkta: str(a.jenisAkta),
    namaNotaris: str(a.namaNotaris),
    namaPihak: str(a.namaPihak),
    nik: str(a.nik) || null,
    npwp: str(a.npwp) || null,
    alamat: str(a.alamat) || null,
    nomorSertifikat: str(a.nomorSertifikat) || null,
    jenisHak: str(a.jenisHak) || null,
    luasTanah: str(a.luasTanah) || null,
    nilaiTransaksi: num(a.nilaiTransaksi),
    nopPbb: str(a.nopPbb) || null,
    njop: num(a.njop),
    tanggalSsp: str(a.tanggalSsp) || null,
    sspPph: num(a.sspPph),
    tanggalBphtb: str(a.tanggalBphtb) || null,
    bphtb: num(a.bphtb),
    honorarium: num(a.honorarium),
    status: str(a.status) || "Draft",
    catatan: str(a.catatan) || null,
    detailJson: json(a.detail, {}),
    pihakJson: json(a.pihak, []),
    dokumenJson: json(a.dokumen, []),
    fotoTtdKlienJson: json(a.fotoTtdKlien, []),
    fotoTtdNotarisJson: json(a.fotoTtdNotaris, []),
    minutaJson: json(a.minuta, []),
    tandaTanganDigitalJson: json(a.tandaTanganDigital, []),
  };
}

const raw = await readFile(file, "utf8");
const data = JSON.parse(raw);
if (!Array.isArray(data)) throw new Error(`${file} bukan array.`);

// Urutan dibalik agar akta terlama mendapat createdAt paling awal.
for (const akta of [...data].reverse()) {
  const row = toDb(akta);
  await prisma.akta.upsert({ where: { id: row.id }, create: row, update: row });
  console.log(`OK ${row.id} ${row.nomorAkta}`);
}

console.log(`Selesai: ${data.length} akta diimpor.`);
await prisma.$disconnect();
