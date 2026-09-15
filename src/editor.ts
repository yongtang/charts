import { basicSetup, EditorView } from "codemirror";
import { compile } from "./compile.js";
import { render } from "./render.js";
import { TextSpecToJsonSpec } from "./TextSpecToJsonSpec.js";
function element(id: string): HTMLElement {
  const value = document.getElementById(id);
  if (!value) {
    throw new Error(`Missing #${id}`);
  }
  return value;
}
const source = element("source");
const chart = element("vis");
const error = element("error");
const initial = [
  "source,data/treasury.csv",
  "---",
  "data",
  "2 yr",
  "5 yr",
  "10 yr",
  "30 yr",
].join("\n");
const baseURL = new URL(".", location.href);
let revision = 0;
let timer: number | undefined;
async function update(text: string, current: number): Promise<void> {
  try {
    const input = TextSpecToJsonSpec(text);
    const view = await compile(input, baseURL, "echarts");
    if (current !== revision) {
      return;
    }
    await render(chart, view);
    if (current === revision) {
      error.textContent = "";
    }
  } catch (cause) {
    if (current !== revision) {
      return;
    }
    error.textContent = cause instanceof Error ? cause.message : String(cause);
  }
}
function schedule(text: string): void {
  ++revision;
  if (timer !== undefined) {
    clearTimeout(timer);
  }
  const current = revision;
  timer = window.setTimeout(() => {
    void update(text, current);
  }, 300);
}
new EditorView({
  doc: initial,
  parent: source,
  extensions: [
    basicSetup,
    EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        schedule(update.state.doc.toString());
      }
    }),
  ],
});
await update(initial, ++revision);
