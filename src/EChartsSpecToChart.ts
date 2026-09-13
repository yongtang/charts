import * as echarts from "echarts";
import type { EChartsSpec } from "./EChartsSpec.js";
export function EChartsSpecToChart(element: HTMLElement, config: EChartsSpec) {
  const chart = echarts.init(element);
  chart.setOption(config);
  return chart;
}
