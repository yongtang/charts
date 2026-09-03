PLAYWRIGHT_VERSION := $(shell awk -F'"' '/"@playwright\/test"/ { print $$4; exit }' package.json)
IMAGE := mcr.microsoft.com/playwright:v$(PLAYWRIGHT_VERSION)-noble

.PHONY: apply verify url

apply:
	docker run --rm \
		--user "$$(id -u):$$(id -g)" \
		-e HOME=/tmp \
		-v "$$PWD:/work" \
		-w /work \
		$(IMAGE) \
		bash -lc 'npm install --ignore-scripts --cache /tmp/npm && npm run apply'

verify:
	docker run --rm \
		--ipc=host \
		-e CI=1 \
		-v "$$PWD:/src:ro" \
		$(IMAGE) \
		bash -lc 'cp -a /src /work && cd /work && npm ci && npm run verify'

url:
	@test -n "$(PAGE_URL)" || (echo "PAGE_URL is required"; exit 1)
	@test -n "$(PROXY_URL)" || (echo "PROXY_URL is required"; exit 1)
	@test -n "$(FRED_KEY)" || (echo "FRED_KEY is required"; exit 1)
	@docker run --rm \
		-e PAGE_URL="$(PAGE_URL)" \
		-e PROXY_URL="$(PROXY_URL)" \
		-e FRED_KEY="$(FRED_KEY)" \
		$(IMAGE) \
		node -e 'const page = new URL(process.env.PAGE_URL); const chart = new URL("./rate.js", page); chart.searchParams.set("range", "5y"); chart.searchParams.set("proxy", process.env.PROXY_URL); page.searchParams.set("url", chart.href); page.hash = new URLSearchParams([["key", process.env.FRED_KEY]]); console.log(page.href)'
