import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";

const MAX_BYTES = 5 * 1024 * 1024;
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

export type QuestionImageError = "gambar-tipe" | "gambar-ukuran" | "gambar-gagal";

export class QuestionImageException extends Error {
  code: QuestionImageError;

  constructor(code: QuestionImageError) {
    super(code);
    this.code = code;
  }
}

export async function storeQuestionImage(file: File): Promise<string> {
  const extension =
    EXTENSIONS[file.type] ??
    FALLBACK_EXTENSIONS[String(file.name).split(".").pop()?.toLowerCase() ?? ""] ??
    "";
  if (!extension) throw new QuestionImageException("gambar-tipe");
  if (file.size > MAX_BYTES) throw new QuestionImageException("gambar-ukuran");
  try {
    const directory = join(process.cwd(), "uploads", "soal");
    await mkdir(directory, { recursive: true });
    const fileName = `${randomUUID()}.${extension}`;
    await writeFile(join(directory, fileName), Buffer.from(await file.arrayBuffer()));
    return `uploads/soal/${fileName}`;
  } catch {
    throw new QuestionImageException("gambar-gagal");
  }
}

export async function removeQuestionImage(relativePath: string | null | undefined) {
  const value = String(relativePath ?? "").trim();
  if (!value.startsWith("uploads/soal/") || value.includes("..")) return;
  try {
    await unlink(join(process.cwd(), value));
  } catch {
    // Berkas mungkin sudah tidak ada; abaikan.
  }
}
