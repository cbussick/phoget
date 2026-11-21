import { format } from "node:util";

/** Application/CLI output boundary. Keep errors on stderr and normal output on stdout. */
export const logger = {
  info(this: void, ...values: Array<unknown>): void {
    process.stdout.write(format(...values) + "\n");
  },
  log(this: void, ...values: Array<unknown>): void {
    process.stdout.write(format(...values) + "\n");
  },
  error(this: void, ...values: Array<unknown>): void {
    process.stderr.write(format(...values) + "\n");
  },
};
