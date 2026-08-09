import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { changePassword } from "@/lib/user-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const { session, response } = await requireSession();
  if (!session) return response;

  const body = (await request.json().catch(() => ({}))) as {
    passwordLama?: unknown;
    passwordBaru?: unknown;
  };
  const passwordLama = String(body.passwordLama ?? "");
  const passwordBaru = String(body.passwordBaru ?? "");

  if (passwordBaru.length < 8) {
    return NextResponse.json({ message: "Password minimal 8 karakter." }, { status: 400 });
  }

  try {
    await changePassword(session.sub, passwordLama, passwordBaru);
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Gagal mengganti password." },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true });
}
