import bcrypt from "bcryptjs";
import { AppError } from "./errors";
import { prisma } from "./prisma";

/**
 * Data pengguna disimpan di PostgreSQL (Prisma). Filesystem Vercel bersifat
 * ephemeral, sehingga penyimpanan berbasis berkas JSON akan hilang setiap deploy.
 */

export type UserRole = "SUPER_ADMIN" | "NOTARIS_PPAT" | "STAFF";

export type StoredUser = {
  id: string;
  nama: string;
  email: string;
  role: UserRole;
  aktif: boolean;
  passwordHash: string;
  createdAt: string;
  updatedAt: string;
};

export type PublicUser = Omit<StoredUser, "passwordHash">;

const roles: UserRole[] = ["SUPER_ADMIN", "NOTARIS_PPAT", "STAFF"];

const defaultUsers = [
  { nama: "Administrator", email: "admin@notaris.local", role: "SUPER_ADMIN" as UserRole, password: "admin123" },
  { nama: "Staf Kantor", email: "staf@notaris.local", role: "STAFF" as UserRole, password: "staff123" },
];

function fromDb(row: any): StoredUser {
  return {
    id: row.id,
    nama: row.nama,
    email: row.email,
    role: roles.includes(row.role) ? row.role : "STAFF",
    aktif: Boolean(row.aktif),
    passwordHash: row.passwordHash,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Membuat akun bawaan saat tabel masih kosong (instalasi pertama). */
async function seedDefaults() {
  for (const user of defaultUsers) {
    await prisma.user.upsert({
      where: { email: user.email },
      create: {
        nama: user.nama,
        email: user.email,
        role: user.role,
        aktif: true,
        passwordHash: await bcrypt.hash(user.password, 10),
      },
      update: {},
    });
  }
}

export async function listUsers(): Promise<StoredUser[]> {
  let rows = await prisma.user.findMany({ orderBy: { createdAt: "asc" } });
  if (!rows.length) {
    await seedDefaults();
    rows = await prisma.user.findMany({ orderBy: { createdAt: "asc" } });
  }
  return rows.map(fromDb);
}

export function toPublicUser(user: StoredUser): PublicUser {
  const { passwordHash: _passwordHash, ...safe } = user;
  return safe;
}

export async function createUser(input: {
  nama: string;
  email: string;
  role: UserRole;
  aktif: boolean;
  password: string;
}): Promise<StoredUser> {
  const email = input.email.trim().toLowerCase();
  if (await prisma.user.findUnique({ where: { email }, select: { id: true } })) {
    throw new AppError("Email sudah digunakan.", 409);
  }

  return fromDb(
    await prisma.user.create({
      data: {
        nama: input.nama.trim(),
        email,
        role: input.role,
        aktif: input.aktif,
        passwordHash: await bcrypt.hash(input.password, 10),
      },
    }),
  );
}

export async function updateUser(
  id: string,
  input: {
    nama: string;
    email: string;
    role: UserRole;
    aktif: boolean;
    password?: string;
  },
): Promise<StoredUser> {
  const current = await prisma.user.findUnique({ where: { id } });
  if (!current) throw new AppError("Pengguna tidak ditemukan.", 404);

  const email = input.email.trim().toLowerCase();
  const other = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (other && other.id !== id) throw new AppError("Email sudah digunakan.", 409);

  return fromDb(
    await prisma.user.update({
      where: { id },
      data: {
        nama: input.nama.trim(),
        email,
        role: input.role,
        aktif: input.aktif,
        passwordHash: input.password
          ? await bcrypt.hash(input.password, 10)
          : current.passwordHash,
      },
    }),
  );
}
