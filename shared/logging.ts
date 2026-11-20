import { format } from "node:util";

/** Application/CLI output boundary. Keep errors on stderr and normal output on stdout. */
export const logger = {
  info(...values: Array<unknown>): void {
    process.stdout.write(format(...values) + "\n");
  },
  log(...values: Array<unknown>): void {
    process.stdout.write(format(...values) + "\n");
  },
  error(...values: Array<unknown>): void {
    process.stderr.write(format(...values) + "\n");
  },
};
