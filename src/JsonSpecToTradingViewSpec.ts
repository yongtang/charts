import { parse } from "csv-parse/sync";
import type { JsonSpec } from "./JsonSpec.js";
import {
  emptyTradingViewSpec,
  type TradingViewSeriesSpec,
  type TradingViewSeriesType,
  type TradingViewSpec,
} from "./TradingViewSpec.js";
export type PassResult = [JsonSpec, TradingViewSpec];
export type Pass = (
  spec: JsonSpec,
  view: TradingViewSpec,
) => PassResult | Promise<PassResult>;
type Converter = (value: unknown, field: string) => unknown;
type FieldRule = {
  to?: string;
  convert?: Converter;
};
type FieldRules = Record<string, FieldRule>;
type DataShape = "value" | "ohlc";
type DataConverter = (
  rows: JsonSpec[],
  timeField: string,
  binding: unknown,
  field: string,
) => Record<string, unknown>[];
const system: JsonSpec = {
  time: "date",
  default: {
    type: "Line",
    options: {},
    pane: 0,
    priceLines: [],
    markers: {
      data: [],
      options: {},
    },
  },
};
const seriesTypes = {
  Area: "Area",
  Bar: "Bar",
  Baseline: "Baseline",
  Candlestick: "Candlestick",
  Histogram: "Histogram",
  Line: "Line",
} as const satisfies Record<string, TradingViewSeriesType>;
const viewFields = {
  chart: "chart",
  panes: "panes",
  priceScales: "priceScales",
  timeScale: "timeScale",
} as const satisfies Record<string, keyof TradingViewSpec>;
const markerFields: FieldRules = {
  data: {
    convert: records,
  },
  options: {
    convert: object,
  },
};
const seriesFields: FieldRules = {
  type: {
    convert: enumValue(seriesTypes),
  },
  options: {
    convert: object,
  },
  pane: {
    convert: nonNegativeInteger,
  },
  priceLines: {
    convert: records,
  },
  markers: {
    convert: marker,
  },
};
const dataShapes: Record<TradingViewSeriesType, DataShape> = {
  Area: "value",
  Bar: "ohlc",
  Baseline: "value",
  Candlestick: "ohlc",
  Histogram: "value",
  Line: "value",
};
const dataConverters: Record<DataShape, DataConverter> = {
  value: valueData,
  ohlc: ohlcData,
};
function isObject(value: unknown): value is JsonSpec {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function object(value: unknown, field: string): JsonSpec {
  if (!isObject(value)) {
    throw new Error(`${field} must be an object`);
  }
  return value;
}
function string(value: unknown, field: string): string {
  if (typeof value !== "string") {
    throw new Error(`${field} must be a string`);
  }
  return value;
}
function array(value: unknown, field: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(`${field} must be an array`);
  }
  return value;
}
function records(value: unknown, field: string): JsonSpec[] {
  return array(value, field).map((item, index) =>
    object(item, `${field}[${index}]`),
  );
}
function take(spec: JsonSpec, field: string): unknown {
  if (!(field in spec)) {
    throw new Error(`${field} is required`);
  }
  const value = spec[field];
  delete spec[field];
  return value;
}
function merge(defaults: unknown, overrides: unknown): unknown {
  if (isObject(defaults) && isObject(overrides)) {
    const output: JsonSpec = structuredClone(defaults);
    for (const [field, value] of Object.entries(overrides)) {
      output[field] =
        field in output ? merge(output[field], value) : structuredClone(value);
    }
    return output;
  }
  return structuredClone(overrides);
}
function assertEmpty(spec: JsonSpec, field: string): void {
  const remaining = Object.keys(spec);
  if (remaining.length !== 0) {
    throw new Error(`${field}: unsupported fields: ${remaining.join(", ")}`);
  }
}
function enumValue<T>(values: Record<string, T>): Converter {
  return (value, field) => {
    const key = string(value, field);
    if (!Object.hasOwn(values, key)) {
      throw new Error(`${field}: unsupported value: ${key}`);
    }
    return values[key];
  };
}
function nonNegativeInteger(value: unknown, field: string): number {
  const result =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim() !== ""
        ? Number(value)
        : Number.NaN;
  if (!Number.isInteger(result) || result < 0) {
    throw new Error(`${field} must be a non-negative integer`);
  }
  return result;
}
function number(value: unknown, field: string): number | null {
  if (value === "") {
    return null;
  }
  const result = Number(value);
  if (!Number.isFinite(result)) {
    throw new Error(`${field} is not numeric: ${String(value)}`);
  }
  return result;
}
function convertFields(
  input: JsonSpec,
  rules: FieldRules,
  prefix: string,
): JsonSpec {
  const output: JsonSpec = {};
  for (const [source, rule] of Object.entries(rules)) {
    if (!(source in input)) {
      continue;
    }
    const field = prefix ? `${prefix}.${source}` : source;
    const value = take(input, source);
    output[rule.to ?? source] = rule.convert
      ? rule.convert(value, field)
      : value;
  }
  return output;
}
function marker(
  value: unknown,
  field: string,
): TradingViewSeriesSpec["markers"] {
  const input = structuredClone(object(value, field));
  const output = convertFields(input, markerFields, field);
  assertEmpty(input, field);
  return output as TradingViewSeriesSpec["markers"];
}
function normalize(input: JsonSpec, view: TradingViewSpec): PassResult {
  const spec = object(merge(system, input), "spec");
  const defaults = object(take(spec, "default"), "default");
  const series = array(take(spec, "series"), "series");
  spec.series = series.map((value, index) =>
    merge(defaults, object(value, `series[${index}]`)),
  );
  return [spec, view];
}
function resolve(baseURL: URL): Pass {
  return async (spec, view) => {
    const source = string(spec.source, "source");
    const url = new URL(source, baseURL);
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}: ${url}`);
    }
    spec.source = parse(await response.text(), {
      bom: true,
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }) as JsonSpec[];
    return [spec, view];
  };
}
function mapping(fields: Record<string, keyof TradingViewSpec>): Pass {
  return (spec, view) => {
    const output = view as unknown as Record<string, unknown>;
    for (const [source, target] of Object.entries(fields)) {
      if (!(source in spec)) {
        continue;
      }
      output[target] = spec[source];
      delete spec[source];
    }
    return [spec, view];
  };
}
function time(row: JsonSpec, field: string, index: number): string {
  const value = row[field];
  if (value === undefined || value === "") {
    throw new Error(`source[${index}].${field} is missing`);
  }
  return String(value);
}
function valueData(
  rows: JsonSpec[],
  timeField: string,
  binding: unknown,
  field: string,
): Record<string, unknown>[] {
  const dataField = string(binding, field);
  return rows.flatMap((row, index) => {
    if (!(dataField in row)) {
      throw new Error(`source does not contain column: ${dataField}`);
    }
    const value = number(row[dataField], `source[${index}].${dataField}`);
    if (value === null) {
      return [];
    }
    return [
      {
        time: time(row, timeField, index),
        value,
      },
    ];
  });
}
function ohlcData(
  rows: JsonSpec[],
  timeField: string,
  bindingValue: unknown,
  field: string,
): Record<string, unknown>[] {
  const binding = structuredClone(object(bindingValue, field));
  const names: Record<string, string> = {};
  for (const name of ["open", "high", "low", "close"]) {
    names[name] = string(take(binding, name), `${field}.${name}`);
  }
  assertEmpty(binding, field);
  return rows.flatMap((row, index) => {
    const values: Record<string, number> = {};
    for (const [name, column] of Object.entries(names)) {
      if (!(column in row)) {
        throw new Error(`source does not contain column: ${column}`);
      }
      const value = number(row[column], `source[${index}].${column}`);
      if (value === null) {
        return [];
      }
      values[name] = value;
    }
    return [
      {
        time: time(row, timeField, index),
        ...values,
      },
    ];
  });
}
function lower(spec: JsonSpec, view: TradingViewSpec): PassResult {
  const source = records(take(spec, "source"), "source");
  const timeField = string(take(spec, "time"), "time");
  const series = records(take(spec, "series"), "series");
  view.series = series.map((value, index) => {
    const input = structuredClone(value);
    const prefix = `series[${index}]`;
    const binding = take(input, "data");
    const output = convertFields(input, seriesFields, prefix);
    assertEmpty(input, prefix);
    const seriesType = output.type as TradingViewSeriesType;
    const shape = dataShapes[seriesType];
    return {
      ...output,
      data: dataConverters[shape](source, timeField, binding, `${prefix}.data`),
    } as TradingViewSeriesSpec;
  });
  return [spec, view];
}
export async function JsonSpecToTradingViewSpec(
  input: JsonSpec,
  baseURL: URL,
): Promise<TradingViewSpec> {
  let spec = structuredClone(input);
  let view = emptyTradingViewSpec();
  const passes: Pass[] = [
    normalize,
    resolve(baseURL),
    mapping(viewFields),
    lower,
  ];
  for (const pass of passes) {
    [spec, view] = await pass(spec, view);
  }
  assertEmpty(spec, "spec");
  return view;
}
