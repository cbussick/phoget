import { spawn, type ChildProcess } from "node:child_process";
import { parseArgs } from "node:util";
import { createServer } from "vite";

const { values } = parseArgs({ options: { port: { type: "string", default: "5173" } } });
const port = Number(values.port);
const apiPort = Number(process.env.PORT ?? 3001);
for (const value of [port, apiPort]) {
  if (!Number.isInteger(value) || value < 1 || value > 65535) {
    throw new Error("Ports must be integers between 1 and 65535.");
  }
}

// Vite owns the port reservation/fallback. Start the API only after listen(),
// using the actual URL, rather than probing a port and racing another process.
// https://vite.dev/guide/api-javascript.html#createserver
const vite = await createServer({
  server: {
    host: "127.0.0.1",
    port,
    strictPort: false,
    proxy: { "/api": `http://127.0.0.1:${apiPort}` },
  },
});
let api: ChildProcess | undefined;
let stopping = false;
async function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  process.exitCode = code;
  api?.kill("SIGTERM");
  await vite.close();
}
process.once("SIGINT", () => void stop());
process.once("SIGTERM", () => void stop());
try {
  await vite.listen();
  const address = vite.httpServer?.address();
  if (!address || typeof address === "string") throw new Error("Vite did not open a TCP port.");
  const origin = `http://127.0.0.1:${address.port}`;
  api = spawn(process.execPath, ["node_modules/tsx/dist/cli.mjs", "watch", "server/index.ts"], {
    stdio: "inherit",
    env: { ...process.env, NODE_ENV: "development", HOST: "127.0.0.1", APP_ORIGIN: origin },
  });
  api.once("error", () => void stop(1));
  api.once("exit", (code) => void stop(code ?? 1));
  console.log(`Phoget dev origin: ${origin}`);
  vite.printUrls();
} catch (error) {
  await stop(1);
  throw error;
}
