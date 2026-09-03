import { expect, test, type Page, type Route } from "@playwright/test";

type Seen = {
    proxy: string | null;
    target: string;
};

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
                    globalThis.vegaEmbed = async function(element, spec) {
                        element.dataset.rendered = "true";
                        element.dataset.title =
                            typeof spec.title === "string"
                                ? spec.title
                                : spec.title?.text || "";
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

async function fulfillApi(route: Route) {
    await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: {
            "Access-Control-Allow-Origin": "*",
        },
        body: OBSERVATIONS,
    });
}

async function fulfillProxy(route: Route, proxy: string, seen: Seen[]) {
    const request = route.request();

    if (request.method() === "OPTIONS") {
        await route.fulfill({
            status: 204,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "*",
                "Access-Control-Allow-Headers": "*",
            },
        });

        return;
    }

    const target = request.headers()["x-proxy-url"];

    if (!target) throw new Error("Missing X-Proxy-URL");

    seen.push({
        proxy,
        target,
    });

    await fulfillApi(route);
}

test("source, proxy, and key stay positionally aligned", async ({ page }) => {
    const seen: Seen[] = [];

    await stubVega(page);

    await page.route("https://proxy-a.test/**", (route) => fulfillProxy(route, "a", seen));

    await page.route("https://proxy-c.test/**", (route) => fulfillProxy(route, "c", seen));

    await page.route("https://api.stlouisfed.org/**", async (route) => {
        seen.push({
            proxy: null,
            target: route.request().url(),
        });

        await fulfillApi(route);
    });

    const query = new URLSearchParams();

    query.append("source", "./rate.js?series=DGS2&start=2026-09-01&end=2026-09-01");
    query.append("proxy", "https://proxy-a.test/");

    query.append("source", "./rate.js?series=DGS5&start=2026-09-01&end=2026-09-01");
    query.append("proxy", "");

    query.append("source", "./rate.js?series=DGS10&start=2026-09-01&end=2026-09-01");
    query.append("proxy", "https://proxy-c.test/");

    const fragment = new URLSearchParams();

    fragment.append("key", "KEY_A");
    fragment.append("key", "KEY_B");
    fragment.append("key", "KEY_C");

    await page.goto(`/?${query}#${fragment}`);

    await expect(page.locator(".chart[data-rendered=true]")).toHaveCount(3);

    await expect.poll(() => seen.length).toBe(3);

    const requests = Object.fromEntries(
        seen.map((item) => {
            const url = new URL(item.target);

            return [
                url.searchParams.get("series_id"),
                {
                    proxy: item.proxy,
                    key: url.searchParams.get("api_key"),
                },
            ];
        }),
    );

    expect(requests.DGS2).toEqual({
        proxy: "a",
        key: "KEY_A",
    });

    expect(requests.DGS5).toEqual({
        proxy: null,
        key: "KEY_B",
    });

    expect(requests.DGS10).toEqual({
        proxy: "c",
        key: "KEY_C",
    });

    expect(
        await page.pageErrors({
            filter: "since-navigation",
        }),
    ).toEqual([]);

    expect(
        (
            await page.consoleMessages({
                filter: "since-navigation",
            })
        )
            .filter((message) => message.type() === "error")
            .map((message) => message.text()),
    ).toEqual([]);
});

test("requires positional proxy entries", async ({ page }) => {
    await stubVega(page);

    const query = new URLSearchParams();

    query.append("source", "./rate.js?series=DGS10");

    const fragment = new URLSearchParams();

    fragment.append("key", "KEY");

    await page.goto(`/?${query}#${fragment}`);

    await expect(page.locator("body")).toContainText("source and proxy counts differ");
});

test("requires positional key entries", async ({ page }) => {
    await stubVega(page);

    const query = new URLSearchParams();

    query.append("source", "./rate.js?series=DGS10");
    query.append("proxy", "");

    await page.goto(`/?${query}`);

    await expect(page.locator("body")).toContainText("source and key counts differ");
});
