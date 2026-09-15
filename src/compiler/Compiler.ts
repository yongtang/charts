import type { JsonSpec } from "../JsonSpec.js";
export type PassResult<V> = [JsonSpec, V];
export type Pass<V> = (
  spec: JsonSpec,
  view: V,
) => PassResult<V> | Promise<PassResult<V>>;
export type Compiler<V> = {
  create: () => V;
  passes: Pass<V>[];
};
