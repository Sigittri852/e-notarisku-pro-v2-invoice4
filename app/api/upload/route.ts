import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { randomUUID } from "crypto";
import { errorResponse } from "@/lib/api-error";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 25 * 1024 * 1024;

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "application/pdf",
  "application/zip",
  "application/x-zip-compressed",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

function safeFileName(name: string) {
  return name
    .normalize("NFKD")
    .replace(/[^\w.\- ]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 120);
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();

    const files = form
      .getAll("files")
      .filter((value): value is File => value instanceof File);

    if (!files.length) {
      return NextResponse.json(
        { error: "Tidak ada file yang dipilih." },
        { status: 400 }
      );
    }

    if (files.length > 10) {
      return NextResponse.json(
        { error: "Maksimal 10 file sekali upload." },
        { status: 400 }
      );
    }

    const result: {
      name: string;
      url: string;
      type: string;
      size: number;
    }[] = [];

    for (const file of files) {
      if (!file.size) {
        continue;
      }

      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          {
            error: `File "${file.name}" terlalu besar. Maksimal 25 MB.`,
          },
          { status: 400 }
        );
      }

      if (!ALLOWED_TYPES.has(file.type)) {
        return NextResponse.json(
          {
            error: `Jenis file "${file.name}" tidak diperbolehkan.`,
          },
          { status: 400 }
        );
      }

      const filename = `${randomUUID()}-${safeFileName(file.name)}`;

      const blob = await put(`notaris/${filename}`, file, {
        access: "public",
        addRandomSuffix: false,
      });

      result.push({
        name: file.name,
        url: blob.url,
        type: file.type,
        size: file.size,
      });
    }

    return NextResponse.json({
      ok: true,
      files: result,
    });
  } catch (error) {
    return errorResponse("UPLOAD ERROR", error, "Gagal mengupload file.");
  }
}