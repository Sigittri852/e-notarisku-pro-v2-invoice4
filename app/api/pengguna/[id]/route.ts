import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { toPublicUser, updateUser, type UserRole } from "@/lib/user-store";

const roles: UserRole[] = ["SUPER_ADMIN", "NOTARIS_PPAT", "STAFF"];

type Context = { params: Promise<{ id: string }> };

export async function PUT(request: Request, context: Context) {
  const { session, response } = await requireRole("SUPER_ADMIN");
  if (!session) return response;

  try {
    const { id } = await context.params;
    const body = await request.json();
    const nama = String(body.nama ?? "").trim();
    const email = String(body.email ?? "").trim();
    const password = String(body.password ?? "");
    const role = String(body.role ?? "STAFF") as UserRole;
    const aktif = body.aktif !== false;

    if (!nama || !email) {
      return NextResponse.json(
        { message: "Nama dan email wajib diisi." },
        { status: 400 },
      );
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return NextResponse.json({ message: "Format email tidak valid." }, { status: 400 });
    }
    if (password && password.length < 8) {
      return NextResponse.json(
        { message: "Password baru minimal 8 karakter." },
        { status: 400 },
      );
    }
    if (!roles.includes(role)) {
      return NextResponse.json({ message: "Peran tidak valid." }, { status: 400 });
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
    const message = error instanceof Error ? error.message : "Gagal mengubah pengguna.";
    return NextResponse.json(
      { message },
      { status: message.includes("tidak ditemukan") ? 404 : 400 },
    );
  }
}
