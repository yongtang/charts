import { copyFile, mkdir, rm, writeFile } from "node:fs/promises";
type Row = Record<string, string>;
const columns = [
  "date",
  "1 mo",
  "1.5 mo",
  "2 mo",
  "3 mo",
  "4 mo",
  "6 mo",
  "1 yr",
  "2 yr",
  "3 yr",
  "5 yr",
  "7 yr",
  "10 yr",
  "20 yr",
  "30 yr",
];
function fields(line: string): string[] {
  const output: string[] = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < line.length; ++index) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        value += '"';
        ++index;
      } else {
        quoted = !quoted;
      }
    } else if (character === "," && !quoted) {
      output.push(value.trim());
      value = "";
    } else {
      value += character;
    }
  }
  output.push(value.trim());
  return output;
}
function date(value: string): string {
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value);
  if (!match) {
    throw new Error(`Invalid Treasury date: ${value}`);
  }
  return `${match[3]}-${match[1].padStart(2, "0")}-${match[2].padStart(2, "0")}`;
}
function parse(text: string): Row[] {
  const lines = text
    .replace(/^\uFEFF/, "")
    .trim()
    .split(/\r?\n/);
  const header = lines.shift();
  if (!header) {
    throw new Error("Empty Treasury CSV");
  }
  const names = fields(header).map((name) => name.toLowerCase());
  if (!names.includes("date") || !names.includes("10 yr")) {
    throw new Error(`Unexpected Treasury CSV: ${header}`);
  }
  return lines.filter(Boolean).map((line) => {
    const values = fields(line);
    const source: Row = {};
    names.forEach((name, index) => {
      source[name] = values[index] ?? "";
    });
    const row: Row = {};
    for (const column of columns) {
      const value = source[column] ?? "";
      row[column] = value.toUpperCase() === "N/A" ? "" : value;
    }
    row.date = date(source.date);
    return row;
  });
}
function annual(year: number): URL {
  const url = new URL(
    `https://home.treasury.gov/resource-center/data-chart-center/interest-rates/daily-treasury-rates.csv/${year}/all`,
  );
  url.searchParams.set("_format", "csv");
  url.searchParams.set("field_tdr_date_value", String(year));
  url.searchParams.set("page", "");
  url.searchParams.set("type", "daily_treasury_yield_curve");
  return url;
}
async function download(url: string | URL): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}: ${url}`);
  }
  return response.text();
}
const urls: (string | URL)[] = [
  "https://home.treasury.gov/resource-center/data-chart-center/interest-rates/daily-treasury-rate-archives/par-yield-curve-rates-1990-2023.csv",
];
for (let year = 2024; year <= new Date().getUTCFullYear(); ++year) {
  urls.push(annual(year));
}
const rows = new Map<string, Row>();
for (const text of await Promise.all(urls.map(download))) {
  for (const row of parse(text)) {
    rows.set(row.date, row);
  }
}
const output = [...rows.values()].sort((left, right) =>
  left.date.localeCompare(right.date),
);
if (!output.length) {
  throw new Error("No Treasury data");
}
await rm("_site", {
  recursive: true,
  force: true,
});
await mkdir("_site/data", {
  recursive: true,
});
await Promise.all([
  copyFile("index.html", "_site/index.html"),
  copyFile("view.json", "_site/view.json"),
  copyFile("data/treasury.vl.json", "_site/data/treasury.vl.json"),
  writeFile(
    "_site/data/treasury.csv",
    [
      columns.join(","),
      ...output.map((row) => columns.map((column) => row[column]).join(",")),
      "",
    ].join("\n"),
  ),
]);
console.log(
  `Treasury: ${output.length} rows, ${output[0].date} through ${output.at(-1)?.date}`,
);
