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
    `import { readFileSync } from "node:fs";
   import { processPhoto } from "./dist/server/photos/processPhoto.js";
   for (const suffix of ["jpg", "png", "webp", "heic"]) {
     const output = await processPhoto(readFileSync("/fixtures/photo-synthetic." + suffix));
     if (output.toString("ascii", 8, 12) !== "WEBP") throw new Error(suffix + " did not become WebP");
     console.log(suffix + " -> WebP (" + output.length + " bytes)");
   }`,
  ],
  { stdio: "inherit" },
);
