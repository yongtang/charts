import { copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { parse } from "csv-parse/sync";
type Row = Record<string, string>;
type Package = {
  dependencies: Record<string, string>;
};
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
function date(value: string): string {
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value);
  if (!match) {
    throw new Error(`Invalid Treasury date: ${value}`);
  }
  return `${match[3]}-${match[1].padStart(2, "0")}-${match[2].padStart(2, "0")}`;
}
function parseTreasury(text: string): Row[] {
  const rows = parse(text, {
    bom: true,
    columns: (header: string[]) =>
      header.map((name) => name.trim().toLowerCase()),
    skip_empty_lines: true,
    trim: true,
  }) as Row[];
  if (rows.length === 0) {
    throw new Error("Empty Treasury CSV");
  }
  const names = Object.keys(rows[0]);
  if (!names.includes("date") || !names.includes("10 yr")) {
    throw new Error(`Unexpected Treasury CSV: ${names.join(",")}`);
  }
  return rows.map((source) => {
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
const packageJson = JSON.parse(
  await readFile("package.json", "utf8"),
) as Package;
const index = (await readFile("index.html", "utf8"))
  .replaceAll("__CSV_PARSE_VERSION__", packageJson.dependencies["csv-parse"])
  .replaceAll(
    "__LIGHTWEIGHT_CHARTS_VERSION__",
    packageJson.dependencies["lightweight-charts"],
  );
const urls: (string | URL)[] = [
  "https://home.treasury.gov/resource-center/data-chart-center/interest-rates/daily-treasury-rate-archives/par-yield-curve-rates-1990-2023.csv",
];
for (let year = 2024; year <= new Date().getUTCFullYear(); ++year) {
  urls.push(annual(year));
}
const rows = new Map<string, Row>();
for (const text of await Promise.all(urls.map(download))) {
  for (const row of parseTreasury(text)) {
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
  writeFile("_site/index.html", index),
  copyFile("data/treasury.json", "_site/data/treasury.json"),
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
