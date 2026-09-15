import type { DataSpec } from "../../DataSpec.js";
import type { JsonSpec } from "../../JsonSpec.js";
import { take } from "../../Spec.js";
const fields = ["source", "range", "transform"];
export function data(spec: JsonSpec): [JsonSpec, DataSpec] {
  const output: DataSpec = {};
  for (const field of fields) {
    if (field in spec) {
      output[field] = take(spec, field);
    }
  }
  if (!("source" in output)) {
    throw new Error("source is required");
  }
  return [spec, output];
}
