import type { Compiler } from "../Compiler.js";
import { mapping } from "../pass/mapping.js";
import type { EChartsSpec } from "./EChartsSpec.js";
import { lower } from "./lower.js";
import { normalize } from "./normalize.js";
const viewFields = {
  legend: "legend",
  tooltip: "tooltip",
  xAxis: "xAxis",
  yAxis: "yAxis",
};
const compiler: Compiler<EChartsSpec> = {
  create: () => ({}),
  passes: [normalize, mapping<EChartsSpec>(viewFields), lower],
};
export default compiler;
