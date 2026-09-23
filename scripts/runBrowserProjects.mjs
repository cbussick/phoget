import { spawn } from "node:child_process";

const browsers = ["chromium", "firefox", "webkit"];
const processes = browsers.map((browser) => {
  const child = spawn("node_modules/.bin/playwright", ["test", "--project", browser], {
    env: { ...process.env, PHOGET_BROWSER_PROJECT: browser },
    stdio: "inherit",
  });
  const result = new Promise((resolve) => {
    child.once("error", (error) => {
      console.error(error);
      resolve(false);
    });
    child.once("exit", (code) => resolve(code === 0));
  });
  return { child, result };
});
for (const signal of ["SIGINT", "SIGTERM"])
  process.once(signal, () => processes.forEach(({ child }) => child.kill(signal)));
const results = await Promise.all(processes.map(({ result }) => result));
if (results.some((passed) => !passed)) process.exitCode = 1;
