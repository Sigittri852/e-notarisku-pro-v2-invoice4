import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { randomUUID } from "crypto";
import { errorResponse } from "@/lib/api-error";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_SIZE = 25 * 1024 * 1024;

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/zip",
  "application/x-zip-compressed",
];

function safeName(name: string) {
  return name
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 120);
}

export async function POST(req: Request) {
  try {
    const token = process.env.BLOB_READ_WRITE_TOKEN;

    if (!token) {
      return NextResponse.json(
        {
          error: "BLOB_READ_WRITE_TOKEN belum tersedia di Vercel.",
        },
        { status: 500 }
      );
    }

    const form = await req.formData();

    const files = form
      .getAll("files")
      .filter((item): item is File => item instanceof File);

    if (!files.length) {
      return NextResponse.json(
        { error: "Tidak ada file yang dikirim." },
        { status: 400 }
      );
    }

    const result = [];

    for (const file of files) {
      if (file.size > MAX_SIZE) {
        return NextResponse.json(
          {
            error: `File ${file.name} melebihi batas 25 MB.`,
          },
          { status: 400 }
        );
      }

      if (!ALLOWED_TYPES.includes(file.type)) {
        return NextResponse.json(
          {
            error: `Jenis file ${file.name} tidak diperbolehkan.`,
          },
          { status: 400 }
        );
      }

      const filename =
        `${randomUUID()}-${safeName(file.name)}`;

      const blob = await put(
        `notaris/${filename}`,
        file,
        {
          access: "private",
          token,
          addRandomSuffix: false,
        }
      );

      result.push({
        name: file.name,
        pathname: blob.pathname,
        url: blob.url,
        type: file.type,
        size: file.size,
      });
    }

    return NextResponse.json({
      success: true,
      files: result,
    });
  } catch (error) {
    return errorResponse("BLOB UPLOAD ERROR", error, "Upload Blob gagal.");
  }
}