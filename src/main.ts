import vegaEmbed from "vega-embed";
import { apply, finalize, normalize, type Pass, type Spec } from "./pass.js";
async function load(url: URL): Promise<Spec> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}: ${url}`);
  }
  const value: unknown = await response.json();
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Invalid JSON object: ${url}`);
  }
  return value as Spec;
}
const inputURL = new URL("./data/treasury.vl.json", location.href);
const viewURL = new URL("./view.json", location.href);
const input = await load(inputURL);
const view = await load(viewURL);
const passes: Pass[] = [normalize, finalize(view)];
const output = await apply(input, passes);
await vegaEmbed("#vis", output as Parameters<typeof vegaEmbed>[1], {
  actions: false,
  renderer: "svg",
  loader: {
    baseURL: new URL(".", inputURL).href,
  },
});
