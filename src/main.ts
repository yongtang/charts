import vegaEmbed from "vega-embed";
import { apply, finalize, normalize, type Pass, type Spec } from "./pass.js";
function validate(value: unknown, source: string): Spec {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Invalid JSON object: ${source}`);
  }
  return value as Spec;
}
async function load(url: URL): Promise<Spec> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}: ${url}`);
  }
  return validate(await response.json(), url.href);
}
const parameters = new URLSearchParams(location.search);
const url = parameters.get("url");
const spec = parameters.get("spec");
if (url !== null && spec !== null) {
  throw new Error("Use either url or spec, not both");
}
if (url !== null || spec !== null) {
  const inputURL = url === null ? null : new URL(url, location.href);
  const input =
    inputURL === null
      ? validate(JSON.parse(spec!), "spec")
      : await load(inputURL);
  const view = await load(new URL("./view.json", location.href));
  const passes: Pass[] = [normalize, finalize(view)];
  const output = await apply(input, passes);
  await vegaEmbed("#vis", output as Parameters<typeof vegaEmbed>[1], {
    loader: {
      baseURL:
        inputURL === null
          ? new URL(".", location.href).href
          : new URL(".", inputURL).href,
    },
  });
}
