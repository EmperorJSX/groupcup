import { z } from "zod/v4";

/**
 * Custom boolean coercion that handles string values properly. Unlike
 * z.coerce.boolean(), this treats "false", "0", "no", and empty strings as false.
 */
export function customBooleanCoercion() {
  return z.unknown().transform((value) => {
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value !== 0;

    if (typeof value === "string") {
      const lowerValue = value.toLowerCase().trim();

      if (
        lowerValue === "false" ||
        lowerValue === "0" ||
        lowerValue === "no" ||
        lowerValue === ""
      ) {
        return false;
      }

      if (lowerValue === "true" || lowerValue === "1" || lowerValue === "yes") {
        return true;
      }

      return lowerValue.length > 0;
    }

    if (value === null || value === undefined) return false;
    if (Array.isArray(value)) return value.length > 0;

    return Boolean(value);
  });
}

/** Creates a custom boolean schema with default value support. */
export function customBoolean(defaultValue = false) {
  return customBooleanCoercion().default(defaultValue);
}
