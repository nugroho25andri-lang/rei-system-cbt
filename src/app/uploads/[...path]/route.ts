
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { extname, join, normalize, sep } from "node:path";
import { Readable } from "node:stream";

const TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".m4v": "video/x-m4v",
  ".pdf": "application/pdf",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".ppt": "application/vnd.ms-powerpoint",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".txt": "text/plain; charset=utf-8",
  ".csv": "text/csv; charset=utf-8",
  ".zip": "application/zip",
};

const UPLOADS_DIR = join(process.cwd(), "uploads");

function resolvePath(parts: string[]) {
  try {
    const relative = parts.map((part) => decodeURIComponent(part)).join("/");
    const full = normalize(
      join(/*turbopackIgnore: true*/ UPLOADS_DIR, relative)
    );

    if (
      full !== UPLOADS_DIR &&
      !full.startsWith(UPLOADS_DIR + sep)
    ) {
      return null;
    }

    return full;
  } catch {
    return null;
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const filePath = resolvePath(path ?? []);

  if (!filePath) {
    return new Response("Not found", { status: 404 });
  }

  let info;

  try {
    info = await stat(filePath);
  } catch {
    return new Response("Not found", { status: 404 });
  }

  if (!info.isFile()) {
    return new Response("Not found", { status: 404 });
  }

  const type =
    TYPES[extname(filePath).toLowerCase()] ??
    "application/octet-stream";

  const headers = new Headers({
    "Content-Type": type,
    "Accept-Ranges": "bytes",
    "Cache-Control": "public, max-age=86400",
  });

  const range = request.headers.get("range");

  if (range) {
    const match = range.match(/^bytes=(\d*)-(\d*)$/);

    if (match) {
      const start = match[1] ? Number(match[1]) : 0;
      const end = match[2]
        ? Math.min(Number(match[2]), info.size - 1)
        : info.size - 1;

      if (
        start >= 0 &&
        start <= end &&
        start < info.size
      ) {
        headers.set(
          "Content-Range",
          `bytes ${start}-${end}/${info.size}`
        );
        headers.set("Content-Length", String(end - start + 1));

        const stream = Readable.toWeb(
          createReadStream(filePath, { start, end })
        ) as ReadableStream;

        return new Response(stream, { status: 206, headers });
      }
    }

    return new Response("Invalid range", {
      status: 416,
      headers: {
        "Content-Range": `bytes */${info.size}`,
      },
    });
  }

  headers.set("Content-Length", String(info.size));

  const stream = Readable.toWeb(
    createReadStream(filePath)
  ) as ReadableStream;

  return new Response(stream, { status: 200, headers });
}
