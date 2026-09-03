const SERIES = [
    ["SOFR", "SOFR"],
    ["DFF", "Fed Funds"],
    ["DGS3MO", "3M"],
    ["DGS2", "2Y"],
    ["DGS5", "5Y"],
    ["DGS10", "10Y"],
    ["DGS30", "30Y"],
];

const MODULE_URL = new URL(import.meta.url);
const PROXY = MODULE_URL.searchParams.get("proxy");
const KEY =
    new URLSearchParams(MODULE_URL.hash.slice(1)).get("key") ??
    new URLSearchParams(location.hash.slice(1)).get("key");

function startDate(range) {
    if (range === "max") return null;

    const match = /^(\d+)([my])$/.exec(range);
    if (!match) throw new Error(`Invalid range: ${range}`);

    const date = new Date();
    const count = Number(match[1]);

    if (match[2] === "y") date.setUTCFullYear(date.getUTCFullYear() - count);
    else date.setUTCMonth(date.getUTCMonth() - count);

    return date.toISOString().slice(0, 10);
}

async function request(url, init = {}) {
    const target = new URL(url, MODULE_URL);

    if (!PROXY) {
        return fetch(target, {
            ...init,
            cache: "no-store",
        });
    }

    const headers = new Headers(init.headers);
    headers.set("X-Proxy-URL", target.href);

    return fetch(new URL(PROXY, MODULE_URL), {
        ...init,
        headers,
        cache: "no-store",
    });
}

async function load(id, name, key, start, end) {
    const url = new URL("https://api.stlouisfed.org/fred/series/observations");

    url.searchParams.set("series_id", id);
    url.searchParams.set("api_key", key);
    url.searchParams.set("file_type", "json");

    if (start) url.searchParams.set("observation_start", start);
    if (end) url.searchParams.set("observation_end", end);

    const response = await request(url);
    if (!response.ok) throw new Error(`${id}: ${response.status} ${await response.text()}`);

    const json = await response.json();

    return json.observations
        .filter((x) => x.value !== ".")
        .map((x) => ({
            date: x.date,
            series: name,
            value: Number(x.value),
        }));
}

export default async function () {
    if (!KEY) throw new Error("FRED API key is required");

    const start =
        MODULE_URL.searchParams.get("start") ??
        startDate(MODULE_URL.searchParams.get("range") ?? "5y");
    const end = MODULE_URL.searchParams.get("end");
    const requested = MODULE_URL.searchParams.get("series")?.split(",");
    const series = requested ? SERIES.filter(([id]) => requested.includes(id)) : SERIES;

    if (!series.length) throw new Error("No matching series");

    const values = (
        await Promise.all(series.map(([id, name]) => load(id, name, KEY, start, end)))
    ).flat();

    return {
        title: {
            text: "US Rates",
            subtitle:
                "This product uses the FRED® API but is not endorsed or certified by the Federal Reserve Bank of St. Louis.",
        },
        width: MODULE_URL.searchParams.has("width")
            ? Number(MODULE_URL.searchParams.get("width"))
            : "container",
        height: 420,
        data: {
            values,
        },
        params: [
            {
                name: "selected",
                select: {
                    type: "point",
                    fields: ["series"],
                    toggle: "true",
                },
                bind: "legend",
            },
        ],
        mark: "line",
        encoding: {
            x: {
                field: "date",
                type: "temporal",
                title: null,
            },
            y: {
                field: "value",
                type: "quantitative",
                title: "Rate (%)",
                scale: {
                    zero: false,
                },
            },
            color: {
                field: "series",
                type: "nominal",
                title: null,
                sort: series.map(([, name]) => name),
                legend: {
                    orient: "bottom",
                },
            },
            opacity: {
                condition: {
                    param: "selected",
                    value: 1,
                },
                value: 0.08,
            },
            tooltip: [
                {
                    field: "date",
                    type: "temporal",
                    title: "Date",
                },
                {
                    field: "series",
                    type: "nominal",
                    title: "Series",
                },
                {
                    field: "value",
                    type: "quantitative",
                    title: "Rate",
                    format: ".3f",
                },
            ],
        },
    };
}
