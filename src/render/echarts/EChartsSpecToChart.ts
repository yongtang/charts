import * as echarts from "echarts";
import type { EChartsSpec } from "../../compiler/echarts/EChartsSpec.js";
const observers = new WeakMap<HTMLElement, ResizeObserver>();
export function EChartsSpecToChart(element: HTMLElement, config: EChartsSpec) {
  observers.get(element)?.disconnect();
  echarts.getInstanceByDom(element)?.dispose();
  const chart = echarts.init(element);
  chart.setOption(config);
  const observer = new ResizeObserver(() => {
    chart.resize();
  });
  observer.observe(element);
  observers.set(element, observer);
  return chart;
}
