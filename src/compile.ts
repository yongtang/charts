import type { CompiledSpec } from "./CompiledSpec.js";
import type { Compiler } from "./compiler/Compiler.js";
import { backend } from "./compiler/pass/backend.js";
import { data } from "./compiler/pass/data.js";
import type { JsonSpec } from "./JsonSpec.js";
import { assertEmpty } from "./Spec.js";
export async function compile(
  input: JsonSpec,
  defaultBackend: string,
): Promise<CompiledSpec> {
  const [name, backendSpec] = backend(input, defaultBackend);
  const [initialSpec, dataSpec] = data(backendSpec);
  let spec = initialSpec;
  let compiler: Compiler<unknown>;
  try {
    compiler = (await import(`./compiler/${name}/index.js`))
      .default as Compiler<unknown>;
  } catch (error) {
    throw new Error(`compiler unavailable: ${name}`, {
      cause: error,
    });
  }
  let view = compiler.create();
  for (const pass of compiler.passes) {
    [spec, view] = await pass(spec, view);
  }
  assertEmpty(spec, "spec");
  return {
    view: {
      backend: name,
      spec: view,
    },
    data: dataSpec,
  };
}
