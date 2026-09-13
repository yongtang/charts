import { parse } from "csv-parse/sync";
import type { JsonSpec } from "./JsonSpec.js";
import type { TextSpec } from "./TextSpec.js";
function rows(source: string): string[][] {
  return parse(source, {
    bom: true,
    skip_empty_lines: true,
    trim: true,
  }) as string[][];
}
export function TextSpecToJsonSpec(input: TextSpec): JsonSpec {
  const lines = input
    .replace(/^\uFEFF/, "")
    .replace(/\r\n?/g, "\n")
    .split("\n");
  const separator = lines.findIndex((line) => line.trim() === "---");
  if (separator < 0) {
    throw new Error("TextSpec requires ---");
  }
  const metadata = rows(lines.slice(0, separator).join("\n"));
  const table = rows(lines.slice(separator + 1).join("\n"));
  const spec: JsonSpec = {};
  for (const [index, row] of metadata.entries()) {
    if (row.length !== 2) {
      throw new Error(`metadata row ${index + 1} must contain 2 fields`);
    }
    const [field, value] = row;
    if (!field) {
      throw new Error(`metadata row ${index + 1} has an empty field`);
    }
    if (Object.hasOwn(spec, field)) {
      throw new Error(`duplicate field: ${field}`);
    }
    spec[field] = value;
  }
  if (table.length === 0) {
    throw new Error("TextSpec requires a series table");
  }
  const [header, ...data] = table;
  if (header.some((field) => !field)) {
    throw new Error("series header contains an empty field");
  }
  if (new Set(header).size !== header.length) {
    throw new Error("series header contains duplicate fields");
  }
  spec.series = data.map((row, index) => {
    if (row.length !== header.length) {
      throw new Error(
        `series row ${index + 1} contains ${row.length} fields; expected ${header.length}`,
      );
    }
    const item: JsonSpec = {};
    header.forEach((field, column) => {
      if (row[column] !== "") {
        item[field] = row[column];
      }
    });
    return item;
  });
  return spec;
}
