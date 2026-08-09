import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession, type SessionPayload, type UserRole } from "./session";

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  return verifySession(store.get(SESSION_COOKIE)?.value);
}

export async function requireSession() {
  const session = await getSession();
  if (!session) {
    return {
      session: null,
      response: NextResponse.json({ message: "Tidak memiliki akses." }, { status: 401 }),
    } as const;
  }
  return { session, response: null } as const;
}

export async function requireRole(...roles: UserRole[]) {
  const { session, response } = await requireSession();
  if (!session) return { session: null, response } as const;
  if (!roles.includes(session.role)) {
    return {
      session: null,
      response: NextResponse.json({ message: "Akses ditolak." }, { status: 403 }),
    } as const;
  }
  return { session, response: null } as const;
}
