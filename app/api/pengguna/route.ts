import { NextResponse } from "next/server";
import {
  createUser,
  listUsers,
  toPublicUser,
  type UserRole,
} from "@/lib/user-store";
import { AppError } from "@/lib/errors";
import { errorResponse, readJsonBody } from "@/lib/api-error";

const roles: UserRole[] = ["SUPER_ADMIN", "NOTARIS_PPAT", "STAFF"];

export async function GET() {
  try {
    const users = await listUsers();
    return NextResponse.json(users.map(toPublicUser));
  } catch (error) {
    return errorResponse("PENGGUNA GET ERROR", error, "Gagal memuat data pengguna.", "message");
  }
}

export async function POST(request: Request) {
  try {
    const body = await readJsonBody(request);
    const nama = String(body.nama ?? "").trim();
    const email = String(body.email ?? "").trim();
    const password = String(body.password ?? "");
    const role = String(body.role ?? "STAFF") as UserRole;
    const aktif = body.aktif !== false;

    if (!nama || !email || !password) {
      throw new AppError("Nama, email, dan password wajib diisi.", 400);
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      throw new AppError("Format email tidak valid.", 400);
    }
    if (password.length < 6) {
      throw new AppError("Password minimal 6 karakter.", 400);
    }
    if (!roles.includes(role)) {
      throw new AppError("Peran tidak valid.", 400);
    }

    const user = await createUser({ nama, email, password, role, aktif });
    return NextResponse.json(toPublicUser(user), { status: 201 });
  } catch (error) {
    return errorResponse("PENGGUNA POST ERROR", error, "Gagal menambah pengguna.", "message");
  }
}
