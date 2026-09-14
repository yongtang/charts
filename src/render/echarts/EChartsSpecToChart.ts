import * as echarts from "echarts";
import type { EChartsSpec } from "../../compiler/echarts/EChartsSpec.js";
export function EChartsSpecToChart(element: HTMLElement, config: EChartsSpec) {
  const chart = echarts.init(element);
  chart.setOption(config);
  return chart;
}
