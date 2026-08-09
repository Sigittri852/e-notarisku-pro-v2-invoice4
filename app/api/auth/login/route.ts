import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { listUsers } from "@/lib/user-store";
import { SESSION_COOKIE, SESSION_MAX_AGE, signSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const INVALID = { message: "Email atau password salah." };

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Permintaan tidak valid." }, { status: 400 });
  }

  const payload = body as { email?: unknown; password?: unknown };
  const email = String(payload.email ?? "").trim().toLowerCase();
  const password = String(payload.password ?? "");

  if (!email || !password) {
    return NextResponse.json(INVALID, { status: 401 });
  }

  const users = await listUsers();
  const user = users.find((item) => item.email.toLowerCase() === email);

  // Always run a hash comparison to avoid leaking which emails exist.
  const hash = user?.passwordHash ?? "$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidi";
  const matches = await bcrypt.compare(password, hash);

  if (!user || !matches || !user.aktif) {
    return NextResponse.json(INVALID, { status: 401 });
  }

  const token = await signSession({
    sub: user.id,
    email: user.email,
    nama: user.nama,
    role: user.role,
  });

  const response = NextResponse.json({
    id: user.id,
    nama: user.nama,
    email: user.email,
    role: user.role,
  });
  response.cookies.set({
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return response;
}
