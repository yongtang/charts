import vegaEmbed from "vega-embed";
import { apply, finalize, normalize, type Pass, type Spec } from "./pass.js";
function spec(value: unknown): Spec {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Invalid Vega-Lite spec");
  }
  return value as Spec;
}
async function load(url: URL): Promise<Spec> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}: ${url}`);
  }
  return spec(await response.json());
}
const params = new URLSearchParams(location.search);
const url = params.get("url");
const text = params.get("spec");
if (url !== null && text !== null) {
  throw new Error("Use either url or spec");
}
if (url !== null || text !== null) {
  const inputURL = url === null ? null : new URL(url, location.href);
  const input =
    inputURL === null ? spec(JSON.parse(text!)) : await load(inputURL);
  const view = await load(new URL("./view.json", location.href));
  const passes: Pass[] = [normalize, finalize(view)];
  const output = await apply(input, passes);
  await vegaEmbed("#vis", output as Parameters<typeof vegaEmbed>[1], {
    actions: false,
    renderer: "svg",
    loader: {
      baseURL:
        inputURL === null
          ? new URL(".", location.href).href
          : new URL(".", inputURL).href,
    },
  });
}
