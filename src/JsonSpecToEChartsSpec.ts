import { parse } from "csv-parse/sync";
import type { EChartsSpec } from "./EChartsSpec.js";
import type { JsonSpec } from "./JsonSpec.js";
export type PassResult = [JsonSpec, EChartsSpec];
export type Pass = (
  spec: JsonSpec,
  view: EChartsSpec,
) => PassResult | Promise<PassResult>;
type DataShape = "value" | "ohlc";
type SeriesDefinition = {
  type: string;
  shape: DataShape;
  defaults: JsonSpec;
};
type SeriesBinding = JsonSpec & {
  encode: JsonSpec;
};
type DataBinder = (
  source: JsonSpec[],
  timeField: string,
  binding: unknown,
  field: string,
) => SeriesBinding;
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
const seriesTypes: Record<string, SeriesDefinition> = {
  Area: {
    type: "line",
    shape: "value",
    defaults: {
      areaStyle: {},
      showSymbol: false,
    },
  },
  Bar: {
    type: "bar",
    shape: "value",
    defaults: {},
  },
  Candlestick: {
    type: "candlestick",
    shape: "ohlc",
    defaults: {},
  },
  Histogram: {
    type: "bar",
    shape: "value",
    defaults: {},
  },
  Line: {
    type: "line",
    shape: "value",
    defaults: {
      showSymbol: false,
    },
  },
};
const viewFields = {
  legend: "legend",
  tooltip: "tooltip",
  xAxis: "xAxis",
  yAxis: "yAxis",
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
function enumValue<T>(
  values: Record<string, T>,
  value: unknown,
  field: string,
): T {
  const key = string(value, field);
  if (!Object.hasOwn(values, key)) {
    throw new Error(`${field}: unsupported value: ${key}`);
  }
  return values[key];
}
function column(source: JsonSpec[], value: unknown, field: string): string {
  const name = string(value, field);
  if (source.length === 0) {
    throw new Error("source is empty");
  }
  if (!(name in source[0])) {
    throw new Error(`source does not contain column: ${name}`);
  }
  return name;
}
function valueBinding(
  source: JsonSpec[],
  timeField: string,
  binding: unknown,
  field: string,
): SeriesBinding {
  const dataField = column(source, binding, field);
  return {
    name: dataField,
    encode: {
      x: timeField,
      y: dataField,
    },
  };
}
function ohlcBinding(
  source: JsonSpec[],
  timeField: string,
  value: unknown,
  field: string,
): SeriesBinding {
  const binding = structuredClone(object(value, field));
  const open = column(source, take(binding, "open"), `${field}.open`);
  const high = column(source, take(binding, "high"), `${field}.high`);
  const low = column(source, take(binding, "low"), `${field}.low`);
  const close = column(source, take(binding, "close"), `${field}.close`);
  assertEmpty(binding, field);
  return {
    name: close,
    encode: {
      x: timeField,
      y: [open, close, low, high],
    },
  };
}
const binders: Record<DataShape, DataBinder> = {
  value: valueBinding,
  ohlc: ohlcBinding,
};
function normalize(input: JsonSpec, view: EChartsSpec): PassResult {
  const spec = object(merge(system, input), "spec");
  const defaults = object(take(spec, "default"), "default");
  const series = records(take(spec, "series"), "series");
  spec.series = series.map((value) => merge(defaults, value));
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
function mapping(fields: Record<string, string>): Pass {
  return (spec, view) => {
    const output = view as unknown as JsonSpec;
    for (const [source, target] of Object.entries(fields)) {
      if (!(source in spec)) {
        continue;
      }
      output[target] = take(spec, source);
    }
    return [spec, view];
  };
}
function lower(spec: JsonSpec, view: EChartsSpec): PassResult {
  const output = view as unknown as JsonSpec;
  const source = records(take(spec, "source"), "source");
  const timeField = column(source, take(spec, "time"), "time");
  const series = records(take(spec, "series"), "series");
  output.dataset = {
    source,
  };
  output.series = series.map((value, index) => {
    const input = structuredClone(value);
    const prefix = `series[${index}]`;
    const binding = take(input, "data");
    const definition = enumValue(
      seriesTypes,
      take(input, "type"),
      `${prefix}.type`,
    );
    const options = object(take(input, "options"), `${prefix}.options`);
    assertEmpty(input, prefix);
    const mapped = binders[definition.shape](
      source,
      timeField,
      binding,
      `${prefix}.data`,
    );
    return object(
      merge(merge(merge(mapped, definition.defaults), options), {
        type: definition.type,
        encode: mapped.encode,
      }),
      prefix,
    );
  });
  return [spec, view];
}
export async function JsonSpecToEChartsSpec(
  input: JsonSpec,
  baseURL: URL,
): Promise<EChartsSpec> {
  let spec = structuredClone(input);
  let view: EChartsSpec = {};
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
