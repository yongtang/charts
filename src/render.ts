import type { ViewSpec } from "./ViewSpec.js";
type Renderer = (element: HTMLElement, spec: unknown) => unknown;
export async function render(
  element: HTMLElement,
  view: ViewSpec,
): Promise<unknown> {
  let renderer: Renderer;
  try {
    renderer = (await import(`./render/${view.backend}/index.js`))
      .default as Renderer;
  } catch (error) {
    throw new Error(`renderer unavailable: ${view.backend}`, {
      cause: error,
    });
  }
  return renderer(element, view.spec);
}
