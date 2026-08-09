import { NextResponse } from "next/server";
import { toPublicUser, updateUser } from "@/lib/user-store";
import { parseUserInput } from "@/lib/user-validation";
import { errorMessage } from "@/lib/http";

type Context = { params: Promise<{ id: string }> };

export async function PUT(request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const parsed = parseUserInput(await request.json(), { requirePassword: false });
    if ("error" in parsed) {
      return NextResponse.json({ message: parsed.error }, { status: 400 });
    }

    const user = await updateUser(id, {
      ...parsed.data,
      password: parsed.data.password || undefined,
    });
    return NextResponse.json(toPublicUser(user));
  } catch (error) {
    const message = errorMessage(error, "Gagal mengubah pengguna.");
    return NextResponse.json(
      { message },
      { status: message.includes("tidak ditemukan") ? 404 : 400 },
    );
  }
}
