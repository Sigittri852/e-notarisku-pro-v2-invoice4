import { str } from "./coerce";
import type { UserRole } from "./user-store";

export const USER_ROLES: UserRole[] = ["SUPER_ADMIN", "NOTARIS_PPAT", "STAFF"];
export const MIN_PASSWORD_LENGTH = 6;

export type UserInput = {
  nama: string;
  email: string;
  password: string;
  role: UserRole;
  aktif: boolean;
};

/**
 * Validasi payload pengguna. `requirePassword` dipakai saat membuat pengguna baru;
 * pada pembaruan, password kosong berarti password lama dipertahankan.
 */
export function parseUserInput(
  body: unknown,
  options: { requirePassword: boolean },
): { data: UserInput } | { error: string } {
  const raw = (body ?? {}) as Record<string, unknown>;
  const nama = str(raw.nama).trim();
  const email = str(raw.email).trim();
  const password = str(raw.password);
  const role = (str(raw.role) || "STAFF") as UserRole;
  const aktif = raw.aktif !== false;

  if (!nama || !email || (options.requirePassword && !password)) {
    return {
      error: options.requirePassword
        ? "Nama, email, dan password wajib diisi."
        : "Nama dan email wajib diisi.",
    };
  }
  if (!/^\S+@\S+\.\S+$/.test(email)) return { error: "Format email tidak valid." };
  if (password && password.length < MIN_PASSWORD_LENGTH) {
    return {
      error: options.requirePassword
        ? `Password minimal ${MIN_PASSWORD_LENGTH} karakter.`
        : `Password baru minimal ${MIN_PASSWORD_LENGTH} karakter.`,
    };
  }
  if (!USER_ROLES.includes(role)) return { error: "Peran tidak valid." };

  return { data: { nama, email, password, role, aktif } };
}
