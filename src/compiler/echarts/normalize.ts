import type { JsonSpec } from "../../JsonSpec.js";
import { merge, object, records, take } from "../../Spec.js";
import type { PassResult } from "../Compiler.js";
import type { EChartsSpec } from "./EChartsSpec.js";
const system: JsonSpec = {
  time: "date",
  legend: {},
  tooltip: {
    trigger: "axis",
  },
  xAxis: {
    type: "time",
  },
  yAxis: {
    type: "value",
    scale: true,
  },
  default: {
    type: "Line",
    options: {},
  },
};
export function normalize(
  input: JsonSpec,
  view: EChartsSpec,
): PassResult<EChartsSpec> {
  const spec = object(merge(system, input), "spec");
  const defaults = object(take(spec, "default"), "default");
  const series = records(take(spec, "series"), "series");
  spec.series = series.map((value) => merge(defaults, value));
  return [spec, view];
}
