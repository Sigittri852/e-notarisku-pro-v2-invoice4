import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { randomUUID } from "crypto";
import { errorMessage } from "@/lib/http";
import { formFiles, safeUploadName, uploadFileError } from "@/lib/upload";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

    const files = formFiles(await req.formData());

    if (!files.length) {
      return NextResponse.json(
        { error: "Tidak ada file yang dikirim." },
        { status: 400 }
      );
    }

    const result = [];

    for (const file of files) {
      const invalid = uploadFileError(file);
      if (invalid) {
        return NextResponse.json({ error: invalid }, { status: 400 });
      }

      const filename = `${randomUUID()}-${safeUploadName(file.name)}`;

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
    console.error("BLOB UPLOAD ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: errorMessage(error, "Upload Blob gagal."),
      },
      { status: 500 }
    );
  }
}
