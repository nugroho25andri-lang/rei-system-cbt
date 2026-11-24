
import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";

const MAX_BYTES = 5 * 1024 * 1024;
const UPLOAD_DIRECTORY = join(process.cwd(), "uploads", "soal");

const EXTENSIONS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

const FALLBACK_EXTENSIONS: Record<string, string> = {
  png: "png",
  jpg: "jpg",
  jpeg: "jpg",
  webp: "webp",
  gif: "gif",
};

export type QuestionImageError =
  | "gambar-tipe"
  | "gambar-ukuran"
  | "gambar-gagal";

export class QuestionImageException extends Error {
  code: QuestionImageError;

  constructor(code: QuestionImageError) {
    super(code);
    this.code = code;
  }
}

export async function storeQuestionImage(
  file: File
): Promise<string> {
  const extension =
    EXTENSIONS[file.type] ??
    FALLBACK_EXTENSIONS[
      String(file.name).split(".").pop()?.toLowerCase() ?? ""
    ] ??
    "";

  if (!extension) {
    throw new QuestionImageException("gambar-tipe");
  }

  if (file.size > MAX_BYTES) {
    throw new QuestionImageException("gambar-ukuran");
  }

  try {
    await mkdir(UPLOAD_DIRECTORY, { recursive: true });

    const fileName = `${randomUUID()}.${extension}`;
    const filePath = join(UPLOAD_DIRECTORY, fileName);

    await writeFile(
      filePath,
      Buffer.from(await file.arrayBuffer())
    );

    return `uploads/soal/${fileName}`;
  } catch {
    throw new QuestionImageException("gambar-gagal");
  }
}

export async function removeQuestionImage(
  relativePath: string | null | undefined
) {
  const value = String(relativePath ?? "").trim();

  if (!value.startsWith("uploads/soal/")) return;

  const fileName = basename(value);

  if (!/^[a-f0-9-]+\.(png|jpg|webp|gif)$/i.test(fileName)) {
    return;
  }

  try {
    await unlink(join(UPLOAD_DIRECTORY, fileName));
  } catch {
    // File mungkin sudah tidak ada.
  }
}
