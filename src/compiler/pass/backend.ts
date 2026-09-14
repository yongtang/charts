import type { JsonSpec } from "../../JsonSpec.js";
import { string } from "../Spec.js";
export function backend(input: JsonSpec, fallback: string): [string, JsonSpec] {
  const spec = structuredClone(input);
  const value = "backend" in spec ? spec.backend : fallback;
  delete spec.backend;
  const name = string(value, "backend");
  if (!/^[a-z0-9][a-z0-9-]*$/.test(name)) {
    throw new Error(`invalid backend: ${name}`);
  }
  return [name, spec];
}
