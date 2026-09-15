import type { JsonSpec } from "../../JsonSpec.js";
import {
  assertEmpty,
  enumValue,
  merge,
  object,
  records,
  string,
  take,
} from "../../Spec.js";
import type { PassResult } from "../Compiler.js";
import type { EChartsSpec } from "./EChartsSpec.js";
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
  timeField: string,
  binding: unknown,
  field: string,
) => SeriesBinding;
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
function valueBinding(
  timeField: string,
  binding: unknown,
  field: string,
): SeriesBinding {
  const dataField = string(binding, field);
  return {
    name: dataField,
    encode: {
      x: timeField,
      y: dataField,
    },
  };
}
function ohlcBinding(
  timeField: string,
  value: unknown,
  field: string,
): SeriesBinding {
  const binding = structuredClone(object(value, field));
  const open = string(take(binding, "open"), `${field}.open`);
  const high = string(take(binding, "high"), `${field}.high`);
  const low = string(take(binding, "low"), `${field}.low`);
  const close = string(take(binding, "close"), `${field}.close`);
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
export function lower(
  spec: JsonSpec,
  view: EChartsSpec,
): PassResult<EChartsSpec> {
  const output = view as unknown as JsonSpec;
  const timeField = string(take(spec, "time"), "time");
  const series = records(take(spec, "series"), "series");
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
