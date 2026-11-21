type ErrorDetails = {
  name?: string;
  message?: string;
  code?: string;
  causeCode?: string;
  type?: string;
};

/** Express and database failures are untrusted values, not necessarily Errors. */
export function errorDetails(error: unknown): ErrorDetails {
  if (typeof error !== "object" || error === null) {
    return {};
  }
  const cause = "cause" in error ? error.cause : undefined;
  return {
    name: "name" in error && typeof error.name === "string" ? error.name : undefined,
    message: "message" in error && typeof error.message === "string" ? error.message : undefined,
    code: "code" in error && typeof error.code === "string" ? error.code : undefined,
    type: "type" in error && typeof error.type === "string" ? error.type : undefined,
    causeCode: typeof cause === "object" && cause !== null && "code" in cause && typeof cause.code === "string" ? cause.code : undefined,
  };
}
