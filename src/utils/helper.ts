/** camelCase to snake_case (used to derive bot command names from exports). */
export function toSnakeCase(value: string): string {
  return value.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase();
}

/** Small sleep helper. */
export const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));
