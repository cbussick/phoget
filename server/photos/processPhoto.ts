import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { HttpError } from "../httpErrors.js";

const exec = promisify(execFile);
export const maxUploadBytes = 12 * 1024 * 1024;
const maxStoredBytes = 3 * 1024 * 1024;
let processing = 0;

function inputFormat(data: Buffer) {
  if (data.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) return "jpg";
  if (data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return "png";
  if (data.toString("ascii", 0, 4) === "RIFF" && data.toString("ascii", 8, 12) === "WEBP")
    return "webp";
  if (data.length >= 16 && data.toString("ascii", 4, 8) === "ftyp") {
    const boxSize = data.readUInt32BE(0);
    const heifBrands = new Set(["heic", "heix", "hevc", "hevx", "mif1", "msf1"]);
    if (boxSize >= 16 && boxSize <= Math.min(data.length, 4096)) {
      const major = data.toString("ascii", 8, 12);
      if (major === "avif" || major === "avis")
        throw new HttpError(415, "AVIF-Fotos werden noch nicht unterstützt.");
      if (heifBrands.has(major)) return "heic";
      for (let offset = 16; offset + 4 <= boxSize; offset += 4)
        if (heifBrands.has(data.toString("ascii", offset, offset + 4))) return "heic";
    }
  }
  throw new HttpError(415, "Bitte wähle ein JPEG-, PNG-, WebP- oder HEIC-Foto aus.");
}

export async function processPhoto(data: Buffer) {
  if (!data.length || data.length > maxUploadBytes)
    throw new HttpError(413, "Das Foto darf höchstens 12 MB groß sein.");
  const format = inputFormat(data);
  if (processing >= 2)
    throw new HttpError(
      429,
      "Es werden gerade Fotos verarbeitet. Bitte versuche es gleich erneut.",
    );
  processing++;
  let directory: string | undefined;
  try {
    directory = await mkdtemp(join(tmpdir(), "phoget-photo-"));
    const source = join(directory, `input.${format}`);
    const destination = join(directory, "photo.webp");
    await writeFile(source, data, { mode: 0o600 });
    await exec(
      "magick",
      [
        "-limit",
        "memory",
        "128MiB",
        "-limit",
        "map",
        "128MiB",
        "-limit",
        "disk",
        "256MiB",
        "-limit",
        "time",
        "15",
        "-limit",
        "thread",
        "2",
        `${source}[0]`,
        "-auto-orient",
        "-resize",
        "1600x1600>",
        "-strip",
        "-quality",
        "80",
        destination,
      ],
      {
        timeout: 20000,
        maxBuffer: 4096,
        env: { ...process.env, MAGICK_TEMPORARY_PATH: directory },
      },
    );
    const result = await readFile(destination);
    if (!result.length || result.length > maxStoredBytes)
      throw new HttpError(413, "Das verarbeitete Foto ist zu groß. Bitte wähle ein anderes Foto.");
    return result;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    if (error instanceof Error && "code" in error && error.code === "ENOENT")
      throw new HttpError(
        503,
        "Fotoverarbeitung ist gerade nicht verfügbar. Bitte versuche es später erneut.",
      );
    throw new HttpError(
      400,
      "Das Foto konnte nicht verarbeitet werden. Bitte wähle ein anderes Foto.",
    );
  } finally {
    processing--;
    if (directory) await rm(directory, { recursive: true, force: true });
  }
}
