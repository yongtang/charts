import type { DataSet } from "../DataSet.js";
import type { DataSpec } from "../DataSpec.js";
export type ResolveContext = {
  baseURL: URL;
};
export type ResolveResult = [DataSpec, DataSet];
export type ResolvePass = (
  spec: DataSpec,
  data: DataSet,
  context: ResolveContext,
) => ResolveResult | Promise<ResolveResult>;
export type SourceResolver = (
  source: unknown,
  context: ResolveContext,
) => DataSet | Promise<DataSet>;
