import { parse } from "csv-parse/sync";
import type { DataSet } from "../../../DataSet.js";
import { object, string } from "../../../Spec.js";
import type { ResolveContext, SourceResolver } from "../../Resolver.js";
function url(source: unknown, context: ResolveContext): URL {
  if (typeof source === "string") {
    return new URL(source, context.baseURL);
  }
  const input = object(source, "source");
  return new URL(string(input.url, "source.url"), context.baseURL);
}
const resolve: SourceResolver = async (source, context): Promise<DataSet> => {
  const location = url(source, context);
  const response = await fetch(location);
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}: ${location}`);
  }
  return parse(await response.text(), {
    bom: true,
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as DataSet;
};
export default resolve;
