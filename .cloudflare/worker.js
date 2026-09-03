const ALLOWED = new Set(["api.stlouisfed.org", "cdn.cboe.com"]);

const CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Expose-Headers": "*",
};

export default {
    async fetch(request) {
        if (request.method === "OPTIONS") {
            return new Response(null, {
                headers: {
                    ...CORS,
                    "Access-Control-Allow-Methods":
                        request.headers.get("Access-Control-Request-Method") || "*",
                    "Access-Control-Allow-Headers":
                        request.headers.get("Access-Control-Request-Headers") || "*",
                },
            });
        }

        const target = request.headers.get("X-Proxy-URL");

        if (!target) {
            return new Response("Missing X-Proxy-URL", {
                status: 400,
                headers: CORS,
            });
        }

        let url;

        try {
            url = new URL(target);
        } catch {
            return new Response("Invalid X-Proxy-URL", {
                status: 400,
                headers: CORS,
            });
        }

        if (url.protocol !== "https:" || !ALLOWED.has(url.hostname)) {
            return new Response("Host not allowed", {
                status: 403,
                headers: CORS,
            });
        }

        const headers = new Headers(request.headers);
        headers.delete("X-Proxy-URL");
        headers.delete("Origin");
        headers.delete("Referer");

        const response = await fetch(url, {
            method: request.method,
            headers,
            body: request.method === "GET" || request.method === "HEAD" ? undefined : request.body,
            redirect: "follow",
        });

        const output = new Headers(response.headers);
        output.set("Access-Control-Allow-Origin", "*");
        output.set("Access-Control-Expose-Headers", "*");
        output.set("Cache-Control", "no-store");

        return new Response(response.body, {
            status: response.status,
            headers: output,
        });
    },
};
