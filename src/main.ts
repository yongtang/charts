import vegaEmbed from "vega-embed";
const url = new URL("./data/treasury.vl.json", location.href);
const response = await fetch(url);
if (!response.ok) {
  throw new Error(`${response.status} ${response.statusText}: ${url}`);
}
const spec = await response.json();
await vegaEmbed("#vis", spec, {
  actions: false,
  renderer: "svg",
  loader: {
    baseURL: new URL(".", url).href,
  },
});
