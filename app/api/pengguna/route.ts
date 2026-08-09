import { NextResponse } from "next/server";
import { createUser, listUsers, toPublicUser } from "@/lib/user-store";
import { parseUserInput } from "@/lib/user-validation";
import { errorMessage } from "@/lib/http";

export async function GET() {
  const users = await listUsers();
  return NextResponse.json(users.map(toPublicUser));
}

export async function POST(request: Request) {
  try {
    const parsed = parseUserInput(await request.json(), { requirePassword: true });
    if ("error" in parsed) {
      return NextResponse.json({ message: parsed.error }, { status: 400 });
    }

    const user = await createUser(parsed.data);
    return NextResponse.json(toPublicUser(user), { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { message: errorMessage(error, "Gagal menambah pengguna.") },
      { status: 400 },
    );
  }
}
