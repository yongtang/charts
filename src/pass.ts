export type Spec = Record<string, unknown>;
export type Pass = (spec: Spec) => Spec | Promise<Spec>;
const viewFields = [
  "$schema",
  "config",
  "background",
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
function isSpec(value: unknown): value is Spec {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function merge(defaults: Spec, overrides: Spec): Spec {
  const output = structuredClone(defaults);
  for (const [field, value] of Object.entries(overrides)) {
    const current = output[field];
    output[field] =
      isSpec(current) && isSpec(value)
        ? merge(current, value)
        : structuredClone(value);
  }
  return output;
}
export async function apply(spec: Spec, passes: Pass[]): Promise<Spec> {
  for (const pass of passes) {
    spec = await pass(spec);
  }
  return spec;
}
export function normalize(input: Spec): Spec {
  const output = structuredClone(input);
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
    const view: Spec = {};
    for (const field of viewFields) {
      if (field in output) {
        view[field] = output[field];
        delete output[field];
      }
    }
    return {
      ...view,
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
    for (const field of compositionFields) {
      if (field in chart) {
        throw new Error(`concat[${index}].${field} is not supported`);
      }
    }
    return chart;
  });
  return output;
}
export function finalize(view: Spec): Pass {
  return (input) => merge(view, input);
}
