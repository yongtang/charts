import type { Compiler } from "./compiler/Compiler.js";
import { backend } from "./compiler/pass/backend.js";
import { assertEmpty } from "./compiler/Spec.js";
import type { JsonSpec } from "./JsonSpec.js";
import type { ViewSpec } from "./ViewSpec.js";
export async function compile(
  input: JsonSpec,
  baseURL: URL,
  defaultBackend: string,
): Promise<ViewSpec> {
  const [name, inputSpec] = backend(input, defaultBackend);
  let compiler: Compiler<unknown>;
  try {
    compiler = (await import(`./compiler/${name}/index.js`))
      .default as Compiler<unknown>;
  } catch (error) {
    throw new Error(`compiler unavailable: ${name}`, {
      cause: error,
    });
  }
  let spec = inputSpec;
  let view = compiler.create();
  const context = {
    baseURL,
  };
  for (const pass of compiler.passes) {
    [spec, view] = await pass(spec, view, context);
  }
  assertEmpty(spec, "spec");
  return {
    backend: name,
    spec: view,
  };
}
