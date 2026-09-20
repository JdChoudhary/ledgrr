/**
 * Converts all Date values in an object to ISO strings for OpenAPI responses.
 * This is needed because Drizzle returns Date objects for `timestamptz` columns,
 * but OpenAPI output schemas declare them as strings.
 *
 * The return type is `any` because the generic type preserves Date fields;
 * the zod `.output()` schema on each procedure validates correctness at runtime.
 */
export function serializeDates<T>(value: T): any {
  if (value === null || value === undefined) return value;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(serializeDates);
  if (typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      result[key] = serializeDates(val);
    }
    return result;
  }
  return value;
}
