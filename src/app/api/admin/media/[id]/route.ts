import { unlink } from "fs/promises";
import path from "path";
import { db } from "@/lib/db";
import { fail, ok } from "@/lib/server-utils";
import { readJsonBody, str, toMediaAsset } from "@/lib/serializers";
import { requireAdmin } from "../../_guard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Only delete files that live directly under /public/uploads with a safe name. */
function safeUploadPath(url: string): string | null {
  const match = url.match(/^\/uploads\/([A-Za-z0-9._-]+)$/);
  if (!match) return null;
  const name = match[1];
  if (name.includes("..")) return null;
  return path.join(process.cwd(), "public", "uploads", name);
}

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

    const filePath = safeUploadPath(existing.url);
    if (filePath) {
      await unlink(filePath).catch(() => {}); // ignore missing files
    }

    await db.mediaAsset.delete({ where: { id } });
    return ok({ success: true });
  } catch (e) {
    console.error("[api/admin/media/[id] DELETE]", e);
    return fail("Something went wrong. Please try again.", 500);
  }
}
