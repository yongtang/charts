export type TradingViewSeriesType =
  "Area" | "Bar" | "Baseline" | "Candlestick" | "Histogram" | "Line";
export type TradingViewCall = {
  method: string;
  args: unknown[];
};
export type TradingViewSeriesSpec = {
  type: TradingViewSeriesType;
  options: Record<string, unknown>;
  pane: number;
  data: Record<string, unknown>[];
  priceLines: Record<string, unknown>[];
  markers: {
    data: Record<string, unknown>[];
    options: Record<string, unknown>;
  };
};
export type TradingViewSpec = {
  chart: Record<string, unknown>;
  series: TradingViewSeriesSpec[];
  panes: {
    index: number;
    calls: TradingViewCall[];
  }[];
  priceScales: {
    id: string;
    pane: number;
    calls: TradingViewCall[];
  }[];
  timeScale: TradingViewCall[];
};
export function emptyTradingViewSpec(): TradingViewSpec {
  return {
    chart: {},
    series: [],
    panes: [],
    priceScales: [],
    timeScale: [],
  };
}
