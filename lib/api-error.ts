import { NextResponse } from "next/server";
import { AppError } from "./errors";

/**
 * Mengubah error menjadi respons JSON. Error tak terduga tetap dicatat di log
 * server dan dibalas 500 dengan pesan umum, bukan ditelan diam-diam.
 */
export function errorResponse(
  scope: string,
  error: unknown,
  fallback: string,
  key: "error" | "message" = "error",
) {
  if (error instanceof AppError) {
    return NextResponse.json({ [key]: error.message }, { status: error.status });
  }
  console.error(`${scope}:`, error);
  return NextResponse.json({ [key]: fallback }, { status: 500 });
}

/** Membaca body JSON dan mengubah body tidak valid menjadi error 400. */
export async function readJsonBody(req: Request): Promise<any> {
  try {
    return await req.json();
  } catch {
    throw new AppError("Body permintaan bukan JSON yang valid.", 400);
  }
}
