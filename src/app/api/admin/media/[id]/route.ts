import { unlink } from "fs/promises";
import { db } from "@/lib/db";
import { fail, ok } from "@/lib/server-utils";
import { readJsonBody, str, toMediaAsset } from "@/lib/serializers";
import { requireAdmin } from "../../_guard";
import { deleteUploadChunks, safeUploadPathFromUrl } from "@/lib/uploads";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { error } = await requireAdmin(request);
    if (error) return error;

    const { id } = await params;
    const existing = await db.mediaAsset.findUnique({ where: { id } });
    if (!existing) return fail("Media asset not found.", 404);

    const body = await readJsonBody(request);
    if (!body) return fail("Invalid request body.", 400);

    const data: { alt?: string; caption?: string; title?: string } = {};
    if (body.alt !== undefined) data.alt = str(body.alt).slice(0, 500);
    if (body.caption !== undefined) data.caption = str(body.caption).slice(0, 500);
    if (body.title !== undefined) data.title = str(body.title).slice(0, 500);

    if (Object.keys(data).length === 0) {
      return fail("Provide alt, caption and/or title to update.", 400);
    }

    const media = await db.mediaAsset.update({ where: { id }, data });
    return ok({ media: toMediaAsset(media) });
  } catch (e) {
    console.error("[api/admin/media/[id] PUT]", e);
    return fail("Something went wrong. Please try again.", 500);
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { error } = await requireAdmin(request);
    if (error) return error;

    const { id } = await params;
    const existing = await db.mediaAsset.findUnique({ where: { id } });
    if (!existing) return fail("Media asset not found.", 404);

    const filePath = safeUploadPathFromUrl(existing.url);
    if (filePath) {
      await unlink(filePath).catch(() => {}); // ignore missing files
    }
    // Also remove the DB chunk copy (authoritative on serverless hosts).
    const m = existing.url.match(/^\/uploads\/([A-Za-z0-9._-]+)$/);
    if (m) await deleteUploadChunks(m[1]);

    await db.mediaAsset.delete({ where: { id } });
    return ok({ success: true });
  } catch (e) {
    console.error("[api/admin/media/[id] DELETE]", e);
    return fail("Something went wrong. Please try again.", 500);
  }
}
