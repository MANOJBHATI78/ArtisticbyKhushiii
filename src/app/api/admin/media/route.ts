import { randomBytes } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import sharp from "sharp";
import { db } from "@/lib/db";
import { fail, ok } from "@/lib/server-utils";
import { str, toMediaAsset } from "@/lib/serializers";
import { requireAdmin } from "../_guard";
import { UPLOAD_DIR } from "@/lib/uploads";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_BYTES = 8 * 1024 * 1024; // 8MB
const ALLOWED_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "gif", "avif"]);
const ALLOWED_MIME = /^image\/(jpe?g|png|webp|gif|avif)$/i;

export async function GET(request: Request) {
  try {
    const { error } = await requireAdmin(request);
    if (error) return error;

    const media = await db.mediaAsset.findMany({ orderBy: { createdAt: "desc" } });
    return ok(media.map(toMediaAsset));
  } catch (e) {
    console.error("[api/admin/media GET]", e);
    return fail("Something went wrong. Please try again.", 500);
  }
}

export async function POST(request: Request) {
  try {
    const { error } = await requireAdmin(request);
    if (error) return error;

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return fail("Invalid form upload.", 400);
    }

    const file = formData.get("file");
    if (!file || typeof file === "string") {
      return fail("A file is required.", 400);
    }
    const blob = file as Blob & { name?: string };
    const originalName = blob.name || "";

    // ----- type validation (extension OR mime) -----
    const ext = originalName.includes(".") ? originalName.split(".").pop()!.toLowerCase() : "";
    const mimeOk = ALLOWED_MIME.test(blob.type || "");
    if (!ALLOWED_EXTENSIONS.has(ext) && !mimeOk) {
      return fail("Only JPG, PNG, WebP, GIF and AVIF images are allowed.", 400);
    }

    // ----- size validation -----
    if (blob.size <= 0) return fail("The file is empty.", 400);
    if (blob.size > MAX_BYTES) {
      return fail("Image must be 8MB or smaller.", 400);
    }

    // ----- process with sharp: max width 1600, webp q82 -----
    const inputBuffer = Buffer.from(await blob.arrayBuffer());
    let outputBuffer: Buffer;
    try {
      outputBuffer = await sharp(inputBuffer)
        .resize({ width: 1600, withoutEnlargement: true })
        .webp({ quality: 82 })
        .toBuffer();
    } catch {
      return fail("Could not process the image — the file may be corrupt.", 400);
    }

    const filename = `upload-${Date.now()}-${randomBytes(3).toString("hex")}.webp`;
    await mkdir(UPLOAD_DIR, { recursive: true });
    await writeFile(path.join(UPLOAD_DIR, filename), outputBuffer);

    const media = await db.mediaAsset.create({
      data: {
        url: `/uploads/${filename}`,
        filename,
        alt: str(formData.get("alt")),
        caption: str(formData.get("caption")),
        title: str(formData.get("title")),
        size: outputBuffer.length,
      },
    });

    return ok({ media: toMediaAsset(media), url: media.url });
  } catch (e) {
    console.error("[api/admin/media POST]", e);
    return fail("Something went wrong. Please try again.", 500);
  }
}
