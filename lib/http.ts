import { NextResponse } from "next/server";
import { downloadSlug } from "./format";

export const XLSX_CONTENT_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
export const PDF_CONTENT_TYPE = "application/pdf";
export const WORD_CONTENT_TYPE = "application/msword; charset=utf-8";

/** Respons unduhan berkas dengan header Content-Disposition yang aman. */
export function attachmentResponse(body: BodyInit, contentType: string, filename: string) {
  return new NextResponse(body, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

export const errorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

export { downloadSlug };
