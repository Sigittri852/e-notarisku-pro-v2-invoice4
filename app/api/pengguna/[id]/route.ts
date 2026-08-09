import { NextResponse } from "next/server";
import { toPublicUser, updateUser, type UserRole } from "@/lib/user-store";
import { AppError } from "@/lib/errors";
import { errorResponse, readJsonBody } from "@/lib/api-error";

const roles: UserRole[] = ["SUPER_ADMIN", "NOTARIS_PPAT", "STAFF"];

type Context = { params: Promise<{ id: string }> };

export async function PUT(request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const body = await readJsonBody(request);
    const nama = String(body.nama ?? "").trim();
    const email = String(body.email ?? "").trim();
    const password = String(body.password ?? "");
    const role = String(body.role ?? "STAFF") as UserRole;
    const aktif = body.aktif !== false;

    if (!nama || !email) {
      throw new AppError("Nama dan email wajib diisi.", 400);
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      throw new AppError("Format email tidak valid.", 400);
    }
    if (password && password.length < 6) {
      throw new AppError("Password baru minimal 6 karakter.", 400);
    }
    if (!roles.includes(role)) {
      throw new AppError("Peran tidak valid.", 400);
    }

    const user = await updateUser(id, {
      nama,
      email,
      role,
      aktif,
      password: password || undefined,
    });
    return NextResponse.json(toPublicUser(user));
  } catch (error) {
    return errorResponse("PENGGUNA PUT ERROR", error, "Gagal mengubah pengguna.", "message");
  }
}
