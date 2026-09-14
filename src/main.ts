import { compile } from "./compile.js";
import type { JsonSpec } from "./JsonSpec.js";
import { render } from "./render.js";
import { TextSpecToJsonSpec } from "./TextSpecToJsonSpec.js";
function JsonSpec(value: unknown, source: string): JsonSpec {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Invalid JSON object: ${source}`);
  }
  return value as JsonSpec;
}
async function load(url: URL): Promise<JsonSpec> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}: ${url}`);
  }
  const source = await response.text();
  const contentType = response.headers.get("content-type") ?? "";
  if (
    contentType.includes("application/json") ||
    url.pathname.endsWith(".json")
  ) {
    return JsonSpec(JSON.parse(source), url.href);
  }
  return TextSpecToJsonSpec(source);
}
const parameters = new URLSearchParams(location.search);
const url = parameters.get("url");
const spec = parameters.get("spec");
const text = parameters.get("text");
if ([url, spec, text].filter((value) => value !== null).length > 1) {
  throw new Error("Use only one of url, spec, or text");
}
if (url !== null || spec !== null || text !== null) {
  const inputURL = url === null ? null : new URL(url, location.href);
  const input =
    inputURL !== null
      ? await load(inputURL)
      : spec !== null
        ? JsonSpec(JSON.parse(spec), "spec")
        : TextSpecToJsonSpec(text!);
  const baseURL =
    inputURL === null ? new URL(".", location.href) : new URL(".", inputURL);
  const view = await compile(input, baseURL, "echarts");
  const element = document.getElementById("vis");
  if (!element) {
    throw new Error("Missing #vis");
  }
  await render(element, view);
}
