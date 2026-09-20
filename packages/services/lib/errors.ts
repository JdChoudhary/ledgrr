/**
 * Service-level error contract.
 *
 * Services validate their own input, so a caller can rely on these codes
 * instead of guessing at raw driver/database errors.
 */
export type ServiceErrorCode =
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "CONFLICT"
  | "FORBIDDEN"
  | "INVALID_STATE";

export class ServiceError extends Error {
  readonly code: ServiceErrorCode;
  readonly details: ReadonlyArray<string>;

  constructor(code: ServiceErrorCode, message: string, details: ReadonlyArray<string> = []) {
    super(message);
    this.name = "ServiceError";
    this.code = code;
    this.details = details;
  }
}

type PostgresError = {
  code?: unknown;
  constraint?: unknown;
  detail?: unknown;
};

const asPostgresError = (error: unknown): PostgresError | null =>
  typeof error === "object" && error !== null ? (error as PostgresError) : null;

export const PG_UNIQUE_VIOLATION = "23505";
export const PG_FOREIGN_KEY_VIOLATION = "23503";
export const PG_CHECK_VIOLATION = "23514";

/** Postgres already enforces the invariants; map its codes to service errors. */
export const isPostgresError = (error: unknown, pgCode: string, constraint?: string): boolean => {
  const pgError = asPostgresError(error);
  if (pgError?.code !== pgCode) return false;
  if (constraint === undefined) return true;
  return pgError.constraint === constraint;
};

export const isUniqueViolation = (error: unknown, constraint?: string): boolean =>
  isPostgresError(error, PG_UNIQUE_VIOLATION, constraint);

export const isForeignKeyViolation = (error: unknown, constraint?: string): boolean =>
  isPostgresError(error, PG_FOREIGN_KEY_VIOLATION, constraint);

export const isCheckViolation = (error: unknown, constraint?: string): boolean =>
  isPostgresError(error, PG_CHECK_VIOLATION, constraint);
