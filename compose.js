async function load(value, base) {
    const url = new URL(value, base);

    if (url.pathname.endsWith(".json")) {
        const response = await fetch(url, { cache: "no-store" });
        if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${url}`);
        return response.json();
    }

    const module = await import(url.href);
    return typeof module.default === "function" ? module.default() : module.default;
}

function page(source, base) {
    const target = new URL(source, base);
    const page = new URL(location.href);
    const theme = page.searchParams.get("theme");

    page.search = "";
    page.searchParams.set("url", target.href);

    if (theme) page.searchParams.set("theme", theme);

    return page.href;
}

function link(spec, href) {
    if (spec.mark) {
        spec.mark =
            typeof spec.mark === "string"
                ? {
                      type: spec.mark,
                      cursor: "pointer",
                  }
                : {
                      ...spec.mark,
                      cursor: "pointer",
                  };

        spec.encoding = {
            ...spec.encoding,
            href: {
                value: href,
            },
        };
    }

    for (const key of ["layer", "concat", "hconcat", "vconcat"]) {
        if (spec[key]) spec[key] = spec[key].map((view) => link(view, href));
    }

    if (spec.spec) spec.spec = link(spec.spec, href);

    return spec;
}

export default async function () {
    const url = new URL(import.meta.url);
    const type = url.searchParams.get("compose") ?? "concat";
    const sources = url.searchParams.getAll("url");
    const param = JSON.parse(url.searchParams.get("param") ?? "{}");

    if (!["concat", "hconcat", "vconcat", "layer"].includes(type))
        throw new Error(`Invalid compose parameter: ${type}`);

    if (!sources.length) throw new Error("Missing required url parameter");

    const charts = await Promise.all(
        sources.map(async (source) => link(await load(source, url), page(source, url))),
    );

    const spec = {
        ...param,
        [type]: charts,
    };

    if (type !== "layer") {
        spec.resolve = {
            ...param.resolve,
            scale: {
                color: "independent",
                ...param.resolve?.scale,
            },
            legend: {
                color: "independent",
                ...param.resolve?.legend,
            },
        };
    }

    return spec;
}
