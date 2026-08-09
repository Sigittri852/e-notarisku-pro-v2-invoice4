// Impor data pengguna lama dari data/users.json ke PostgreSQL. Idempoten:
// pengguna dicocokkan berdasarkan email. Jalankan sekali setelah `prisma db push`.
import { readFile } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const file = path.join(process.cwd(), "data", "users.json");

const roles = ["SUPER_ADMIN", "NOTARIS_PPAT", "STAFF"];

const raw = await readFile(file, "utf8");
const data = JSON.parse(raw);
if (!Array.isArray(data)) throw new Error(`${file} bukan array.`);

for (const user of data) {
  const email = String(user.email || "").trim().toLowerCase();
  if (!email || !user.passwordHash) {
    console.warn(`LEWATI ${user.id}: email atau passwordHash kosong.`);
    continue;
  }
  const row = {
    nama: String(user.nama || ""),
    email,
    role: roles.includes(user.role) ? user.role : "STAFF",
    aktif: user.aktif !== false,
    passwordHash: user.passwordHash,
  };
  await prisma.user.upsert({ where: { email }, create: row, update: row });
  console.log(`OK ${email} (${row.role})`);
}

console.log(`Selesai: ${data.length} pengguna diproses.`);
await prisma.$disconnect();
