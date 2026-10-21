import { spawn } from "node:child_process";

const browsers = ["chromium", "firefox", "webkit"];
let activeProcess;
let interrupted = false;
for (const signal of ["SIGINT", "SIGTERM"])
  process.once(signal, () => {
    interrupted = true;
    process.exitCode = 1;
    activeProcess?.kill(signal);
  });

// Keep only one browser engine and application server active on shared hosts.
for (const browser of browsers) {
  if (interrupted) break;
  const child = spawn("node_modules/.bin/playwright", ["test", "--project", browser], {
    env: { ...process.env, PHOGET_BROWSER_PROJECT: browser },
    stdio: "inherit",
  });
  activeProcess = child;
  const passed = await new Promise((resolve) => {
    child.once("error", (error) => {
      console.error(error);
      resolve(false);
    });
    child.once("exit", (code) => resolve(code === 0));
  });
  activeProcess = undefined;
  if (!passed) process.exitCode = 1;
}
