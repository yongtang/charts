import type { DataSet } from "./DataSet.js";
import type { DataSpec } from "./DataSpec.js";
import type { ResolvePass } from "./resolver/Resolver.js";
import { source } from "./resolver/pass/source.js";
import { assertEmpty } from "./Spec.js";
const passes: ResolvePass[] = [source];
export async function resolve(input: DataSpec, baseURL: URL): Promise<DataSet> {
  let spec = structuredClone(input);
  let data: DataSet = [];
  const context = {
    baseURL,
  };
  for (const pass of passes) {
    [spec, data] = await pass(spec, data, context);
  }
  assertEmpty(spec, "data");
  return data;
}
