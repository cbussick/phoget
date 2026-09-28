import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

// Integration gate: use the actual production image, not the host's ImageMagick installation.
execFileSync("docker", ["build", "-q", "-t", "phoget-item-photos:test", "."], { stdio: "inherit" });
execFileSync(
  "docker",
  [
    "run",
    "--rm",
    "--volume",
    `${resolve("tests/fixtures")}:/fixtures:ro`,
    "--entrypoint",
    "node",
    "phoget-item-photos:test",
    "--input-type=module",
    "-e",
    `import { readFileSync, mkdtempSync, rmSync } from "node:fs";
   import { execFileSync } from "node:child_process";
   import { tmpdir } from "node:os";
   import { join } from "node:path";
   import { processPhoto } from "./dist/server/photos/processPhoto.js";
   for (const suffix of ["jpg", "png", "webp", "heic"]) {
     const output = await processPhoto(readFileSync("/fixtures/photo-synthetic." + suffix));
     if (output.toString("ascii", 8, 12) !== "WEBP") throw new Error(suffix + " did not become WebP");
     console.log(suffix + " -> WebP (" + output.length + " bytes)");
   }
   const directory = mkdtempSync(join(tmpdir(), "phoget-large-jpeg-"));
   try {
     const source = join(directory, "camera.jpg");
     for (const dimensions of ["6000x4000", "8160x6120"]) {
       // Synthetic high-resolution camera photo; generation is not the upload pipeline.
       execFileSync("magick", ["-size", dimensions, "gradient:#224466-#eeddbb", "-quality", "88", source], {
         env: { ...process.env, MAGICK_CONFIGURE_PATH: "" },
       });
       const output = await processPhoto(readFileSync(source));
       if (output.toString("ascii", 8, 12) !== "WEBP") throw new Error(dimensions + " JPEG did not become WebP");
       console.log(dimensions + " camera JPEG -> WebP (" + output.length + " bytes)");
     }
   } finally {
     rmSync(directory, { recursive: true, force: true });
   }`,
  ],
  { stdio: "inherit" },
);
