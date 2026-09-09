import { z } from "zod";
import { HttpError } from "../httpErrors.js";
import { createInterface } from "node:readline/promises";
import { createAccount } from "./accounts.js";
import { createUserSchema } from "../../shared/accounts.js";
import { pool } from "../db/database.js";

// Password comes from a pipe or a hidden terminal prompt, never a command-line argument.
async function readPassword() {
  if (!process.stdin.isTTY) {
    let value = "";
    for await (const chunk of process.stdin) {
      value += chunk;
      if (value.length > 1024) throw new Error("Password input is too long.");
    }
    return value.replace(/\r?\n$/, "");
  }
  process.stdout.write("Password (at least 15 characters): ");
  process.stdin.setRawMode(true);
  process.stdin.resume();
  try {
    return await new Promise<string>((resolve, reject) => {
      let value = "";
      const onData = (chunk: Buffer) => {
        for (const char of chunk.toString()) {
          if (char === "\u0003") {
            process.stdin.off("data", onData);
            reject(new Error("Cancelled."));
            return;
          }
          if (char === "\r" || char === "\n") {
            process.stdin.off("data", onData);
            resolve(value);
            return;
          }
          if (char === "\u007f") value = value.slice(0, -1);
          else if (value.length < 128) value += char;
        }
      };
      process.stdin.on("data", onData);
    });
  } finally {
    process.stdin.setRawMode(false);
    process.stdin.pause();
    process.stdout.write("\n");
  }
}
try {
  let [username, name] = process.argv.slice(2);
  if (!username || !name) {
    if (!process.stdin.isTTY)
      throw new Error(
        'Usage: npm run account:setup -- username "Display name" (password on stdin)',
      );
    const prompt = createInterface({ input: process.stdin, output: process.stdout });
    username = await prompt.question("Username: ");
    name = await prompt.question("Display name: ");
    prompt.close();
  }
  const input = createUserSchema.parse({
    username,
    name,
    role: "admin",
    password: await readPassword(),
  });
  const user = await createAccount(input);
  console.log(`Administrator ${user.username} created.`);
} catch (error) {
  console.error(
    error instanceof z.ZodError
      ? error.issues[0]?.message
      : error instanceof HttpError
        ? error.message
        : "Cannot create administrator. Check the arguments and database connection.",
  );
  process.exitCode = 1;
} finally {
  await pool.end();
}
