export class ProfileCraftError extends Error {
  readonly code: string;

  constructor(code: string, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "ProfileCraftError";
    this.code = code;
  }
}

export interface SafeError {
  code: string;
  message: string;
}

export function toSafeError(error: unknown): SafeError {
  if (error instanceof ProfileCraftError) {
    return { code: error.code, message: error.message };
  }

  if (error instanceof Error) {
    return { code: "UNEXPECTED_ERROR", message: error.message };
  }

  return { code: "UNEXPECTED_ERROR", message: "An unexpected error occurred." };
}
