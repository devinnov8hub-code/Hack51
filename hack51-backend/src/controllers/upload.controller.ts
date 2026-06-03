import type { Context } from "hono";
import { successResponse } from "../types/api-response.js";
import { BadRequestError, InternalError } from "../exceptions/errors.js";

/**
 * Artifact upload support.
 *
 * The submission flow accepts `artifact_type: "upload"` but there was no
 * endpoint to actually receive a file — candidates could only paste URLs.
 * This controller fills that gap using Supabase Storage signed upload URLs.
 *
 * Flow (frontend perspective):
 *   1. POST /uploads/sign  with { filename, content_type }
 *        → returns { upload_url, token, path, public_url }
 *   2. Frontend uploads the raw file bytes directly to `upload_url`
 *      using Supabase's uploadToSignedUrl (or a plain PUT) — the file
 *      never passes through this API server, so Vercel's payload limit
 *      is irrelevant.
 *   3. Frontend then submits the challenge with
 *        artifact_urls: [public_url], artifact_type: "upload"
 *
 * This keeps the existing SubmitSchema unchanged — public_url is just a
 * normal https URL, so it passes the existing z.string().url() validation.
 *
 * Storage bucket: "artifacts" (must be created once in the Supabase
 * dashboard, or via the SQL in migrations/003). Files are namespaced per
 * user so one candidate can't overwrite another's upload.
 */

const ALLOWED_CONTENT_TYPES = new Set([
  "application/pdf",
  "application/zip",
  "application/x-zip-compressed",
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "text/markdown",
]);

const BUCKET = "artifacts";

function sanitizeFilename(name: string): string {
  // Strip path separators and anything weird; keep extension.
  const base = name.split(/[\\/]/).pop() ?? "file";
  return base.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
}

export const UploadController = {
  /**
   * Create a short-lived signed upload URL. Auth required — the file is
   * namespaced under the authenticated user's id.
   */
  async createSignedUpload(c: Context) {
    const userId = c.get("userId");
    const body = await c.req.json().catch(() => null) as
      | { filename?: string; content_type?: string }
      | null;

    if (!body?.filename) {
      throw new BadRequestError("filename is required", "FILENAME_REQUIRED");
    }
    if (!body.content_type) {
      throw new BadRequestError("content_type is required", "CONTENT_TYPE_REQUIRED");
    }
    if (!ALLOWED_CONTENT_TYPES.has(body.content_type)) {
      throw new BadRequestError(
        `Unsupported file type "${body.content_type}". Allowed: PDF, ZIP, images, Office docs, text.`,
        "UNSUPPORTED_FILE_TYPE",
      );
    }

    const { supabase } = await import("../config/supabase.js");

    const safeName = sanitizeFilename(body.filename);
    // Namespacing: <userId>/<timestamp>-<filename>
    const path = `${userId}/${Date.now()}-${safeName}`;

    // createSignedUploadUrl gives us a one-time token the client uploads to.
    const { data, error } = await supabase
      .storage
      .from(BUCKET)
      .createSignedUploadUrl(path);

    if (error) {
      // Most common cause: the bucket doesn't exist yet.
      throw new InternalError(
        `Could not create upload URL: ${error.message}. ` +
        `Make sure the "${BUCKET}" storage bucket exists in Supabase.`,
      );
    }

    // The public URL the file will have after upload (bucket must be public,
    // or use a signed download URL instead — see note in migration 003).
    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);

    return c.json(successResponse("Signed upload URL created.", {
      upload_url: data.signedUrl,   // PUT the raw file here
      token: data.token,            // or use supabase.storage.uploadToSignedUrl(path, token, file)
      path,                          // the storage path
      public_url: pub.publicUrl,    // put THIS in artifact_urls when submitting
      bucket: BUCKET,
    }));
  },
};
