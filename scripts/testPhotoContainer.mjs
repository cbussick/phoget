import { execFileSync } from "node:child_process";
import { chmodSync, copyFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

// Integration gate: use the actual production image, not the host's ImageMagick installation.
execFileSync("docker", ["build", "-q", "-t", "phoget-item-photos:test", "."], { stdio: "inherit" });
// Bind mounts retain host permissions. Stage only synthetic fixtures so the
// non-root production user can read them even from a checkout created with umask 077.
const fixtures = mkdtempSync(join(tmpdir(), "phoget-photo-fixtures-"));
try {
  chmodSync(fixtures, 0o755);
  for (const suffix of ["jpg", "png", "webp", "heic"]) {
    const name = "photo-synthetic." + suffix;
    const destination = join(fixtures, name);
    copyFileSync(resolve("tests/fixtures", name), destination);
    chmodSync(destination, 0o644);
  }
  execFileSync(
    "docker",
    [
      "run",
      "--rm",
      "--volume",
      `${fixtures}:/fixtures:ro`,
      "--entrypoint",
      "node",
      "phoget-item-photos:test",
      "--input-type=module",
      "-e",
      `import { accessSync, constants, readFileSync, mkdtempSync, rmSync } from "node:fs";
   import { execFileSync } from "node:child_process";
   import { tmpdir } from "node:os";
   import { join } from "node:path";
   import { processPhoto } from "./dist/server/photos/processPhoto.js";
   if (process.getuid() === 0) throw new Error("Photo gate must use the non-root production user");
   accessSync("/app/package.json", constants.R_OK);
   accessSync(process.env.MAGICK_CONFIGURE_PATH + "/policy.xml", constants.R_OK);
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
} finally {
  rmSync(fixtures, { recursive: true, force: true });
}
