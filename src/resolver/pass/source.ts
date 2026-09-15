import type { DataSpec } from "../../DataSpec.js";
import { object, string, take } from "../../Spec.js";
import type {
  ResolveContext,
  ResolveResult,
  SourceResolver,
} from "../Resolver.js";
function sourceType(value: unknown, context: ResolveContext): string {
  if (typeof value === "string") {
    const pathname = new URL(value, context.baseURL).pathname;
    const match = /\.([a-z0-9]+)$/i.exec(pathname);
    if (!match) {
      throw new Error(`cannot determine source type: ${value}`);
    }
    return match[1].toLowerCase();
  }
  const source = object(value, "source");
  return string(source.type, "source.type");
}
export async function source(
  spec: DataSpec,
  data: ResolveResult[1],
  context: ResolveContext,
): Promise<ResolveResult> {
  const value = take(spec, "source");
  const type = sourceType(value, context);
  let resolver: SourceResolver;
  try {
    resolver = (await import(`../source/${type}/index.js`))
      .default as SourceResolver;
  } catch (error) {
    throw new Error(`source resolver unavailable: ${type}`, {
      cause: error,
    });
  }
  return [spec, await resolver(value, context)];
}
