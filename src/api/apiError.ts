import type { paths } from "./schema";

// Machine-readable codes the API returns next to the error message (see src/errors.ts in the API).
// Every endpoint shares the same negative response, so any endpoint works to derive the type.
export type ApiErrorCode = NonNullable<
  paths["/v1/plots"]["post"]["responses"]["400"]["content"]["application/json"]["code"]
>;

// Thrown by query/mutation functions so the UI can show a translated message for the error code
export class ApiError extends Error {
  readonly code: ApiErrorCode | undefined;

  constructor(message: string, code: ApiErrorCode | undefined) {
    super(message);
    this.name = "ApiError";
    this.code = code;
  }
}
