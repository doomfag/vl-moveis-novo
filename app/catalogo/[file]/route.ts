import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
export const runtime = "nodejs";
// Uploaded assets must also be available after a production server has started.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ file: string }> },
) {
  const { file } = await params;
  if (!/^[a-zA-Z0-9_-]+\.(webp|png|jpg|jpeg)$/.test(file))
    return new Response("Not found", { status: 404 });
  try {
    const bytes = process.env.CATALOG_UPLOAD_DIR
      ? await readFile(
          resolve(
            /* turbopackIgnore: true */ process.env.CATALOG_UPLOAD_DIR,
            file,
          ),
        ).catch(() => readFile(resolve("public/catalogo", file)))
      : await readFile(resolve("public/catalogo", file));
    const ext = file.split(".").pop();
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type":
          ext === "webp"
            ? "image/webp"
            : ext === "png"
              ? "image/png"
              : "image/jpeg",
        "Cache-Control": "public, max-age=86400",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
