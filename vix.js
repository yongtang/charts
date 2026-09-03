const SERIES = [
    ["VIX9D", "9D"],
    ["VIX", "30D"],
    ["VIX3M", "3M"],
    ["VIX6M", "6M"],
    ["VIX1Y", "1Y"],
];

const MODULE_URL = new URL(import.meta.url);
const PROXY = MODULE_URL.searchParams.get("proxy");

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

function parseDate(value) {
    const [month, day, year] = value.split("/");
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

async function load(id, name, start, end) {
    const url = new URL(
        `https://cdn.cboe.com/api/global/us_indices/daily_prices/${id}_History.csv`,
    );
    const response = await request(url);
    if (!response.ok) throw new Error(`${id}: ${response.status} ${await response.text()}`);

    const lines = (await response.text()).trim().split(/\r?\n/);
    const header = lines.shift().split(",");
    const dateIndex = header.indexOf("DATE");
    const valueIndex = header.indexOf("CLOSE");

    return lines
        .map((line) => {
            const fields = line.split(",");
            return {
                date: parseDate(fields[dateIndex]),
                series: name,
                value: Number(fields[valueIndex]),
            };
        })
        .filter((x) => (!start || x.date >= start) && (!end || x.date <= end));
}

export default async function () {
    const start =
        MODULE_URL.searchParams.get("start") ??
        startDate(MODULE_URL.searchParams.get("range") ?? "5y");
    const end = MODULE_URL.searchParams.get("end");
    const requested = MODULE_URL.searchParams.get("series")?.split(",");
    const series = requested ? SERIES.filter(([id]) => requested.includes(id)) : SERIES;

    if (!series.length) throw new Error("No matching series");

    const values = (
        await Promise.all(series.map(([id, name]) => load(id, name, start, end)))
    ).flat();

    return {
        title: {
            text: "VIX Term Structure",
            subtitle: "Source: Cboe Global Markets",
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
                title: "VIX",
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
                    title: "Tenor",
                },
                {
                    field: "value",
                    type: "quantitative",
                    title: "VIX",
                    format: ".2f",
                },
            ],
        },
    };
}
