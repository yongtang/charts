import { expect, test, type Page, type Route } from "@playwright/test";

const OBSERVATIONS = JSON.stringify({
    observations: [
        {
            date: "2026-09-01",
            value: "4.25",
        },
    ],
});

async function stubVega(page: Page) {
    await page.route("https://cdn.jsdelivr.net/npm/**", async (route) => {
        const url = route.request().url();

        const body = url.includes("/vega-embed@")
            ? `
                globalThis.vegaEmbed = async function(element, spec, options) {
                    const target =
                        typeof element === "string"
                            ? document.querySelector(element)
                            : element;

                    target.dataset.rendered = "true";
                    target.dataset.spec = JSON.stringify(spec);
                    target.dataset.actions = String(options.actions);
                    return {};
                };
            `
            : "";

        await route.fulfill({
            status: 200,
            contentType: "application/javascript",
            body,
        });
    });
}

async function fulfillJson(route: Route, value: unknown) {
    await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: {
            "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify(value),
    });
}

test("renders Vega-Lite JSON", async ({ page }) => {
    await stubVega(page);

    const url = "https://charts.test/chart.json";
    const spec = {
        title: "Chart",
        data: {
            values: [
                {
                    x: 1,
                    y: 2,
                },
            ],
        },
        mark: "line",
        encoding: {
            x: {
                field: "x",
                type: "quantitative",
            },
            y: {
                field: "y",
                type: "quantitative",
            },
        },
    };

    await page.route(url, (route) => fulfillJson(route, spec));

    await page.goto(`/?url=${encodeURIComponent(url)}`);

    const chart = page.locator("#chart");

    await expect(chart).toHaveAttribute("data-rendered", "true");
    await expect(chart).toHaveAttribute("data-actions", "false");

    const rendered = await chart.getAttribute("data-spec");

    expect(rendered).not.toBeNull();
    expect(JSON.parse(rendered!)).toEqual(spec);
});

test("resolves one-level refs from JSON or JS across domains", async ({ page }) => {
    await stubVega(page);

    const overviewUrl = "https://overview.test/market.json";
    const ratesUrl = "https://rates.test/rates.json";
    const vixUrl = "https://volatility.test/vix.js?name=VIX";

    const rates = {
        title: "Rates",
        data: {
            values: [
                {
                    x: 1,
                    y: 4.25,
                },
            ],
        },
        mark: "line",
        encoding: {
            x: {
                field: "x",
                type: "quantitative",
            },
            y: {
                field: "y",
                type: "quantitative",
            },
        },
    };

    const vix = {
        title: "VIX",
        data: {
            values: [
                {
                    x: 1,
                    y: 20,
                },
            ],
        },
        mark: "line",
        encoding: {
            x: {
                field: "x",
                type: "quantitative",
            },
            y: {
                field: "y",
                type: "quantitative",
            },
        },
    };

    await page.route(overviewUrl, (route) =>
        fulfillJson(route, {
            $schema: "https://vega.github.io/schema/vega-lite/v6.json",
            title: "Market Overview",
            concat: [
                {
                    $ref: ratesUrl,
                },
                {
                    $ref: vixUrl,
                },
            ],
            columns: 2,
        }),
    );

    await page.route(ratesUrl, (route) => fulfillJson(route, rates));

    await page.route(vixUrl, async (route) => {
        await route.fulfill({
            status: 200,
            contentType: "application/javascript",
            headers: {
                "Access-Control-Allow-Origin": "*",
            },
            body: `
                export default function() {
                    const url = new URL(import.meta.url);

                    return {
                        title: url.searchParams.get("name"),
                        data: {
                            values: [
                                {
                                    x: 1,
                                    y: 20,
                                },
                            ],
                        },
                        mark: "line",
                        encoding: {
                            x: {
                                field: "x",
                                type: "quantitative",
                            },
                            y: {
                                field: "y",
                                type: "quantitative",
                            },
                        },
                    };
                }
            `,
        });
    });

    await page.goto(`/?url=${encodeURIComponent(overviewUrl)}`);

    const chart = page.locator("#chart");

    await expect(chart).toHaveAttribute("data-rendered", "true");

    const rendered = await chart.getAttribute("data-spec");

    expect(rendered).not.toBeNull();
    expect(JSON.parse(rendered!)).toEqual({
        $schema: "https://vega.github.io/schema/vega-lite/v6.json",
        title: "Market Overview",
        concat: [rates, vix],
        columns: 2,
    });
});

test("rate module owns its configuration", async ({ page }) => {
    await stubVega(page);

    let target: URL | null = null;

    await page.route("https://proxy.test/**", async (route) => {
        const value = route.request().headers()["x-proxy-url"];

        if (!value) throw new Error("Missing X-Proxy-URL");

        target = new URL(value);

        await route.fulfill({
            status: 200,
            contentType: "application/json",
            headers: {
                "Access-Control-Allow-Origin": "*",
            },
            body: OBSERVATIONS,
        });
    });

    const source =
        "./rate.js?series=DGS2&start=2026-09-01&end=2026-09-01&width=320&proxy=" +
        encodeURIComponent("https://proxy.test/");

    await page.goto(`/?url=${encodeURIComponent(source)}#key=KEY`);

    const chart = page.locator("#chart");

    await expect(chart).toHaveAttribute("data-rendered", "true");
    await expect.poll(() => target).not.toBeNull();

    expect(target!.searchParams.get("series_id")).toBe("DGS2");
    expect(target!.searchParams.get("api_key")).toBe("KEY");
    expect(target!.searchParams.get("observation_start")).toBe("2026-09-01");
    expect(target!.searchParams.get("observation_end")).toBe("2026-09-01");

    const rendered = await chart.getAttribute("data-spec");

    expect(rendered).not.toBeNull();

    const spec = JSON.parse(rendered!);

    expect(spec.width).toBe(320);
    expect(spec.data.values).toEqual([
        {
            date: "2026-09-01",
            series: "2Y",
            value: 4.25,
        },
    ]);
    expect(spec.encoding.color.legend).toEqual({
        orient: "bottom",
    });
    expect(spec).not.toHaveProperty("$schema");
    expect(spec).not.toHaveProperty("config");
});

test("requires url", async ({ page }) => {
    await stubVega(page);

    await page.goto("/");

    await expect(page.locator("body")).toContainText("Missing url");
});
