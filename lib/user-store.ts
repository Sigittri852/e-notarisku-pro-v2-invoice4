import { promises as fs } from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import { randomBytes, randomUUID } from "crypto";
import type { UserRole } from "./session";

export type { UserRole };

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

const file = path.join(process.cwd(), "data", "users.json");

function seedUsers(): StoredUser[] {
  const email = (process.env.ADMIN_EMAIL ?? "admin@notaris.local").trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? randomBytes(18).toString("base64url");
  const now = new Date().toISOString();

  if (!process.env.ADMIN_PASSWORD) {
    console.warn(
      `ADMIN_PASSWORD belum diatur. Akun awal "${email}" dibuat dengan password acak: ${password}\n` +
        "Segera masuk dan ganti password, atau atur ADMIN_PASSWORD lalu hapus data/users.json.",
    );
  }

  return [
    {
      id: randomUUID(),
      nama: process.env.ADMIN_NAME ?? "Administrator",
      email,
      role: "SUPER_ADMIN",
      aktif: true,
      passwordHash: bcrypt.hashSync(password, 12),
      createdAt: now,
      updatedAt: now,
    },
  ];
}

async function ensureFile() {
  try {
    await fs.access(file);
  } catch {
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, JSON.stringify(seedUsers(), null, 2), "utf8");
  }
}

export async function listUsers(): Promise<StoredUser[]> {
  await ensureFile();
  try {
    const raw = await fs.readFile(file, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveUsers(users: StoredUser[]) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(users, null, 2), "utf8");
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
}) {
  const users = await listUsers();
  const email = input.email.trim().toLowerCase();
  if (users.some((item) => item.email.toLowerCase() === email)) {
    throw new Error("Email sudah digunakan.");
  }

  const now = new Date().toISOString();
  const user: StoredUser = {
    id: randomUUID(),
    nama: input.nama.trim(),
    email,
    role: input.role,
    aktif: input.aktif,
    passwordHash: await bcrypt.hash(input.password, 12),
    createdAt: now,
    updatedAt: now,
  };
  users.push(user);
  await saveUsers(users);
  return user;
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
) {
  const users = await listUsers();
  const index = users.findIndex((item) => item.id === id);
  if (index < 0) throw new Error("Pengguna tidak ditemukan.");

  const email = input.email.trim().toLowerCase();
  if (users.some((item) => item.id !== id && item.email.toLowerCase() === email)) {
    throw new Error("Email sudah digunakan.");
  }

  const current = users[index];
  users[index] = {
    ...current,
    nama: input.nama.trim(),
    email,
    role: input.role,
    aktif: input.aktif,
    passwordHash: input.password
      ? await bcrypt.hash(input.password, 12)
      : current.passwordHash,
    updatedAt: new Date().toISOString(),
  };
  await saveUsers(users);
  return users[index];
}

export async function changePassword(id: string, currentPassword: string, newPassword: string) {
  const users = await listUsers();
  const index = users.findIndex((item) => item.id === id);
  if (index < 0) throw new Error("Pengguna tidak ditemukan.");

  const matches = await bcrypt.compare(currentPassword, users[index].passwordHash);
  if (!matches) throw new Error("Password lama tidak sesuai.");

  users[index] = {
    ...users[index],
    passwordHash: await bcrypt.hash(newPassword, 12),
    updatedAt: new Date().toISOString(),
  };
  await saveUsers(users);
  return users[index];
}
