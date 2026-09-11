export type Spec = Record<string, unknown>;
export type Pass = (spec: Spec) => Spec | Promise<Spec>;
const viewFields = [
  "$schema",
  "config",
  "background",
  "width",
  "height",
  "padding",
  "autosize",
  "spacing",
  "columns",
];
const compositionFields = [
  "concat",
  "hconcat",
  "vconcat",
  "layer",
  "facet",
  "repeat",
  "spec",
];
function clean(spec: Spec): Spec {
  const output = structuredClone(spec);
  for (const field of viewFields) {
    delete output[field];
  }
  return output;
}
function isSpec(value: unknown): value is Spec {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
export async function apply(spec: Spec, passes: Pass[]): Promise<Spec> {
  for (const pass of passes) {
    spec = await pass(spec);
  }
  return spec;
}
export function normalize(input: Spec): Spec {
  const output = clean(input);
  for (const field of [
    "hconcat",
    "vconcat",
    "layer",
    "facet",
    "repeat",
    "spec",
  ]) {
    if (field in output) {
      throw new Error(`${field} is not supported`);
    }
  }
  if (!("concat" in output)) {
    return {
      concat: [output],
    };
  }
  if (!Array.isArray(output.concat) || output.concat.length === 0) {
    throw new Error("concat must contain at least one chart");
  }
  output.concat = output.concat.map((chart, index) => {
    if (!isSpec(chart)) {
      throw new Error(`concat[${index}] must be a chart`);
    }
    const unit = clean(chart);
    for (const field of compositionFields) {
      if (field in unit) {
        throw new Error(`concat[${index}].${field} is not supported`);
      }
    }
    return unit;
  });
  return output;
}
export function finalize(view: Spec): Pass {
  return (input) => ({
    ...structuredClone(input),
    ...structuredClone(view),
    $schema: "https://vega.github.io/schema/vega-lite/v6.json",
  });
}
