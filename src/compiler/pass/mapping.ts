import type { JsonSpec } from "../../JsonSpec.js";
import type { Pass } from "../Compiler.js";
import { take } from "../Spec.js";
export function mapping<V>(fields: Record<string, string>): Pass<V> {
  return (spec, view) => {
    const output = view as unknown as JsonSpec;
    for (const [source, target] of Object.entries(fields)) {
      if (!(source in spec)) {
        continue;
      }
      output[target] = take(spec, source);
    }
    return [spec, view];
  };
}
