import {
  AreaSeries,
  BarSeries,
  BaselineSeries,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  createChart,
  createSeriesMarkers,
  type ISeriesApi,
  type SeriesType,
} from "lightweight-charts";
import type {
  TradingViewCall,
  TradingViewSeriesType,
  TradingViewSpec,
} from "./TradingViewSpec.js";
const types: Record<TradingViewSeriesType, unknown> = {
  Area: AreaSeries,
  Bar: BarSeries,
  Baseline: BaselineSeries,
  Candlestick: CandlestickSeries,
  Histogram: HistogramSeries,
  Line: LineSeries,
};
function calls(target: object, values: TradingViewCall[]): void {
  for (const call of values) {
    const method = Reflect.get(target, call.method) as (
      ...args: unknown[]
    ) => unknown;
    Reflect.apply(method, target, call.args);
  }
}
export function TradingViewSpecToChart(
  element: HTMLElement,
  config: TradingViewSpec,
) {
  const chart = createChart(element, config.chart);
  const series = config.series.map((item) => {
    const result = chart.addSeries(
      types[item.type] as never,
      item.options as never,
      item.pane,
    ) as ISeriesApi<SeriesType>;
    result.setData(item.data as never);
    item.priceLines.forEach((options) =>
      result.createPriceLine(options as never),
    );
    createSeriesMarkers(
      result,
      item.markers.data as never,
      item.markers.options as never,
    );
    return result;
  });
  config.panes.forEach((item) => {
    calls(chart.panes()[item.index], item.calls);
  });
  config.priceScales.forEach((item) => {
    calls(chart.priceScale(item.id, item.pane), item.calls);
  });
  calls(chart.timeScale(), config.timeScale);
  const notice = document.createElement("small");
  notice.textContent =
    "TradingView Lightweight Charts™ Copyright (с) 2025 TradingView, Inc.";
  notice.style.position = "fixed";
  notice.style.right = "4px";
  notice.style.bottom = "2px";
  notice.style.fontSize = "10px";
  document.body.append(notice);
  return {
    chart,
    series,
  };
}
