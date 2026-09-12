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
async function main(): Promise<void> {
  const parameters = new URLSearchParams(location.search);
  const url = parameters.get("url");
  const spec = parameters.get("spec");
  if (url !== null && spec !== null) {
    throw new Error("Use either url or spec, not both");
  }
  if (url === null && spec === null) {
    return;
  }
  let input: Spec;
  let baseURL: string;
  if (url !== null) {
    const inputURL = new URL(url, location.href);
    input = await load(inputURL);
    baseURL = new URL(".", inputURL).href;
  } else {
    input = validate(JSON.parse(spec!), "spec");
    baseURL = new URL(".", location.href).href;
  }
  const view = await load(new URL("./view.json", location.href));
  const background =
    typeof view.background === "string" ? view.background : "#000000";
  document.documentElement.style.background = background;
  document.body.style.margin = "0";
  document.body.style.background = background;
  const passes: Pass[] = [normalize, finalize(view)];
  const output = await apply(input, passes);
  await vegaEmbed("#vis", output as Parameters<typeof vegaEmbed>[1], {
    actions: false,
    renderer: "svg",
    loader: {
      baseURL,
    },
  });
}
await main();
