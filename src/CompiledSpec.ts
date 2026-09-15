import type { DataSpec } from "./DataSpec.js";
import type { ViewSpec } from "./ViewSpec.js";
export type CompiledSpec = {
  view: ViewSpec;
  data: DataSpec;
};
