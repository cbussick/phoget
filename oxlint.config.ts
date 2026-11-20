import cloudflare from "@cloudflare/oxlint-config";
import { defineConfig } from "oxlint";

export default defineConfig({
  ...cloudflare,
  ignorePatterns: [
    ...(cloudflare.ignorePatterns ?? []),
    "**/.runtime/**",
    "**/.worktrees/**",
    "**/dist/**",
    "**/storybook-static/**",
    "**/test-results/**",
    "**/playwright-report/**",
  ],
  rules: {
    ...cloudflare.rules,
    // Preserve the original correctness checks, explicitly pinned.
    "no-caller": "error",
    "no-iterator": "error",
    "no-unassigned-vars": "error",
    "oxc/bad-array-method-on-arguments": "error",
    "oxc/bad-match-all-arg": "error",
    "oxc/erasing-op": "error",
    "oxc/only-used-in-recursion": "error",
    "typescript/no-base-to-string": "error",
    "typescript/no-meaningless-void-operator": "error",
    "typescript/no-redundant-type-constituents": "error",
    "typescript/no-this-alias": "error",
    "typescript/no-useless-default-assignment": "error",
    "typescript/no-useless-empty-export": "error",
    "typescript/restrict-template-expressions": "error",
    "unicorn/no-await-in-promise-methods": "error",
    "unicorn/no-empty-file": "error",
    "unicorn/no-new-array": "error",
    "unicorn/no-single-promise-in-promise-methods": "error",
    "unicorn/no-thenable": "error",
    "unicorn/no-unnecessary-await": "error",
    "unicorn/no-useless-fallback-in-spread": "error",
    "unicorn/no-useless-length-check": "error",
    "unicorn/prefer-string-starts-ends-with": "error",
    "typescript/await-thenable": "error",
    "typescript/no-implied-eval": "error",
    "typescript/no-misused-promises": "error",
    "typescript/no-floating-promises": [
      "error",
      { allowForKnownSafeCalls: [{ from: "package", name: "test", package: "node:test" }] },
    ],
  },
  overrides: [
    ...(cloudflare.overrides ?? []),
    {
      files: ["**/*.{ts,tsx,mts,cts}"],
      rules: {
        "typescript/await-thenable": "error",
        "typescript/no-misused-promises": "error",
        "typescript/no-floating-promises": [
          "error",
          { allowForKnownSafeCalls: [{ from: "package", name: "test", package: "node:test" }] },
        ],
      },
    },
    {
      files: ["**/*"],
      rules: {
        // Temporary migration baseline; remove each entry with its fixes.
        "typescript/no-non-null-assertion": "off",
        "react/immutability": "off",
        "@nkzw/no-instanceof": "off",
        "quality/no-conditional-empty-object-spread": "off",
        "react/set-state-in-effect": "off",
        "unicorn/consistent-function-scoping": "off",
        "no-console": "off",
        "react-hooks/exhaustive-deps": "off",
        "quality/no-array-filter-map": "off",
        "typescript/no-unsafe-assignment": "off",
        "typescript/no-unsafe-member-access": "off",
        "typescript/no-unsafe-type-assertion": "off",
        "typescript/no-unsafe-return": "off",
      },
    },
  ],
});
