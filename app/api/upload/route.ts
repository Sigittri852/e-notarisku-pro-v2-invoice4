import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { randomUUID } from "crypto";
import { errorMessage } from "@/lib/http";
import {
  MAX_UPLOAD_FILES,
  formFiles,
  safeUploadName,
  uploadFileError,
} from "@/lib/upload";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const files = formFiles(await req.formData());

    if (!files.length) {
      return NextResponse.json(
        { error: "Tidak ada file yang dipilih." },
        { status: 400 }
      );
    }

    if (files.length > MAX_UPLOAD_FILES) {
      return NextResponse.json(
        { error: `Maksimal ${MAX_UPLOAD_FILES} file sekali upload.` },
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

      const invalid = uploadFileError(file);
      if (invalid) {
        return NextResponse.json({ error: invalid }, { status: 400 });
      }

      const filename = `${randomUUID()}-${safeUploadName(file.name)}`;

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
    console.error("UPLOAD ERROR:", error);

    return NextResponse.json(
      {
        ok: false,
        error: errorMessage(error, "Gagal mengupload file."),
      },
      { status: 500 }
    );
  }
}
