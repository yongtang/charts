import type { JsonSpec } from "./JsonSpec.js";
export function isObject(value: unknown): value is JsonSpec {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
export function object(value: unknown, field: string): JsonSpec {
  if (!isObject(value)) {
    throw new Error(`${field} must be an object`);
  }
  return value;
}
export function string(value: unknown, field: string): string {
  if (typeof value !== "string") {
    throw new Error(`${field} must be a string`);
  }
  return value;
}
export function array(value: unknown, field: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(`${field} must be an array`);
  }
  return value;
}
export function records(value: unknown, field: string): JsonSpec[] {
  return array(value, field).map((item, index) =>
    object(item, `${field}[${index}]`),
  );
}
export function take(spec: JsonSpec, field: string): unknown {
  if (!(field in spec)) {
    throw new Error(`${field} is required`);
  }
  const value = spec[field];
  delete spec[field];
  return value;
}
export function merge(defaults: unknown, overrides: unknown): unknown {
  if (isObject(defaults) && isObject(overrides)) {
    const output: JsonSpec = structuredClone(defaults);
    for (const [field, value] of Object.entries(overrides)) {
      output[field] =
        field in output ? merge(output[field], value) : structuredClone(value);
    }
    return output;
  }
  return structuredClone(overrides);
}
export function assertEmpty(spec: JsonSpec, field: string): void {
  const remaining = Object.keys(spec);
  if (remaining.length !== 0) {
    throw new Error(`${field}: unsupported fields: ${remaining.join(", ")}`);
  }
}
export function enumValue<T>(
  values: Record<string, T>,
  value: unknown,
  field: string,
): T {
  const key = string(value, field);
  if (!Object.hasOwn(values, key)) {
    throw new Error(`${field}: unsupported value: ${key}`);
  }
  return values[key];
}
