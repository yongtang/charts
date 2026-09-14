import { parse } from "csv-parse/sync";
import type { JsonSpec } from "../../JsonSpec.js";
import type { CompileContext, PassResult } from "../Compiler.js";
import { string } from "../Spec.js";
export async function resolve<V>(
  spec: JsonSpec,
  view: V,
  context: CompileContext,
): Promise<PassResult<V>> {
  const source = string(spec.source, "source");
  const url = new URL(source, context.baseURL);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}: ${url}`);
  }
  spec.source = parse(await response.text(), {
    bom: true,
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as JsonSpec[];
  return [spec, view];
}
