import { requireUser } from "@/lib/server/auth";
import { HttpError } from "@/lib/server/env";
import { route } from "@/lib/server/http";
import { IMAGE_TYPES, MAX_IMAGE_BYTES, pinFile } from "@/lib/server/ipfs";

/** Token image upload: pinned to IPFS so every venue and mirror reads the same file. */
export const POST = route(async (req) => {
  await requireUser(req);
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof Blob)) throw new HttpError(400, "Attach an image as `file`.");
  if (!IMAGE_TYPES.includes(file.type)) throw new HttpError(400, "Use a PNG, JPG, GIF or WebP image.");
  if (file.size > MAX_IMAGE_BYTES) throw new HttpError(400, "Image is larger than 5 MB.");
  return pinFile(file, `image.${file.type.split("/")[1]}`);
});
