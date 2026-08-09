import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const { session, response } = await requireSession();
  if (!session) return response;
  return NextResponse.json({
    id: session.sub,
    nama: session.nama,
    email: session.email,
    role: session.role,
  });
}
